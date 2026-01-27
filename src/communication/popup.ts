import type { Message, ConfigMessage } from "../types";
import { BaseCommunicator } from "./base";

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
      return this.popup;
    }

    this.popup = openPopup(this.url);

    // 监听弹窗关闭事件
    this.onMessage<ConfigMessage>(({ event }) => event === "PopupUnload")
      .then(() => this.disconnect())
      .catch(() => {});

    // 等待弹窗加载完成
    await this.onMessage<ConfigMessage>(({ event }) => event === "PopupLoaded");

    if (!this.popup) {
      throw new Error("Internal error: Popup is null");
    }

    return this.popup;
  }

  /**
   * 断开连接并关闭弹窗
   */
  public disconnect = (): void => {
    closePopup(this.popup);
    this.popup = null;
    this.clearAllListeners("Request rejected: Popup closed");
  };
}
