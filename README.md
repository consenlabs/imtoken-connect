# webapp-provider 工作区

面向 imToken Web 的 DApp 连接 SDK，包含：

- `@consenlabs/webapp-sdk-core`：通信、存储与基础类型。
- `@consenlabs/webapp-provider`：全功能 Provider，自动在 popup / iframe 间切换。
- `@consenlabs/webapp-provider-iframe`：仅 iframe 场景下的轻量 Provider。

## 安装

```bash
pnpm add @consenlabs/webapp-provider
# 或仅 iframe
pnpm add @consenlabs/webapp-provider-iframe
```

## 快速开始（全功能）

```ts
import { ImTokenWebProvider } from "@consenlabs/webapp-provider";

const provider = new ImTokenWebProvider({
  mode: "auto",              // "auto" | "popup" | "iframe"
  allowedParentOrigins: [],  // iframe 模式下允许的父窗口来源
});

await provider.request({ method: "eth_requestAccounts" });
```

默认行为：
- 在 iframe 中运行时使用 iframe 通信；否则自动打开 popup。
- iframe 模式默认 `autoConnect = true`，加载完成后立即触发握手并请求账户。
- 事件：`connect` / `chainChanged` / `accountsChanged` 与 EIP-1193 对齐。

## 仅 iframe 场景

```ts
import { ImTokenWebIframeProvider } from "@consenlabs/webapp-provider-iframe";

const provider = new ImTokenWebIframeProvider({
  allowedParentOrigins: ["https://web.token.im"],
});
```

## 主要选项

- `mode`: `"auto" | "popup" | "iframe"`（仅 `@consenlabs/webapp-provider`）。
- `allowedParentOrigins`: iframe 模式允许的父窗口 origin 列表。
- `autoConnect`: iframe 模式下自动调用 `eth_requestAccounts`（`@consenlabs/webapp-provider` 在 iframe 模式强制开启；iframe 版始终开启）。
- `url`: popup 模式的钱包基地址，默认 `https://web.token.im/`。

## 构建与发布

```bash
pnpm build
pnpm changeset version
pnpm changeset publish
```

## 变更提示

当前主版本移除了历史 `HoTProvider` 兼容导出，请直接使用 `ImTokenWebProvider` / `ImTokenWebIframeProvider`。
