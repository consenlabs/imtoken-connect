import { EventEmitter } from "eventemitter3";
import {
  ProviderEventMap,
  ProviderRpcError,
  RequestArguments,
  WalletRpcMethod,
  Chain,
} from "../types";
import { ICommunicator } from "../communication";
import { rpc } from "../utils";
import { getKey, getLocalStorage, setLocalStorage } from "../storage";
import { ALLOWED_CHAINS } from "../constants";

class ProviderEventEmitter extends EventEmitter<keyof ProviderEventMap> {
  public emit<K extends keyof ProviderEventMap>(
    event: K,
    payload: ProviderEventMap[K]
  ): boolean {
    return super.emit(event, payload as never);
  }

  public on<K extends keyof ProviderEventMap>(
    event: K,
    listener: (payload: ProviderEventMap[K]) => void
  ): this {
    return super.on(event, listener as never);
  }

  public off<K extends keyof ProviderEventMap>(
    event: K,
    listener: (payload: ProviderEventMap[K]) => void
  ): this {
    return super.off(event, listener as never);
  }
}

export interface BaseProviderOptions {
  communicator: ICommunicator;
  /** 默认链，若本地无缓存则使用 */
  initialChain?: Chain;
  /** 允许的链列表，默认使用 ALLOWED_CHAINS */
  allowedChains?: Chain[];
}

/**
 * 提供账户/链状态、错误包装等公共逻辑。
 * 具体通信方式由子类实现 ensureCommunicationReady。
 */
export abstract class BaseProvider extends ProviderEventEmitter {
  protected readonly communicator: ICommunicator;
  protected accounts: string[] = [];
  protected chain: Chain;
  protected hasEmittedConnect = false;
  protected readonly allowedChains: Chain[];

  protected constructor(options: BaseProviderOptions) {
    super();
    const {
      communicator,
      initialChain = ALLOWED_CHAINS[0],
      allowedChains = ALLOWED_CHAINS,
    } = options;

    this.communicator = communicator;
    this.allowedChains = allowedChains;

    this.accounts = getLocalStorage(getKey("accounts")) ?? [];
    this.chain = getLocalStorage(getKey("activeChainId")) ?? initialChain;
  }

  /** 子类需实现，确保通信通道就绪（popup 打开 / iframe 握手等） */
  protected abstract ensureCommunicationReady(): Promise<void>;

  /**
   * 在页面加载完成后调度握手逻辑
   */
  protected scheduleHandshake(): void {
    if (typeof window === "undefined") {
      return;
    }

    const sendHandshake = () => {
      if (this.communicator.connect) {
        this.communicator.connect().catch((error) => {
          console.warn("[BaseProvider] Failed to send handshake:", error);
        });
      }
    };

    if (document.readyState === "complete") {
      setTimeout(sendHandshake, 50);
    } else {
      window.addEventListener(
        "load",
        () => setTimeout(sendHandshake, 50),
        { once: true }
      );
    }
  }

  public async request(args: RequestArguments): Promise<unknown> {
    if (
      this.accounts.length === 0 &&
      args.method !== WalletRpcMethod.eth_requestAccounts
    ) {
      throw this.createRpcError(-32002, "Should request accounts before sending request");
    }

    try {
      switch (args.method) {
        case WalletRpcMethod.eth_accounts:
          return this.getAccounts();
        case WalletRpcMethod.eth_requestAccounts:
          return this.handleRequestAccounts(args);
        case WalletRpcMethod.wallet_switchEthereumChain:
          return this.handleSwitchChain(args);
        case WalletRpcMethod.eth_sendTransaction:
        case WalletRpcMethod.eth_signTypedData_v4:
          return this.sendRequestToWallet(args);
        case WalletRpcMethod.eth_chainId:
          return this.getChainId();
        default:
          const { result } = await rpc(this.chain.rpcUrl, args);
          return result;
      }
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  protected async sendRequestToWallet(
    request: RequestArguments
  ): Promise<unknown> {
    await this.ensureCommunicationReady();

    const response = await this.communicator.postRequestAndWaitForResponse({
      id: crypto.randomUUID(),
      chainId: this.chain.id,
      method: request.method,
      params: request.params,
    });

    if (response.error) {
      throw this.wrapError(response.error);
    }

    return response.result;
  }

  protected getAccounts(): string[] {
    return this.accounts;
  }

  protected getChainId(): number {
    return this.chain.id;
  }

  protected async handleRequestAccounts(
    request: RequestArguments
  ): Promise<string[]> {
    // 兼容外部传入 chainId
    const requestChainId = (request?.params as { chainId?: number })?.chainId;
    if (requestChainId) {
      const chain = this.allowedChains.find((c) => c.id === requestChainId);
      if (chain) {
        this.chain = chain;
      }
    }

    const result = (await this.sendRequestToWallet(request)) as {
      accounts: string[];
      availableChainList: Chain[];
    };

    this.accounts = result.accounts;
    setLocalStorage(getKey("accounts"), this.accounts);
    if (result.availableChainList?.length) {
      setLocalStorage(getKey("availableChainList"), result.availableChainList);
      this.updateChain(result.availableChainList[0].id);
    }

    this.emit("accountsChanged", this.accounts);
    if (!this.hasEmittedConnect) {
      this.emit("connect", { chainId: this.formatChainId(this.chain.id) });
      this.hasEmittedConnect = true;
    }

    return this.accounts;
  }

  protected handleSwitchChain(request: RequestArguments): null {
    if (
      !Array.isArray(request.params) ||
      request.params.length === 0 ||
      !("chainId" in request.params[0])
    ) {
      throw this.createRpcError(-32602, "Invalid request params");
    }

    const { chainId: chainIdHex } = request.params[0] as { chainId: string };
    const chainId = parseInt(chainIdHex, 16);

    const isChainAvailable = this.updateChain(chainId);
    if (!isChainAvailable) {
      throw this.createRpcError(4902, "Unrecognized or unsupported chain ID.");
    }

    return null;
  }

  /**
   * 创建标准的 RPC 错误
   */
  protected createRpcError(code: number, message: string): ProviderRpcError {
    const error = new Error(message) as ProviderRpcError;
    error.code = code;
    return error;
  }

  /**
   * 包装错误为标准 RPC 错误格式
   */
  protected wrapError(error: unknown): ProviderRpcError {
    if (error instanceof Error) {
      const rpcError = error as ProviderRpcError;
      return {
        ...error,
        code: rpcError.code ?? -32603,
        data: rpcError.data,
      };
    }
    return {
      name: "ProviderRpcError",
      message: "Unknown error",
      code: -32603,
      data: error,
    };
  }

  /**
   * 格式化 chainId 为十六进制字符串
   */
  protected formatChainId(chainId: number): string {
    return `0x${chainId.toString(16)}`;
  }

  protected updateChain(chainId: number): boolean {
    const availableChainList =
      getLocalStorage<Chain[]>(getKey("availableChainList")) ??
      this.allowedChains.map(({ id, rpcUrl }) => ({ id, rpcUrl }));

    const matched = availableChainList.find(
      (candidate: Chain) => candidate.id === chainId
    );
    if (!matched) {
      return false;
    }

    const changed = this.chain?.id !== matched.id;
    this.chain = matched;
    setLocalStorage(getKey("activeChainId"), matched);

    if (changed) {
      this.emit("chainChanged", this.formatChainId(matched.id));
    }

    return true;
  }
}
