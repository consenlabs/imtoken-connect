import { EventEmitter } from "eventemitter3";

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
  rpcUrl: string;
}

interface ProviderConnectInfo {
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

export class ProviderEventEmitter extends EventEmitter<keyof ProviderEventMap> {}

/**
 * 通用的 Provider 接口定义
 * 所有 Provider 实现都应该符合此接口
 */
export interface IProvider extends ProviderEventEmitter {
  request(args: RequestArguments): Promise<unknown>;
  emit<K extends Parameters<ProviderEventEmitter["emit"]>[0]>(
    event: K,
    ...args: Parameters<ProviderEventEmitter["emit"]> extends [any, infer R]
      ? [R]
      : never
  ): boolean;
  on<K extends Parameters<ProviderEventEmitter["on"]>[0]>(
    event: K,
    listener: Parameters<ProviderEventEmitter["on"]>[1]
  ): this;
}
