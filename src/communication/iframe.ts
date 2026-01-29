import type { Message } from "../types";
import { BaseCommunicator } from "./base";
import { ALLOWED_ORIGINS } from "../constants";

/**
 * 检测当前页面是否运行在 iframe 中
 */
export function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // 如果访问 window.top 抛出错误，说明在跨域 iframe 中
    return true;
  }
}

export class IframeCommunicator extends BaseCommunicator {
  private readonly allowedOrigins: string[] = ALLOWED_ORIGINS;
  private isConnected = false;
  private parentOrigin: string | null;
  private isOriginDiscovered = false;

  constructor() {
    super();
    
    // 尝试从 document.referrer 获取 parent origin
    this.parentOrigin = this.getParentOriginFromReferrer();
    
    // 如果成功获取到 origin，立即验证
    if (this.parentOrigin) {
      this.validateParentOrigin(this.parentOrigin);
      this.isOriginDiscovered = true;
    } else {
      // 无法从 referrer 获取，将在握手时动态发现
      console.warn(
        "[IframeCommunicator] Cannot determine parent origin from document.referrer. " +
        "Will discover origin during handshake from first message."
      );
    }
  }

  /**
   * 从 document.referrer 获取父窗口的 origin
   * 注意：在严格的 Referrer Policy 下，document.referrer 可能为空
   */
  private getParentOriginFromReferrer(): string | null {
    try {
      if (document.referrer) {
        return new URL(document.referrer).origin;
      }
    } catch (error) {
      console.error("[IframeCommunicator] Failed to parse document.referrer:", error);
    }
    return null;
  }

  /**
   * 验证 parent origin 是否在允许列表中
   */
  private validateParentOrigin(origin: string): void {
    if (!this.allowedOrigins.includes(origin)) {
      throw new Error(
        `[IframeCommunicator] Security Error: Untrusted parent origin "${origin}". ` +
        `Allowed origins: ${this.allowedOrigins.join(", ")}`
      );
    }
  }

  /**
   * 发送消息给父窗口（使用缓存的 origin）
   */
  public postMessage(message: Message): void {
    if (!this.parentOrigin) {
      throw new Error(
        "[IframeCommunicator] Cannot send message: parent origin not yet discovered. " +
        "Please wait for connection to be established."
      );
    }
    window.parent.postMessage(message, this.parentOrigin);
  }

  /**
   * 验证消息来源 origin 是否在允许列表中
   * 如果 origin 尚未确定（referrer 为空的情况），会通过握手动态发现
   */
  protected isValidOrigin(origin: string): boolean {
    // 如果已经发现了 origin，直接验证是否匹配
    if (this.isOriginDiscovered) {
      return origin === this.parentOrigin;
    }

    // 握手发现：检查 origin 是否在允许列表中
    if (this.allowedOrigins.includes(origin)) {
      // 动态发现并缓存 parent origin
      this.parentOrigin = origin;
      this.isOriginDiscovered = true;
      console.log(`[IframeCommunicator] Discovered parent origin via handshake: ${origin}`);
      return true;
    }

    // origin 不在白名单中，拒绝
    return false;
  }

  /**
   * 验证消息来源窗口是否是父窗口
   * 防止同源攻击和 iframe 中间人攻击
   */
  protected isValidSource(source: MessageEventSource | null): boolean {
    // 只接受来自直接父窗口的消息
    // 这防止了：
    // 1. 同源的兄弟 iframe 发送伪造消息
    // 2. 多层嵌套中的中间 iframe 发送伪造消息
    // 3. 同源的其他窗口发送伪造消息
    return source === window.parent;
  }

  /**
   * 建立连接（发送握手消息）
   * 如果 origin 尚未确定（referrer 为空），会等待父窗口的第一条消息来发现 origin
   */
  public async connect(): Promise<void> {
    if (this.isConnected) return;

    // 如果已经知道 parent origin，直接发送握手消息
    if (this.parentOrigin) {
      this.postMessage({ event: "IframeLoaded" } as Message);
      this.isConnected = true;
      return;
    }

    // 握手发现：等待父窗口的第一条消息来发现 origin
    console.log("[IframeCommunicator] Waiting for parent window handshake...");
    
    // 等待任意来自父窗口的消息（isValidOrigin 会自动发现并缓存 origin）
    await this.onMessage(() => true);
    
    // 发现 origin 后，发送握手响应
    if (this.parentOrigin) {
      this.postMessage({ event: "IframeLoaded" } as Message);
      this.isConnected = true;
      console.log("[IframeCommunicator] Handshake completed");
    } else {
      throw new Error("[IframeCommunicator] Failed to discover parent origin during handshake");
    }
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    // 只有在已建立连接且知道 parent origin 时才发送断开消息
    if (this.parentOrigin && this.isConnected) {
      try {
        this.postMessage({ event: "IframeUnload" } as Message);
      } catch (error) {
        console.error("[IframeCommunicator] Failed to send disconnect message:", error);
      }
    }
    this.clearAllListeners("Connection closed");
    this.isConnected = false;
  }
}
