import {
  IframeCommunicator,
  BaseProvider,
  IProvider,
  Chain,
  ALLOWED_CHAINS,
  DEFAULT_ALLOWED_ORIGINS,
} from "@consenlabs/webapp-sdk-core";

export interface ImTokenWebIframeProviderOptions {
  /** iframe 模式下允许的父窗口来源列表 */
  allowedParentOrigins?: string[];
  /** 默认链配置 */
  initialChain?: Chain;
  /** 支持的链列表（可用于自定义 rpcUrl） */
  allowedChains?: Chain[];
}

export interface ImTokenWebIframeProviderInterface extends IProvider {}

export class ImTokenWebIframeProvider
  extends BaseProvider
  implements ImTokenWebIframeProviderInterface
{
  constructor(options: ImTokenWebIframeProviderOptions = {}) {
    const communicator = new IframeCommunicator(
      options.allowedParentOrigins || DEFAULT_ALLOWED_ORIGINS
    );

    super({
      communicator,
      autoConnect: true,
      initialChain: options.initialChain ?? ALLOWED_CHAINS[0],
      allowedChains: options.allowedChains ?? ALLOWED_CHAINS,
    });

    // 使用 BaseProvider 提供的 scheduleHandshake 方法
    this.scheduleHandshake();

    if (this.autoConnectEnabled && typeof window !== "undefined") {
      void this.ensureAutoConnect();
    }
  }

  protected async ensureCommunicationReady(): Promise<void> {
    if (this.communicator.connect) {
      await this.communicator.connect();
    }
  }
}
