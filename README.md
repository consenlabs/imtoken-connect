# imToken Connect

A secure and easy-to-use Web3 Provider SDK for DApps connecting to imToken Web.

## ✨ Features

- 🔄 **Dual Mode Support**: Automatically switches between popup and iframe communication modes
- 🔒 **Secure & Reliable**: Built-in origin verification, message source validation, and multiple security mechanisms
- 📱 **EIP-1193 Compatible**: Fully implements the EIP-1193 standard for seamless integration with mainstream DApp frameworks
- 🔗 **Multi-Chain Support**: Built-in multi-chain configuration with chain switching support
- 💾 **State Management**: Automatically caches account and chain state to localStorage
- 📡 **Event System**: Complete event system (connect, chainChanged, accountsChanged, etc.)
- 🎯 **TypeScript**: Full type definitions for an excellent development experience

## 📦 Installation

```bash
pnpm add @consenlabs/imtoken-connect
```

Or using other package managers:

```bash
npm install @consenlabs/imtoken-connect
# or
yarn add @consenlabs/imtoken-connect
```

## 🚀 Quick Start

### Full-Featured Mode (Recommended)

Use `ImTokenWebProvider` for automatic environment adaptation:

```typescript
import { ImTokenWebProvider } from "@consenlabs/imtoken-connect";

// Create Provider instance
const provider = new ImTokenWebProvider();

// Request wallet connection
const accounts = await provider.request({ 
  method: "eth_requestAccounts" 
});

console.log("Connected accounts:", accounts);

// Listen to events
provider.on("accountsChanged", (accounts) => {
  console.log("Accounts changed:", accounts);
});

provider.on("chainChanged", (chainId) => {
  console.log("Chain changed:", chainId);
});
```

**Automatic Behavior**:
- ✅ Automatically detects runtime environment (iframe or main window)
- ✅ iframe environment: Uses iframe communication
- ✅ Main window environment: Uses popup communication
- ✅ Built-in parent window origin validation (only allows official imToken Web domains)

### iframe-Only Scenario

If your DApp will only run in an iframe, you can use the lightweight `ImTokenWebIframeProvider`:

```typescript
import { ImTokenWebIframeProvider } from "@consenlabs/imtoken-connect";

const provider = new ImTokenWebIframeProvider();
```

**Important Notes**:
- ⚠️ Must run in an iframe environment, otherwise it will throw an error
- ⚠️ Must run in a trusted parent window (official imToken Web domain)

## 🔌 Supported RPC Methods

| Method | Description | Handling |
|--------|-------------|----------|
| `eth_requestAccounts` | Request wallet connection | Handled by wallet |
| `eth_accounts` | Get connected accounts | Local cache |
| `eth_chainId` | Get current chain ID | Local cache |
| `eth_sendTransaction` | Send transaction | Handled by wallet |
| `eth_signTypedData_v4` | Sign (EIP-712) | Handled by wallet |
| `personal_sign` | Personal signature | Handled by wallet |
| `wallet_switchEthereumChain` | Switch chain | Handled locally |
| Other methods | Unsupported | Throws error (4200) |

## 🏗️ Architecture

### Project Structure

```
src/
├── communication/        # Communication layer
│   ├── base.ts          # Communicator base class
│   ├── iframe.ts        # iframe communication implementation
│   ├── popup.ts         # popup communication implementation
│   └── index.ts         # Communication layer exports
├── provider/            # Provider layer
│   ├── base.ts          # Provider base class
│   ├── common.ts        # Full-featured Provider
│   ├── iframe.ts        # iframe-specific Provider
│   └── index.ts         # Provider exports
├── storage/             # Storage layer
│   └── index.ts         # localStorage/sessionStorage wrapper
├── types.ts             # Type definitions
├── constants.ts         # Constants configuration
└── index.ts             # SDK entry point
```

### Architecture Layers

```
┌─────────────────────────────────────┐
│         Provider Layer              │  ← EIP-1193 Interface
│  (BaseProvider, ImTokenWebProvider) │
├─────────────────────────────────────┤
│      Communication Layer            │  ← Message Communication
│  (IframeCommunicator, PopupComm.)   │
├─────────────────────────────────────┤
│        Storage Layer                │  ← State Caching
│  (localStorage, sessionStorage)     │
└─────────────────────────────────────┘
```

### Communication Modes

#### Popup Mode

```
DApp (Main Window)  ←→  Popup Window (Wallet)
     │                        │
     └────── postMessage ─────┘
```

- Opens popup window on user action
- Communicates via `window.postMessage`
- Suitable for non-embedded DApps

#### iframe Mode

```
imToken Web (Parent Window)
    └── iframe (DApp)  ←→  Parent Window (Wallet)
             │                   │
             └──── postMessage ──┘
```

- DApp is embedded in imToken Web
- Communicates via `parent.postMessage`

## 🔒 Security Features

### 1. Origin Verification

All postMessage communications verify the message origin:

```typescript
// Built-in allowed origins list
const ALLOWED_ORIGINS = [
  "https://web.token.im",
  "https://web.qianbao.io",
  "https://web.imstaging.works",
  // ... more official domains
];
```

### 2. Message Source Verification

In addition to origin verification, validates that the message source window is the expected window to prevent same-origin attacks.

### 3. Environment Detection

`ImTokenWebIframeProvider` validates the runtime environment:

- ✅ Must run in an iframe
- ✅ Parent window must be a trusted origin
- ❌ Throws error immediately if conditions are not met

### 4. Named Target Origin

All postMessage calls use specific targetOrigin, never uses wildcard `*`.

### 5. Request ID Verification

Each request carries a unique UUID, and responses must match the request ID.

## 🛠️ Development

### Build

```bash
pnpm build
```

### Clean

```bash
pnpm clean
```

## 📝 FAQ

### 1. How to decide which Provider to use?

- **Use ImTokenWebProvider**: Suitable for most scenarios, automatically adapts to environment
- **Use ImTokenWebIframeProvider**: When you're certain the DApp will only run in iframe (more lightweight)

### 2. Error: "This provider can only be used when the DApp is embedded in an iframe"

This is because you're using `ImTokenWebIframeProvider` but not in an iframe environment. Please use `ImTokenWebProvider` instead.
