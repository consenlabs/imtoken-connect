import { mainnet, arbitrum, optimism, sepolia, type Chain } from "viem/chains";

/**
 * 支持的链 ID 列表
 */
export const ALLOWED_CHAINS: number[] = [
  1,     // Mainnet
  42161, // Arbitrum One
  10,    // Optimism
  11155111, // Sepolia
];

/**
 * 链 ID 到 viem Chain 配置的映射
 * 用于创建 PublicClient 调用只读 RPC 方法
 */
export const VIEM_CHAINS: Record<number, Chain> = {
  1: mainnet,
  42161: arbitrum,
  10: optimism,
  11155111: sepolia,
};

/**
 * imToken Web 应用的 URL 列表
 */
export const IMTOKEN_WEB_URLS: readonly string[] = [
  "https://web.token.im/",
  "https://web.qianbao.io/",
  "https://web.imstaging.works/",
  "https://home-of-token-web.vercel.app/",
  "https://home-of-token-web-test.vercel.app/",
  "http://localhost:3000/",
];

/**
 * 默认允许的父窗口来源列表（用于 iframe 模式）
 */
export const ALLOWED_ORIGINS: string[] = IMTOKEN_WEB_URLS.map((url) => new URL(url).origin);
