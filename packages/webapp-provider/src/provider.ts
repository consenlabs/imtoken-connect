import {
  PopupCommunicator,
  IframeCommunicator,
  CommunicationMode,
  isInIframe,
  getKey,
  getSessionStorage,
  setSessionStorage,
  BaseProvider,
  IProvider,
  ALLOWED_CHAINS,
  IMTOKEN_WEB_URLS,
} from "@consenlabs/webapp-sdk-core";

export interface ImTokenWebProviderInterface extends IProvider {}

export type ProviderEventCallback = ImTokenWebProviderInterface["emit"];

/**
 * imToken Web Provider 配置选项
 */
export interface ImTokenWebProviderOptions {
  /** imToken Web 的 URL (popup 模式使用) */
  url?: string;
  /** 通信模式: "popup" | "iframe" | "auto" (自动检测) */
  mode?: CommunicationMode | "auto";
  /** iframe 模式下允许的父窗口来源列表 */
  allowedParentOrigins?: string[];
}

export class ImTokenWebProvider
  extends BaseProvider
  implements ImTokenWebProviderInterface
{
  public readonly isImTokenWeb = true;
  /** 当前通信模式 */
  public readonly mode: CommunicationMode;

  constructor(options: ImTokenWebProviderOptions = {}) {
    const defaultUrl = IMTOKEN_WEB_URLS[0];

    // 确定通信模式
    let actualMode: CommunicationMode;
    if (options.mode === "auto" || options.mode === undefined) {
      actualMode = isInIframe() ? "iframe" : "popup";
    } else {
      actualMode = options.mode;
    }

    // 创建通信器
    const communicator =
      actualMode === "iframe"
        ? new IframeCommunicator(
            options.allowedParentOrigins ||
              IMTOKEN_WEB_URLS.map((url) => new URL(url).origin)
          )
        : (() => {
            let chosenUrl = options.url;
            if (chosenUrl && IMTOKEN_WEB_URLS.includes(chosenUrl)) {
              setSessionStorage(getKey("url"), chosenUrl);
            } else {
              chosenUrl = getSessionStorage(getKey("url")) ?? defaultUrl;
            }
            return new PopupCommunicator(`${chosenUrl}/wallet`);
          })();

    super({
      communicator,
      autoConnect: actualMode === "iframe",
      initialChain: ALLOWED_CHAINS[0],
      allowedChains: ALLOWED_CHAINS,
    });

    this.mode = actualMode;

    // 使用 BaseProvider 提供的 scheduleHandshake 方法
    if (this.mode === "iframe") {
      this.scheduleHandshake();
    }
  }

  protected async ensureCommunicationReady(): Promise<void> {
    if (this.mode === "iframe" && this.communicator.connect) {
      await this.communicator.connect();
    } else if (
      this.mode === "popup" &&
      (this.communicator as any).waitForPopupLoaded
    ) {
      await (this.communicator as any).waitForPopupLoaded();
    }
  }
}
