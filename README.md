# imToken Connect

面向 imToken Web 的 DApp 连接 SDK，提供安全、易用的 Web3 Provider 实现。

## ✨ 特性

- 🔄 **双模式支持**：自动在 popup 和 iframe 通信模式间切换
- 🔒 **安全可靠**：内置 origin 验证、消息源验证等多重安全机制
- 📱 **EIP-1193 兼容**：完整实现 EIP-1193 标准，与主流 DApp 框架无缝集成
- ⚡ **自动连接**：iframe 模式下支持自动连接，提升用户体验
- 🔗 **多链支持**：内置多链配置，支持链切换
- 💾 **状态管理**：自动缓存账户和链状态到 localStorage
- 📡 **事件系统**：完整的事件系统（connect、chainChanged、accountsChanged 等）
- 🎯 **TypeScript**：完整的类型定义，提供优秀的开发体验

## 📦 安装

```bash
pnpm add @consenlabs/imtoken-connect
```

或使用其他包管理器：

```bash
npm install @consenlabs/imtoken-connect
# 或
yarn add @consenlabs/imtoken-connect
```

## 🚀 快速开始

### 全功能模式（推荐）

使用 `ImTokenWebProvider` 可自动适配运行环境：

```typescript
import { ImTokenWebProvider } from "@consenlabs/imtoken-connect";

// 创建 Provider 实例
const provider = new ImTokenWebProvider();

// 请求连接钱包
const accounts = await provider.request({ 
  method: "eth_requestAccounts" 
});

console.log("Connected accounts:", accounts);

// 监听事件
provider.on("accountsChanged", (accounts) => {
  console.log("Accounts changed:", accounts);
});

provider.on("chainChanged", (chainId) => {
  console.log("Chain changed:", chainId);
});
```

**自动行为**：
- ✅ 自动检测运行环境（iframe 或主窗口）
- ✅ iframe 环境：使用 iframe 通信，自动连接
- ✅ 主窗口环境：使用 popup 通信，用户手动触发
- ✅ 内置父窗口来源校验（仅允许 imToken Web 官方域名）

### 仅 iframe 场景

如果你的 DApp 确定只会在 iframe 中运行，可以使用轻量级的 `ImTokenWebIframeProvider`：

```typescript
import { ImTokenWebIframeProvider } from "@consenlabs/imtoken-connect";

const provider = new ImTokenWebIframeProvider();
```

**注意事项**：
- ⚠️ 必须在 iframe 环境中运行，否则会抛出错误
- ⚠️ 必须在受信任的父窗口中运行（imToken Web 官方域名）

## 🔌 支持的 RPC 方法

| 方法 | 说明 | 处理方式 |
|------|------|----------|
| `eth_requestAccounts` | 请求连接钱包 | 通过钱包处理 |
| `eth_accounts` | 获取已连接账户 | 本地缓存 |
| `eth_chainId` | 获取当前链 ID | 本地缓存 |
| `eth_sendTransaction` | 发送交易 | 通过钱包处理 |
| `eth_signTypedData_v4` | 签名（EIP-712）| 通过钱包处理 |
| `personal_sign` | 个人签名 | 通过钱包处理 |
| `wallet_switchEthereumChain` | 切换链 | 本地处理 |
| 其他方法 | 通用 RPC 调用 | 通过配置的 RPC 节点 |

## 🏗️ 架构设计

### 项目结构

```
src/
├── communication/        # 通信层
│   ├── base.ts          # 通信器基类
│   ├── iframe.ts        # iframe 通信实现
│   ├── popup.ts         # popup 通信实现
│   └── index.ts         # 通信层导出
├── provider/            # Provider 层
│   ├── base.ts          # Provider 基类
│   ├── common.ts        # 全功能 Provider
│   ├── iframe.ts        # iframe 专用 Provider
│   └── index.ts         # Provider 导出
├── storage/             # 存储层
│   └── index.ts         # localStorage/sessionStorage 封装
├── utils/               # 工具函数
│   └── index.ts         # RPC 调用等工具
├── types.ts             # 类型定义
├── constants.ts         # 常量配置
└── index.ts             # SDK 入口
```

### 架构分层

```
┌─────────────────────────────────────┐
│         Provider Layer              │  ← EIP-1193 接口
│  (BaseProvider, ImTokenWebProvider) │
├─────────────────────────────────────┤
│      Communication Layer            │  ← 消息通信
│  (IframeCommunicator, PopupComm.)   │
├─────────────────────────────────────┤
│        Storage Layer                │  ← 状态缓存
│  (localStorage, sessionStorage)     │
└─────────────────────────────────────┘
```

### 通信模式

#### Popup 模式

```
DApp (主窗口)  ←→  Popup 窗口 (钱包)
     │                   │
     └──── postMessage ──┘
```

- 用户主动触发时打开 popup 窗口
- 通过 `window.postMessage` 通信
- 适用于非嵌入式 DApp

#### iframe 模式

```
imToken Web (父窗口)
    └── iframe (DApp)  ←→  父窗口 (钱包)
             │                │
             └── postMessage ──┘
```

- DApp 嵌入在 imToken Web 中
- 通过 `parent.postMessage` 通信

## 🔒 安全特性

### 1. Origin 验证

所有 postMessage 通信都会验证消息来源的 origin：

```typescript
// 内置允许的 origin 列表
const ALLOWED_ORIGINS = [
  "https://web.token.im",
  "https://web.qianbao.io",
  "https://web.imstaging.works",
  // ... 更多官方域名
];
```

### 2. 消息源验证

除了 origin 验证，还会验证消息来源窗口是否是预期的窗口，防止同源攻击。

### 3. 环境检测

`ImTokenWebIframeProvider` 会验证运行环境：

- ✅ 必须在 iframe 中运行
- ✅ 父窗口必须是受信任的 origin
- ❌ 不符合条件时立即抛出错误

### 4. 具名 Target Origin

所有 postMessage 都使用具体的 targetOrigin，不使用通配符 `*`。

### 5. 请求 ID 验证

每个请求都带有唯一的 UUID，响应必须匹配请求 ID。

## 🛠️ 开发

### 构建

```bash
pnpm build
```

### 清理

```bash
pnpm clean
```

## 📝 常见问题

### 1. 如何判断使用哪个 Provider？

- **使用 ImTokenWebProvider**：适用于大多数场景，自动适配环境
- **使用 ImTokenWebIframeProvider**：确定只在 iframe 中运行，且需要自定义链配置

### 2. 错误："This provider can only be used when the DApp is embedded in an iframe"

这是因为使用了 `ImTokenWebIframeProvider` 但不在 iframe 环境中。请改用 `ImTokenWebProvider`。
