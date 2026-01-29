import type { UUID } from "crypto";

// ============================================================================
// RPC 相关类型
// ============================================================================

export enum WalletRpcMethod {
  eth_chainId = "eth_chainId",
  eth_accounts = "eth_accounts",
  eth_requestAccounts = "eth_requestAccounts",
  eth_sendTransaction = "eth_sendTransaction",
  eth_signTypedData_v4 = "eth_signTypedData_v4",
  wallet_switchEthereumChain = "wallet_switchEthereumChain",
  personal_sign = "personal_sign",
}

export interface RequestArguments {
  method: string;
  params?: unknown[] | object;
}

export interface Chain {
  id: number;
}

// ============================================================================
// 通信消息类型
// ============================================================================

export interface JsonRpcResponse {
  id?: UUID | number;
  result?: unknown;
  error?: ProviderRpcError;
}

/** 通用消息类型 */
export interface Message extends JsonRpcResponse {
  id: UUID;
  chainId: number;
  method?: string;
  params?: unknown[] | object;
  event?: string;
  result?: unknown;
}

/** 生命周期事件类型 */
export type LifecycleEvent =
  | "PopupLoaded"
  | "PopupUnload"
  | "IframeLoaded"
  | "IframeUnload";

/** 配置/生命周期消息 */
export interface ConfigMessage extends Message {
  event: LifecycleEvent;
}

// ============================================================================
// Provider 事件类型
// ============================================================================

export interface ProviderConnectInfo {
  readonly chainId: string;
}

export interface ProviderRpcError extends Error {
  code: number;
  data?: unknown;
}

export type ProviderEventMap = {
  connect: ProviderConnectInfo;
  disconnect: ProviderRpcError;
  chainChanged: string;
  accountsChanged: string[];
};

// ============================================================================
// Provider 接口
// ============================================================================

/**
 * EIP-1193 兼容的 Provider 接口
 */
export interface IProvider {
  request(args: RequestArguments): Promise<unknown>;
  on<K extends keyof ProviderEventMap>(
    event: K,
    listener: (payload: ProviderEventMap[K]) => void
  ): this;
  off<K extends keyof ProviderEventMap>(
    event: K,
    listener: (payload: ProviderEventMap[K]) => void
  ): this;
  emit<K extends keyof ProviderEventMap>(
    event: K,
    payload: ProviderEventMap[K]
  ): boolean;
}
