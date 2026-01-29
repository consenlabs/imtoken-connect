/**
 * 通信层入口
 */

import type { Message } from "../types";

export { BaseCommunicator } from "./base";
export { IframeCommunicator, isInIframe } from "./iframe";
export { PopupCommunicator, openPopup, closePopup } from "./popup";

/**
 * 通信模式
 */
export type CommunicationMode = "popup" | "iframe";

/**
 * 通信器接口
 * 定义所有通信器必须实现的方法
 */
export interface ICommunicator {
  /** 发送消息 */
  postMessage(message: Message): void | Promise<void>;

  /** 发送请求并等待响应 */
  postRequestAndWaitForResponse<M extends Message>(request: Message): Promise<M>;

  /** 监听符合条件的消息 */
  onMessage<M extends Message>(predicate: (msg: Partial<M>) => boolean): Promise<M>;

  /** 建立连接（可选，iframe 模式使用） */
  connect?(): Promise<void>;

  /** 断开连接（可选） */
  disconnect?(): void;

  /** 等待弹窗加载（可选，popup 模式使用） */
  waitForPopupLoaded?(): Promise<Window>;
}
