import { PopupCommunicator, type Message } from "./popup";
import { IframeCommunicator, isInIframe, isAllowedParentOrigin } from "./iframe";
import { DEFAULT_ALLOWED_ORIGINS } from "../shared";

// 重新导出类型
export type { Message, JsonRpcResponse, ConfigMessage } from "./popup";
export type { ProviderRpcError } from "../types";

/**
 * 通信模式
 */
export type CommunicationMode = "popup" | "iframe";

/**
 * 通信器接口
 */
export interface ICommunicator {
  postMessage(message: Message): void | Promise<void>;
  postRequestAndWaitForResponse<M extends Message>(request: Message): Promise<M>;
  onMessage<M extends Message>(predicate: (_: Partial<M>) => boolean): Promise<M>;
  waitForPopupLoaded?(): Promise<Window>;
  connect?(): Promise<void>;
  disconnect?(): void;
}

/**
 * 创建通信器的工厂函数
 * 根据运行环境自动选择 popup 或 iframe 模式
 */
export function createCommunicator(
  url: string,
  options?: {
    mode?: CommunicationMode;
    allowedParentOrigins?: string[];
  }
): ICommunicator {
  const { mode, allowedParentOrigins = [] } = options || {};
  
  // 自动检测模式
  const actualMode = mode || (isInIframe() ? "iframe" : "popup");
  
  console.log("[createCommunicator] mode:", actualMode);
  
  if (actualMode === "iframe") {
    // 在 iframe 模式下，需要允许的父窗口来源列表
    const origins = allowedParentOrigins.length > 0 
      ? allowedParentOrigins 
      : DEFAULT_ALLOWED_ORIGINS;
    return new IframeCommunicator(origins);
  }
  
  return new PopupCommunicator(url);
}

export { IframeCommunicator, isInIframe, isAllowedParentOrigin, PopupCommunicator };
