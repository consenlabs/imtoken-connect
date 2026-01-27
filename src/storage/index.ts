export const STORAGE_PREFIX = "imTokenWeb";

export type StorageKey = "accounts" | "activeChainId" | "availableChainList" | "url";

/**
 * 生成带前缀的存储键
 */
export const getKey = (key: StorageKey): string => {
  return `${STORAGE_PREFIX}:${key}`;
};

/**
 * 检查 localStorage 是否可用
 */
const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = "__storage_test__";
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * 检查 sessionStorage 是否可用
 */
const isSessionStorageAvailable = (): boolean => {
  try {
    const testKey = "__storage_test__";
    sessionStorage.setItem(testKey, testKey);
    sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * 从 localStorage 获取值
 */
export const getLocalStorage = <T = unknown>(key: string): T | null => {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  const value = localStorage.getItem(key);
  if (value === null) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return value as T;
  }
};

/**
 * 设置 localStorage 值
 */
export const setLocalStorage = (key: string, value: unknown): void => {
  if (!isLocalStorageAvailable()) {
    return;
  }

  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  localStorage.setItem(key, serialized);
};

/**
 * 移除 localStorage 值
 */
export const removeLocalStorage = (key: string): void => {
  if (!isLocalStorageAvailable()) {
    return;
  }

  localStorage.removeItem(key);
};

/**
 * 清除所有带前缀的 localStorage 值
 */
export const clearLocalStorage = (): void => {
  if (!isLocalStorageAvailable()) {
    return;
  }

  // 先收集所有需要删除的键，避免遍历时删除导致的问题
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  // 然后删除
  keysToRemove.forEach((key) => localStorage.removeItem(key));
};

/**
 * 从 sessionStorage 获取值
 */
export const getSessionStorage = <T = unknown>(key: string): T | null => {
  if (!isSessionStorageAvailable()) {
    return null;
  }

  const value = sessionStorage.getItem(key);
  if (value === null) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return value as T;
  }
};

/**
 * 设置 sessionStorage 值
 */
export const setSessionStorage = (key: string, value: unknown): void => {
  if (!isSessionStorageAvailable()) {
    return;
  }

  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  sessionStorage.setItem(key, serialized);
};
