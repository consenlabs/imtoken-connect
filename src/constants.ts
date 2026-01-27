import type { Chain } from "./types";

/**
 * 支持的链配置列表
 */
export const ALLOWED_CHAINS: Chain[] = [
  { id: 42161, rpcUrl: "https://arb1.arbitrum.io/rpc" },
  { id: 11155111, rpcUrl: "https://rpc.sepolia.org" },
];

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
