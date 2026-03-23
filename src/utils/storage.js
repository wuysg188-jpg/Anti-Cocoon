/**
 * storage.js — IndexedDB 存储工具
 * 
 * 替代 LocalStorage，支持更大的存储容量
 * 使用原生 IndexedDB API，无需外部依赖
 */

const DB_NAME = 'anti_cocoon_db';
const DB_VERSION = 1;
const STORES = {
  insights: 'insights',    // AI 分析结果
  news: 'news',            // 新闻缓存
  bookmarks: 'bookmarks',  // 书签
  settings: 'settings',    // 设置
};

let dbInstance = null;

/**
 * 打开数据库
 * @returns {Promise<IDBDatabase>}
 */
async function openDB() {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('无法打开数据库'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 创建对象存储
      if (!db.objectStoreNames.contains(STORES.insights)) {
        db.createObjectStore(STORES.insights, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.news)) {
        db.createObjectStore(STORES.news, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.bookmarks)) {
        db.createObjectStore(STORES.bookmarks, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings, { keyPath: 'key' });
      }
    };
  });
}

/**
 * 获取数据
 * @param {string} storeName - 存储名称
 * @param {string} key - 键
 * @returns {Promise<any>}
 */
export async function getItem(storeName, key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.warn('IndexedDB get error:', error);
    return null;
  }
}

/**
 * 设置数据
 * @param {string} storeName - 存储名称
 * @param {string} key - 键
 * @param {any} value - 值
 * @returns {Promise<void>}
 */
export async function setItem(storeName, key, value) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put({ key, value, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('IndexedDB set error:', error);
  }
}

/**
 * 删除数据
 * @param {string} storeName - 存储名称
 * @param {string} key - 键
 * @returns {Promise<void>}
 */
export async function removeItem(storeName, key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('IndexedDB remove error:', error);
  }
}

/**
 * 清空存储
 * @param {string} storeName - 存储名称
 * @returns {Promise<void>}
 */
export async function clearStore(storeName) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('IndexedDB clear error:', error);
  }
}

/**
 * 获取所有键
 * @param {string} storeName - 存储名称
 * @returns {Promise<Array<string>>}
 */
export async function getAllKeys(storeName) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAllKeys();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('IndexedDB getAllKeys error:', error);
    return [];
  }
}

/**
 * 获取所有数据
 * @param {string} storeName - 存储名称
 * @returns {Promise<Array>}
 */
export async function getAll(storeName) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result.map(item => item.value);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('IndexedDB getAll error:', error);
    return [];
  }
}

/**
 * 获取存储大小（估算）
 * @returns {Promise<Object>}
 */
export async function getStorageSize() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        usageInMB: ((estimate.usage || 0) / 1024 / 1024).toFixed(2),
        quotaInMB: ((estimate.quota || 0) / 1024 / 1024).toFixed(2),
      };
    }
    return { usage: 0, quota: 0, usageInMB: '0', quotaInMB: '0' };
  } catch {
    return { usage: 0, quota: 0, usageInMB: '0', quotaInMB: '0' };
  }
}

// ─── 兼容 LocalStorage 的 API ────────────────────────────────────────────

/**
 * 兼容 LocalStorage 的包装器
 */
export const storage = {
  async getItem(key) {
    return getItem(STORES.settings, key);
  },
  
  async setItem(key, value) {
    return setItem(STORES.settings, key, value);
  },
  
  async removeItem(key) {
    return removeItem(STORES.settings, key);
  },
};

// ─── 导出存储名称常量 ────────────────────────────────────────────────────

export { STORES };
