import type { Message, ConfigMessage } from "../types";
import { BaseCommunicator } from "./base";

const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 540;
const POPUP_READY_RETRY_MS = 100;

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
    const message = userLang.startsWith("zh")
      ? "请前往浏览器设置，将「阻止弹出式弹窗」关闭以继续使用"
      : "Please go to the browsers setting page to allow pop-ups to continue";
    alert(message);
    throw new Error("WebApp window failed to open");
  }

  return popup;
}


export function closePopup(popup: Window | null): void {
  if (popup && !popup.closed) {
    popup.close();
  }
}

export class PopupCommunicator extends BaseCommunicator {
  private readonly url: URL;
  private popup: Window | null = null;
  private popupLoadPromise: Promise<Window> | null = null;
  private popupReadyRetry: number | null = null;

  constructor(url: string) {
    super();
    this.url = new URL(url);
  }

  /**
   * 发送消息给弹窗
   */
  public async postMessage(message: Message): Promise<void> {
    const popup = await this.waitForPopupLoaded();
    popup.postMessage(message, this.url.origin);
  }

  /**
   * 验证消息来源 origin 是否来自弹窗
   */
  protected isValidOrigin(origin: string): boolean {
    return origin === this.url.origin;
  }

  /**
   * 验证消息来源窗口是否是 popup 窗口
   * 防止同源攻击
   */
  protected isValidSource(source: MessageEventSource | null): boolean {
    // 只接受来自我们打开的 popup 窗口的消息
    // 防止同源的其他窗口发送伪造消息
    return source === this.popup;
  }

  /**
   * 等待弹窗加载完成
   */
  public async waitForPopupLoaded(): Promise<Window> {
    if (this.popup && !this.popup.closed) {
      // 如果弹窗已存在但未聚焦，重新聚焦
      this.popup.focus();
      return this.popupLoadPromise ?? this.popup;
    }

    this.popup = openPopup(this.url);
    const popup = this.popup;

    // Register both listeners before telling the popup it is ready. The popup
    // can respond immediately when it already has a referrer, while a popup
    // opened with Referrer-Policy: no-referrer needs this explicit handshake.
    const popupLoaded = this.onMessage<ConfigMessage>(
      ({ event }) => event === "PopupLoaded"
    );

    // 监听弹窗关闭事件
    const popupUnloaded = this.onMessage<ConfigMessage>(
      ({ event }) => event === "PopupUnload"
    ).then(() => {
      this.disconnect();
      throw new Error("Request rejected: Popup closed");
    });

    const sendPopupReady = (): void => {
      if (popup.closed) {
        this.disconnect();
        return;
      }
      popup.postMessage({ event: "PopupReady" }, this.url.origin);
    };

    // The wallet listener may not be registered when the popup is first
    // opened. Retry only until it confirms readiness or the popup closes.
    sendPopupReady();
    this.popupReadyRetry = window.setInterval(
      sendPopupReady,
      POPUP_READY_RETRY_MS
    );

    this.popupLoadPromise = Promise.race([popupLoaded, popupUnloaded])
      .then(() => popup)
      .finally(() => {
        this.stopPopupReadyRetry();
        this.popupLoadPromise = null;
      });

    const loadedPopup = await this.popupLoadPromise;
    if (!this.popup || this.popup !== loadedPopup || loadedPopup.closed) {
      throw new Error("Internal error: Popup is null");
    }

    return loadedPopup;
  }

  private stopPopupReadyRetry(): void {
    if (this.popupReadyRetry !== null) {
      window.clearInterval(this.popupReadyRetry);
      this.popupReadyRetry = null;
    }
  }

  /**
   * 断开连接并关闭弹窗
   */
  public disconnect = (): void => {
    this.stopPopupReadyRetry();
    this.popupLoadPromise = null;
    closePopup(this.popup);
    this.popup = null;
    this.clearAllListeners("Request rejected: Popup closed");
  };
}
