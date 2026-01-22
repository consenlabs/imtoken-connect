/**
 * iframe 模式通信
 * 当 DApp 运行在 iframe 中时，通过 window.parent.postMessage 与父窗口通信
 */

import type { Message } from "./popup";

export interface ConfigMessage extends Message {
  event: "IframeLoaded" | "IframeUnload";
}

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

/**
 * 检测父窗口的来源是否在允许列表中
 */
export function isAllowedParentOrigin(allowedOrigins: string[]): boolean {
  if (!isInIframe()) return false;
  
  // 在 iframe 中，我们无法直接获取父窗口的 origin
  // 需要通过 document.referrer 或等待父窗口发送消息来验证
  const referrer = document.referrer;
  if (referrer) {
    try {
      const referrerOrigin = new URL(referrer).origin;
      return allowedOrigins.some(origin => origin === referrerOrigin);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * iframe 模式通信器
 * 当 DApp 运行在 home-of-token-web 的 iframe 中时使用
 */
export class IframeCommunicator {
  private readonly allowedOrigins: string[];
  private listeners = new Map<
    (_: MessageEvent) => void,
    { reject: (_: Error) => void }
  >();
  private isConnected = false;

  constructor(allowedOrigins: string[]) {
    this.allowedOrigins = allowedOrigins;
  }

  /**
   * 发送消息给父窗口
   */
  public postMessage(message: Message) {
    console.log("[IframeCommunicator] postMessage", message);
    window.parent.postMessage(message, "*");
  }

  /**
   * 发送请求并等待响应
   */
  public async postRequestAndWaitForResponse<M extends Message>(
    request: Message
  ): Promise<M> {
    console.log("[IframeCommunicator] postRequestAndWaitForResponse", request);
    const responsePromise = this.onMessage<M>(({ id }) => id === request.id);
    this.postMessage(request);
    return await responsePromise;
  }

  /**
   * 监听来自父窗口的消息
   */
  public async onMessage<M extends Message>(
    predicate: (_: Partial<M>) => boolean
  ): Promise<M> {
    return new Promise((resolve, reject) => {
      const listener = (event: MessageEvent<M>) => {
        // 验证消息来源
        if (!this.isAllowedOrigin(event.origin)) {
          console.warn(
            "[IframeCommunicator] Message from unknown origin:",
            event.origin
          );
          return;
        }

        const message = event.data;
        if (predicate(message)) {
          resolve(message);
          window.removeEventListener("message", listener);
          this.listeners.delete(listener);
        }
      };

      window.addEventListener("message", listener);
      this.listeners.set(listener, { reject });
    });
  }

  /**
   * 验证来源是否允许
   */
  private isAllowedOrigin(origin: string): boolean {
    return this.allowedOrigins.some((allowed) => allowed === origin);
  }

  public async connect(): Promise<void> {
    if (this.isConnected) return;

    this.postMessage({ event: "IframeLoaded" } as Message);
    this.isConnected = true;
  }

  public disconnect() {
    this.postMessage({ event: "IframeUnload" } as Message);
    
    this.listeners.forEach(({ reject }, listener) => {
      reject(new Error("Connection closed"));
      window.removeEventListener("message", listener);
    });
    this.listeners.clear();
    this.isConnected = false;
  }
}
