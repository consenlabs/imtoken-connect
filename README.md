# imtoken-connect

面向 imToken Web 的 DApp 连接 SDK，单一包导出：

- `ImTokenWebProvider`：全功能 Provider，自动在 popup / iframe 间切换。
- `ImTokenWebIframeProvider`：仅 iframe 场景下的轻量 Provider。

## 安装

```bash
pnpm add @consenlabs/imtoken-connect
```

## 快速开始（全功能）

```ts
import { ImTokenWebProvider } from "@consenlabs/imtoken-connect";

const provider = new ImTokenWebProvider();

await provider.request({ method: "eth_requestAccounts" });
```

默认行为：
- 自动检测运行环境：在 iframe 中运行时使用 iframe 通信；否则自动打开 popup。
- 父窗口来源校验：仅允许来自 imToken Web 官方域名的通信。
- iframe 模式默认 `autoConnect = true`，加载完成后立即触发握手并请求账户。
- 事件：`connect` / `chainChanged` / `accountsChanged` 与 EIP-1193 对齐。

## 仅 iframe 场景

```ts
import { ImTokenWebIframeProvider } from "@consenlabs/imtoken-connect";

const provider = new ImTokenWebIframeProvider();
```

## 主要选项

- `url`: popup 模式的钱包基地址，默认 `https://web.token.im/`（仅 `ImTokenWebProvider`）。
- `initialChain`: 默认链配置（仅 `ImTokenWebIframeProvider`）。
- `allowedChains`: 支持的链列表（仅 `ImTokenWebIframeProvider`）。

**注意**：
- 通信模式（`mode`）强制使用 `"auto"`，自动根据运行环境选择 popup 或 iframe。
- 父窗口来源校验（`allowedParentOrigins`）已内置，仅允许 imToken Web 官方域名。
- iframe 模式下自动开启 `autoConnect`。

## 变更提示

当前主版本移除了历史 `HoTProvider` 兼容导出，请直接使用 `ImTokenWebProvider` / `ImTokenWebIframeProvider`。
