/**
 * 通信器基类
 * 提取 IframeCommunicator 和 PopupCommunicator 的公共逻辑
 */

import type { Message } from "../types";

export type MessageListener = (event: MessageEvent) => void;

export interface ListenerEntry {
  reject: (error: Error) => void;
}

/**
 * 通信器基类 - 提供消息监听的公共逻辑
 */
export abstract class BaseCommunicator {
  protected listeners = new Map<MessageListener, ListenerEntry>();

  /**
   * 发送消息
   */
  public abstract postMessage(message: Message): void | Promise<void>;

  /**
   * 发送请求并等待响应
   */
  public async postRequestAndWaitForResponse<M extends Message>(
    request: Message
  ): Promise<M> {
    const responsePromise = this.onMessage<M>(({ id }) => id === request.id);
    await this.postMessage(request);
    return responsePromise;
  }

  /**
   * 监听消息
   * @param predicate 消息过滤条件
   */
  public onMessage<M extends Message>(
    predicate: (msg: Partial<M>) => boolean
  ): Promise<M> {
    return new Promise((resolve, reject) => {
      const listener: MessageListener = (event: MessageEvent<M>) => {
        // 安全验证 1: 验证消息来源 origin
        if (!this.isValidOrigin(event.origin)) {
          return;
        }

        // 安全验证 2: 验证消息来源窗口（防止同源攻击和中间人攻击）
        if (!this.isValidSource(event.source)) {
          return;
        }

        const message = event.data;
        if (predicate(message)) {
          resolve(message);
          this.removeListener(listener);
        }
      };

      window.addEventListener("message", listener);
      this.listeners.set(listener, { reject });
    });
  }

  /**
   * 验证消息来源 origin 是否有效
   */
  protected abstract isValidOrigin(origin: string): boolean;

  /**
   * 验证消息来源窗口是否是预期的窗口
   * 防止同源攻击和 iframe 中间人攻击
   */
  protected abstract isValidSource(source: MessageEventSource | null): boolean;

  /**
   * 移除单个监听器
   */
  protected removeListener(listener: MessageListener): void {
    window.removeEventListener("message", listener);
    this.listeners.delete(listener);
  }

  /**
   * 清理所有监听器
   */
  protected clearAllListeners(errorMessage: string): void {
    this.listeners.forEach(({ reject }, listener) => {
      reject(new Error(errorMessage));
      window.removeEventListener("message", listener);
    });
    this.listeners.clear();
  }
}
