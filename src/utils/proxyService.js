/**
 * proxyService.js — 统一代理服务
 * 
 * 提供统一的网络请求代理功能
 */

import { CORS_PROXIES } from '../config/index.js';

/**
 * 带超时的 fetch
 * @param {string} url - 请求URL
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, timeout = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': '*/*' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * 通过代理获取URL内容
 * @param {string} url - 原始URL
 * @param {Object} options - 选项
 * @returns {Promise<string>} 响应内容
 */
export async function fetchWithProxy(url, options = {}) {
  const { timeout = 8000 } = options;
  
  // 并行尝试所有代理
  const proxyPromises = CORS_PROXIES.map(async (proxy) => {
    try {
      const response = await fetchWithTimeout(
        proxy + encodeURIComponent(url),
        timeout
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const text = await response.text();
      
      if (!text || text.trim().length < 50) {
        throw new Error('空响应');
      }
      
      // 处理 JSON 包装的响应
      if (text.trimStart().startsWith('{')) {
        try {
          const json = JSON.parse(text);
          return json.contents || json.data || json.items || text;
        } catch {
          return text;
        }
      }
      
      return text;
    } catch (error) {
      throw error;
    }
  });
  
  // 返回第一个成功的结果
  const results = await Promise.allSettled(proxyPromises);
  const success = results.find(r => r.status === 'fulfilled');
  
  if (success) {
    return success.value;
  }
  
  // 所有代理都失败
  const errors = results
    .filter(r => r.status === 'rejected')
    .map(r => r.reason.message);
  
  throw new Error(`所有代理节点尝试失败: ${errors.join(', ')}`);
}

/**
 * 解析RSS XML
 * @param {string} xmlText - XML文本
 * @param {string} keyword - 搜索关键词
 * @returns {Array} 新闻条目数组
 */
export function parseRssXml(xmlText, keyword = '') {
  try {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'application/xml');
    
    // 检查解析错误
    const parseError = xml.querySelector('parsererror');
    if (parseError) {
      throw new Error('RSS 解析失败：格式错误');
    }
    
    // 尝试多种选择器来获取 items
    let items = Array.from(xml.querySelectorAll('item'));
    
    // 有些 RSS 使用 entry 而不是 item（如 Atom 格式）
    if (items.length === 0) {
      items = Array.from(xml.querySelectorAll('entry'));
    }
    
    if (items.length === 0) {
      return [];
    }
    
    const channelTitle = xml.querySelector('channel > title')?.textContent 
      || xml.querySelector('feed > title')?.textContent 
      || 'News';
    
    return items.map((item) => {
      const title = item.querySelector('title')?.textContent || '（无标题）';
      
      // 处理不同格式的链接
      let link = item.querySelector('link')?.textContent 
        || item.querySelector('guid')?.textContent 
        || item.querySelector('link')?.getAttribute('href')
        || '#';
      
      const description = (item.querySelector('description')?.textContent 
        || item.querySelector('summary')?.textContent 
        || item.querySelector('content')?.textContent
        || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      
      const pubDate = item.querySelector('pubDate')?.textContent 
        || item.querySelector('published')?.textContent 
        || item.querySelector('updated')?.textContent
        || '';
      
      const source = item.querySelector('source')?.textContent 
        || channelTitle;
      
      // 尝试获取缩略图
      let thumbnail = null;
      const mediaContent = item.querySelector('media\\:content, content');
      if (mediaContent) {
        thumbnail = mediaContent.getAttribute('url');
      }
      const enclosure = item.querySelector('enclosure');
      if (!thumbnail && enclosure && enclosure.getAttribute('type')?.startsWith('image')) {
        thumbnail = enclosure.getAttribute('url');
      }
      
      return {
        id: generateNewsId(title, link),
        title,
        link,
        description: description.slice(0, 500),
        content: description.slice(0, 500),
        pubDate,
        author: source,
        sourceName: source,
        thumbnail,
      };
    });
  } catch (error) {
    console.warn('RSS 解析失败:', error);
    return [];
  }
}

/**
 * 生成新闻ID
 * @param {string} title - 标题
 * @param {string} link - 链接
 * @returns {string} 唯一ID
 */
function generateNewsId(title, link) {
  const raw = link || title || Math.random().toString();
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
