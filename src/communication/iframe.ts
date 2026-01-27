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
  private readonly parentOrigin: string | null;

  constructor() {
    super();
    // 在构造时获取并缓存父窗口 origin
    this.parentOrigin = this.getParentOrigin();
    
    // 立即验证环境安全性
    this.validateEnvironment();
  }

  /**
   * 获取父窗口的 origin（仅在构造时调用一次）
   */
  private getParentOrigin(): string | null {
    try {
      // 使用 document.referrer 获取父窗口 origin
      if (document.referrer) {
        return new URL(document.referrer).origin;
      }
      return null;
    } catch (error) {
      console.error("[IframeCommunicator] Failed to parse parent origin:", error);
      return null;
    }
  }

  /**
   * 验证运行环境是否安全
   */
  private validateEnvironment(): void {
    if (!this.parentOrigin) {
      throw new Error(
        "[IframeCommunicator] Security Error: Cannot determine parent window origin. " +
        "This provider should only be used when embedded in a trusted parent window."
      );
    }
    
    if (!this.isValidOrigin(this.parentOrigin)) {
      throw new Error(
        `[IframeCommunicator] Security Error: Untrusted parent origin "${this.parentOrigin}". ` +
        `Allowed origins: ${this.allowedOrigins.join(", ")}`
      );
    }
  }

  /**
   * 发送消息给父窗口（使用缓存的 origin）
   */
  public postMessage(message: Message): void {
    // parentOrigin 已在构造函数中验证，这里直接使用
    // 使用非空断言是安全的，因为构造函数中会抛出错误
    window.parent.postMessage(message, this.parentOrigin!);
  }

  /**
   * 验证消息来源 origin 是否在允许列表中
   */
  protected isValidOrigin(origin: string): boolean {
    return this.allowedOrigins.includes(origin);
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
   */
  public async connect(): Promise<void> {
    if (this.isConnected) return;

    // parentOrigin 已在构造函数中验证，直接发送握手消息
    this.postMessage({ event: "IframeLoaded" } as Message);
    this.isConnected = true;
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    this.postMessage({ event: "IframeUnload" } as Message);
    this.clearAllListeners("Connection closed");
    this.isConnected = false;
  }
}
