/**
 * Popup 模式通信
 * 当 DApp 在主窗口中运行时，通过 window.open 创建弹窗进行通信
 */

import { UUID } from "crypto";
import type { ProviderRpcError } from "../types";

export interface JsonRpcResponse {
  id?: UUID | number;
  result?: unknown;
  error?: ProviderRpcError;
}

export interface Message extends JsonRpcResponse {
  id: UUID;
  chainId: number;
  method?: string;
  params?: unknown[] | object;
  event?: string;
  result?: unknown;
}

export interface ConfigMessage extends Message {
  event: "PopupLoaded" | "PopupUnload";
}

const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 540;

export function openPopup(url: URL): Window {
  const left = (window.innerWidth - POPUP_WIDTH) / 2 + window.screenX;
  const top = (window.innerHeight - POPUP_HEIGHT) / 2 + window.screenY;

  const popup = window.open(
    url.toString(),
    "WebApp",
    `width=${POPUP_WIDTH}, height=${POPUP_HEIGHT}, left=${left}, top=${top}`
  );
  popup?.focus();
  if (!popup) {
    const userLang = navigator.language;
    const message = userLang.startsWith('zh') 
      ? "请前往浏览器设置，将「阻止弹出式弹窗」关闭以继续使用"
      : "Please go to the browsers setting page to allow pop-ups to continue";
    alert(message);
    throw new Error("WebApp window failed to open");
  }

  return popup;
}

export function closePopup(popup: Window | null) {
  console.log("closePopup");
  if (popup && !popup.closed) {
    popup.close();
  }
}

/**
 * Popup 模式通信器
 * 当 DApp 在主窗口中运行时使用
 */
export class PopupCommunicator {
  private readonly url: URL;
  private popup: Window | null = null;
  private listeners = new Map<
    (_: MessageEvent) => void,
    { reject: (_: Error) => void }
  >();

  constructor(url: string) {
    this.url = new URL(url);
  }

  public async postMessage(message: Message) {
    console.log("[PopupCommunicator] postMessage", message);
    const popup = await this.waitForPopupLoaded();
    popup.postMessage(message, this.url.origin);
  }

  public async postRequestAndWaitForResponse<M extends Message>(
    request: Message
  ): Promise<M> {
    console.log("[PopupCommunicator] postRequestAndWaitForResponse", request);
    const responsePromise = this.onMessage<M>(({ id }) => id === request.id);
    await this.postMessage(request);
    return await responsePromise;
  }

  public async onMessage<M extends Message>(
    predicate: (_: Partial<M>) => boolean
  ): Promise<M> {
    return new Promise((resolve, reject) => {
      const listener = (event: MessageEvent<M>) => {
        if (event.origin !== this.url.origin) return;
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

  public async waitForPopupLoaded() {
    if (this.popup && !this.popup.closed) {
      // In case the user un-focused the popup between requests, focus it again
      console.log("[PopupCommunicator] popup already loaded, but not focused");
      this.popup.focus();
      return this.popup;
    }

    console.log("[PopupCommunicator] waitForPopupLoaded...");
    this.popup = openPopup(this.url);

    this.onMessage<ConfigMessage>(({ event }) => event === "PopupUnload")
      .then(() => this.disconnect())
      .catch(() => {});

    return this.onMessage<ConfigMessage>(({ event }) => event === "PopupLoaded")
      .then(() => {
        console.log("[PopupCommunicator] the window has been loaded!");
      })
      .then(() => {
        if (!this.popup) throw new Error("Internal error: Popup is null");
        return this.popup;
      });
  }

  public disconnect = () => {
    closePopup(this.popup);
    this.popup = null;

    this.listeners.forEach(({ reject }, listener) => {
      reject(new Error("Request rejected: Popup closed"));
      window.removeEventListener("message", listener);
    });
    this.listeners.clear();
  };
}
