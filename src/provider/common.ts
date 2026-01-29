import {
  PopupCommunicator,
  IframeCommunicator,
  CommunicationMode,
  isInIframe,
} from "../communication";
import { getKey, getSessionStorage, setSessionStorage } from "../storage";
import { BaseProvider } from "./base";
import { IProvider } from "../types";
import { ALLOWED_CHAINS, IMTOKEN_WEB_URLS } from "../constants";

/**
 * imToken Web Provider 配置选项
 */
export interface ImTokenWebProviderOptions {
  /** imToken Web 的 URL (popup 模式使用) */
  url?: string;
}

/**
 * 全功能 Provider，支持 popup 和 iframe 两种通信模式
 * - 在 iframe 环境中自动使用 iframe 通信
 * - 在主窗口环境中使用 popup 通信
 */
export class ImTokenWebProvider extends BaseProvider implements IProvider {
  public readonly isImTokenWeb = true;
  /** 当前通信模式 */
  public readonly mode: CommunicationMode;

  private readonly popupCommunicator?: PopupCommunicator;
  private readonly iframeCommunicator?: IframeCommunicator;

  constructor(options: ImTokenWebProviderOptions = {}) {
    const defaultUrl = IMTOKEN_WEB_URLS[0];

    const actualMode: CommunicationMode = isInIframe() ? "iframe" : "popup";

    // 创建通信器
    let communicator: IframeCommunicator | PopupCommunicator;
    let popupCommunicator: PopupCommunicator | undefined;
    let iframeCommunicator: IframeCommunicator | undefined;

    if (actualMode === "iframe") {
      iframeCommunicator = new IframeCommunicator();
      communicator = iframeCommunicator;
    } else {
      let chosenUrl = options.url;
      if (chosenUrl && IMTOKEN_WEB_URLS.includes(chosenUrl)) {
        setSessionStorage(getKey("url"), chosenUrl);
      } else {
        chosenUrl = getSessionStorage(getKey("url")) ?? defaultUrl;
      }
      popupCommunicator = new PopupCommunicator(`${chosenUrl}/wallet`);
      communicator = popupCommunicator;
    }

    super({
      communicator,
      initialChainId: ALLOWED_CHAINS[0],
      allowedChainIds: ALLOWED_CHAINS,
    });

    this.mode = actualMode;
    this.popupCommunicator = popupCommunicator;
    this.iframeCommunicator = iframeCommunicator;

    // 在 iframe 模式下调度握手
    if (this.mode === "iframe") {
      this.scheduleHandshake();
    }
  }

  protected async ensureCommunicationReady(): Promise<void> {
    if (this.mode === "iframe" && this.iframeCommunicator) {
      await this.iframeCommunicator.connect();
    } else if (this.mode === "popup" && this.popupCommunicator) {
      await this.popupCommunicator.waitForPopupLoaded();
    }
  }
}
