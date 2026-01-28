import { IframeCommunicator, isInIframe } from "../communication";
import { BaseProvider } from "./base";
import { Chain, IProvider } from "../types";
import { ALLOWED_CHAINS } from "../constants";

/**
 * iframe 专用 Provider 配置选项
 */
export interface ImTokenWebIframeProviderOptions {
  /** 默认链配置 */
  initialChain?: Chain;
  /** 支持的链列表（可用于自定义 rpcUrl） */
  allowedChains?: Chain[];
}

/**
 * 仅 iframe 场景下的轻量 Provider
 * 适用于确定在 iframe 环境中运行的 DApp
 * 
 * 安全特性：
 * - 验证必须运行在 iframe 环境中
 * - 验证父窗口必须是受信任的 origin
 * - 所有 postMessage 都使用具体的 targetOrigin
 */
export class ImTokenWebIframeProvider extends BaseProvider implements IProvider {
  private readonly iframeCommunicator: IframeCommunicator;

  constructor(options: ImTokenWebIframeProviderOptions = {}) {
    // 安全检查：验证环境
    ImTokenWebIframeProvider.validateEnvironment();

    // IframeCommunicator 构造函数会验证父窗口 origin
    // 如果父窗口不可信，会抛出错误
    const iframeCommunicator = new IframeCommunicator();

    super({
      communicator: iframeCommunicator,
      initialChain: options.initialChain ?? ALLOWED_CHAINS[0],
      allowedChains: options.allowedChains ?? ALLOWED_CHAINS,
    });

    this.iframeCommunicator = iframeCommunicator;

    // 调度握手
    this.scheduleHandshake();
  }

  /**
   * 验证运行环境是否符合安全要求
   */
  private static validateEnvironment(): void {
    // 检查是否在浏览器环境
    if (typeof window === "undefined") {
      throw new Error(
        "[ImTokenWebIframeProvider] Must be used in browser environment"
      );
    }

    // 检查是否在 iframe 中运行（使用统一的判断函数）
    if (!isInIframe()) {
      throw new Error(
        "[ImTokenWebIframeProvider] Security Error: This provider can only be used " +
        "when the DApp is embedded in an iframe within imToken Web. " +
        "For non-iframe usage, please use ImTokenWebProvider instead."
      );
    }
  }

  protected async ensureCommunicationReady(): Promise<void> {
    await this.iframeCommunicator.connect();
  }
}
