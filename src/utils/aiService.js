/**
 * aiService.js — 核心数据与 AI 管线
 * 
 * V0.2.5 优化版：
 * - 多新闻源聚合
 * - 多代理并行请求
 * - 智能缓存
 * - 错误容错处理
 */

// ─── CORS 代理配置 ──────────────────────────────────────────────────────

const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://corsproxy.io/?',
  'https://api.rss2json.com/v1/api.json?rss_url=', // 备用 JSON 转换
];

// ─── 新闻源配置 ─────────────────────────────────────────────────────────

/**
 * 新闻源配置 - 按优先级排序
 * 优先级 1: 最可靠、更新最快
 * 优先级 2: 较可靠
 * 优先级 3: 备用源
 */
const NEWS_SOURCES = {
  // Google News - 中文简体
  google_zh: {
    name: 'Google 中文',
    icon: '🔍',
    rss: 'https://news.google.com/rss/search?q={KEYWORD}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
    priority: 1,
  },
  // Google News - 繁体中文
  google_tw: {
    name: 'Google 繁体',
    icon: '🔍',
    rss: 'https://news.google.com/rss/search?q={KEYWORD}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    priority: 1,
  },
  // Google News - 英文
  google_en: {
    name: 'Google 英文',
    icon: '🌐',
    rss: 'https://news.google.com/rss/search?q={KEYWORD}&hl=en-US&gl=US&ceid=US:en',
    priority: 1,
  },
  // Bing News - 中文
  bing_zh: {
    name: 'Bing 中文',
    icon: '🅱️',
    rss: 'https://www.bing.com/news/search?q={KEYWORD}&setlang=zh-CN&format=rss',
    priority: 2,
  },
  // Bing News - 英文
  bing_en: {
    name: 'Bing 英文',
    icon: '🅱️',
    rss: 'https://www.bing.com/news/search?q={KEYWORD}&format=rss',
    priority: 2,
  },
  // Yahoo News
  yahoo: {
    name: 'Yahoo',
    icon: '💜',
    rss: 'https://news.search.yahoo.com/rss?p={KEYWORD}',
    priority: 2,
  },
  // DuckDuckGo News (通过 Bing)
  duckduckgo: {
    name: 'DuckDuckGo',
    icon: '🦆',
    rss: 'https://rss.bing.com/search?q={KEYWORD}&format=rss',
    priority: 3,
  },
  // Reddit (科技相关)
  reddit: {
    name: 'Reddit',
    icon: '🤖',
    rss: 'https://www.reddit.com/search.rss?q={KEYWORD}&sort=new',
    priority: 3,
  },
};

// ─── 缓存配置 ───────────────────────────────────────────────────────────

const CACHE_PREFIX = 'anti_cocoon_insight_';
const NEWS_CACHE_PREFIX = 'anti_cocoon_news_';
const NEWS_CACHE_MAX_AGE = 10 * 60 * 1000; // 10分钟缓存（更短，保证新鲜）

/** 单次发送给 AI 的最大新闻文本字符数 */
const MAX_CONTENT_CHARS = 3000;

// ─── 辅助函数 ─────────────────────────────────────────────────────────────────

/**
 * 清洗 HTML 标签，返回纯文本
 * @param {string} html
 * @returns {string}
 */
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 截断字符串到指定最大长度
 * @param {string} str
 * @param {number} max
 * @returns {string}
 */
function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '… [内容已截断以节省 Token]' : str;
}

/**
 * 生成 LocalStorage 缓存键
 * @param {string} newsId
 * @param {string} modelKey
 * @returns {string}
 */
function cacheKey(newsId, modelKey) {
  return `${CACHE_PREFIX}${modelKey}_${newsId}`;
}

/**
 * 读取 LocalStorage 缓存
 * @param {string} key
 * @param {number} maxAgeHours - 最大缓存时间（小时），默认24小时
 * @returns {string|null}
 */
function readCache(key, maxAgeHours = 24) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    
    const entry = JSON.parse(raw);
    const ageHours = (Date.now() - entry.timestamp) / (1000 * 60 * 60);
    
    if (ageHours > maxAgeHours) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.content;
  } catch {
    return null;
  }
}

/**
 * 写入 LocalStorage 缓存
 * @param {string} key
 * @param {string} value
 */
function writeCache(key, value) {
  try {
    const cacheEntry = {
      content: value,
      timestamp: Date.now(),
      version: '1.0'
    };
    localStorage.setItem(key, JSON.stringify(cacheEntry));
  } catch {
    // Storage full — 尝试清理旧缓存
    clearOldestCache();
  }
}

/**
 * 清理最旧的缓存条目
 */
function clearOldestCache() {
  try {
    const entries = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        try {
          const entry = JSON.parse(localStorage.getItem(key));
          entries.push({ key, timestamp: entry.timestamp || 0 });
        } catch {}
      }
    }
    entries.sort((a, b) => a.timestamp - b.timestamp);
    // 删除最旧的 20%
    const toRemove = Math.ceil(entries.length * 0.2);
    entries.slice(0, toRemove).forEach(e => localStorage.removeItem(e.key));
  } catch {}
}

/**
 * 读取新闻缓存
 */
function readNewsCache(keyword) {
  try {
    const key = NEWS_CACHE_PREFIX + keyword.toLowerCase().trim();
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    
    const entry = JSON.parse(raw);
    const age = Date.now() - entry.timestamp;
    
    if (age > NEWS_CACHE_MAX_AGE) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.items;
  } catch {
    return null;
  }
}

/**
 * 写入新闻缓存
 */
function writeNewsCache(keyword, items) {
  try {
    const key = NEWS_CACHE_PREFIX + keyword.toLowerCase().trim();
    const entry = {
      items,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {}
}

/**
 * 为新闻条目生成唯一 ID（基于链接或标题哈希）
 * @param {{ link?: string, title?: string }} item
 * @returns {string}
 */
export function getNewsId(item) {
  const raw = item.link || item.title || Math.random().toString();
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

// ─── 系统 Prompt ──────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `你是一位拥有全球视野的高级产业情报分析师，专注于"去茧房"式深度解读。你的任务是对用户提供的新闻原文进行多维度分析，输出结构化 Markdown 报告。

必须严格遵循以下分析框架，不得省略任何章节：

## 🔍 核心事件解读
用2-3句话简洁概括事件的本质，剥离表象，直指核心。

## ⚙️ 底层逻辑拆解
深挖驱动此事件发生的深层原因（技术、经济、政策、地缘等），揭示冰山下的规律。

## 🌍 他山之石 · 横向对标
列举2-3个全球类似案例或先驱者，从横向比较中找到规律与差异，给出跨行业、跨地域的参照系。

## 🎯 个体生态位 · 机会与风险
对普通个体（职场人、创业者、投资者）而言：
- **机遇点**：具体可行动的机会是什么？
- **风险点**：哪些人/行业可能受到冲击？
- **行动建议**：给出1-2条具体的下一步行动建议。

## 📊 情报评级
- **信息可靠性**：⭐⭐⭐⭐⭐（1-5星）
- **影响烈度**：高 / 中 / 低
- **时效紧迫性**：24h内 / 本周 / 本月 / 长期布局`;

// ─── 1. 实时新闻抓取 ──────────────────────────────────────────────────────────

/**
 * 使用 DOMParser 解析 RSS XML 字符串，返回规范化的新闻条目数组。
 * @param {string} xmlText
 * @param {string} keyword  用于生成无结果时的错误消息
 * @returns {Array<object>}
 */
export function parseRssXml(xmlText, keyword) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'application/xml');

  // Check for parse errors
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
    return []; // 返回空数组而不是抛出错误
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
    
    const description = stripHtml(
      item.querySelector('description')?.textContent 
      || item.querySelector('summary')?.textContent 
      || item.querySelector('content')?.textContent
      || ''
    );
    
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

    const newsItem = {
      title,
      link,
      description: description.slice(0, 500), // 限制描述长度
      content: description.slice(0, 500),
      pubDate,
      author: source,
      sourceName: source,
      thumbnail,
    };

    return {
      ...newsItem,
      id: getNewsId(newsItem),
    };
  });
}

/**
 * 通过 allorigins.win CORS 代理抓取 Google News RSS，客户端 XML 解析
 * 自动尝试多个 RSS URL 格式以最大化成功率
 *
 * @param {string} keyword 搜索关键词
 * @returns {Promise<Array<object>>} 新闻条目数组
 */
export async function fetchLiveNews(keyword) {
  if (!keyword || !keyword.trim()) {
    throw new Error('请输入搜索关键词');
  }

  const kw = keyword.trim();

  // 检查缓存
  const cached = readNewsCache(kw);
  if (cached && cached.length > 0) {
    return cached;
  }

  const TIMEOUT_MS = 5000;

  // 带超时的 fetch
  const fetchWithTimeout = async (url, timeout) => {
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
  };

  // 尝试单个新闻源（使用多代理）
  const trySource = async (rssUrl, sourceName) => {
    // 并行尝试所有代理
    const proxyPromises = CORS_PROXIES.map(async (proxy) => {
      const proxyUrl = `${proxy}${encodeURIComponent(rssUrl)}`;
      const response = await fetchWithTimeout(proxyUrl, TIMEOUT_MS);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      if (!text || text.trim().length < 50) {
        throw new Error('空响应');
      }

      // 处理 JSON 包装的响应
      let xmlText = text;
      if (text.trimStart().startsWith('{')) {
        try {
          const json = JSON.parse(text);
          xmlText = json.contents || json.data || json.items || text;
        } catch { /* use as text */ }
      }

      const items = parseRssXml(xmlText, kw);
      return items.map(item => ({ ...item, sourceType: sourceName }));
    });

    // 返回第一个成功的代理结果
    const results = await Promise.allSettled(proxyPromises);
    const success = results.find(r => r.status === 'fulfilled');
    return success ? success.value : [];
  };

  // 构建请求列表
  const allRequests = [];
  
  for (const [key, source] of Object.entries(NEWS_SOURCES)) {
    const url = source.rss.replace('{KEYWORD}', encodeURIComponent(kw));
    allRequests.push(trySource(url, source.name));
  }

  // 并行请求所有新闻源
  const results = await Promise.all(allRequests);
  let allItems = results.flat();

  // 去重（基于标题相似度和链接）
  const seen = new Set();
  const uniqueItems = allItems.filter(item => {
    if (!item.title) return false;
    // 基于链接去重
    if (item.link && seen.has(item.link)) return false;
    // 基于标题前20字符去重
    const titleKey = item.title.slice(0, 20).toLowerCase();
    if (seen.has(titleKey)) return false;
    if (item.link) seen.add(item.link);
    seen.add(titleKey);
    return true;
  });

  // 按发布时间排序（最新的在前）
  uniqueItems.sort((a, b) => {
    const dateA = new Date(a.pubDate || 0);
    const dateB = new Date(b.pubDate || 0);
    return dateB - dateA;
  });

  // 只保留最新的 60 条
  const finalItems = uniqueItems.slice(0, 60);

  if (finalItems.length === 0) {
    throw new Error('未找到相关新闻，请尝试其他关键词');
  }

  // 缓存结果
  writeNewsCache(kw, finalItems);
  return finalItems;
}

// ─── 2. 单模型 AI 分析 ────────────────────────────────────────────────────────

/**
 * 调用单个 AI 模型对新闻进行深度分析
 * 包含 LocalStorage 缓存防重复计费
 *
 * @param {{
 *   newsItem: object,
 *   modelConfig: { name: string, apiKey: string, baseUrl: string, modelId: string }
 * }} params
 * @returns {Promise<string>} Markdown 格式分析结果
 */
export async function fetchSingleModelInsight({ newsItem, modelConfig }) {
  const { name, apiKey, baseUrl, modelId } = modelConfig;

  if (!apiKey || !apiKey.trim()) {
    throw new Error(`模型 "${name}" 的 API Key 未配置，请在设置中填写`);
  }
  if (!baseUrl || !baseUrl.trim()) {
    throw new Error(`模型 "${name}" 的 Base URL 未配置`);
  }

  // 检查缓存
  const key = cacheKey(newsItem.id, `${name}_${modelId}`);
  const cached = readCache(key);
  if (cached) {
    return cached;
  }

  // 组装新闻内容，HTML 清洗 + 截断
  const newsText = truncate(
    [
      `标题：${newsItem.title}`,
      `来源：${newsItem.sourceName || newsItem.author || '未知来源'}`,
      `发布时间：${newsItem.pubDate || '未知'}`,
      `摘要：${newsItem.description || ''}`,
      `正文：${newsItem.content || ''}`,
    ].join('\n'),
    MAX_CONTENT_CHARS
  );

  // 构建请求
  const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  const requestBody = {
    model: modelId,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `请对以下新闻进行深度分析，严格按照系统提示的框架输出 Markdown 报告：\n\n${newsText}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 2000,
    stream: false,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`;
    try {
      const errData = await response.json();
      errMsg = errData?.error?.message || errMsg;
    } catch {
      // ignore
    }
    throw new Error(`${name} API 请求失败: ${errMsg}`);
  }

  const data = await response.json();
  const result = data?.choices?.[0]?.message?.content;

  if (!result) {
    throw new Error(`${name} 返回了空响应，请检查模型配置`);
  }

  // 写入缓存
  writeCache(key, result);

  return result;
}

// ─── 3. 多模型并发交叉审查 ────────────────────────────────────────────────────

/**
 * 并发请求多个 AI 模型，使用 Promise.allSettled 确保一个模型报错不影响其他
 *
 * @param {{
 *   newsItem: object,
 *   modelConfigs: Array<{ name: string, apiKey: string, baseUrl: string, modelId: string }>
 * }} params
 * @returns {Promise<Array<{ modelName: string, status: 'fulfilled'|'rejected', content?: string, error?: string }>>}
 */
export async function fetchMultiModelInsights({ newsItem, modelConfigs }) {
  if (!modelConfigs || modelConfigs.length === 0) {
    throw new Error('没有已配置的模型，请至少配置一个 API Key');
  }

  const enabledConfigs = modelConfigs.filter(
    (m) => m.apiKey && m.apiKey.trim() && m.baseUrl && m.baseUrl.trim()
  );

  if (enabledConfigs.length === 0) {
    throw new Error('所有模型均未配置 API Key，请在设置中至少填写一个');
  }

  const promises = enabledConfigs.map((modelConfig) =>
    fetchSingleModelInsight({ newsItem, modelConfig })
  );

  const results = await Promise.allSettled(promises);

  return results.map((result, idx) => {
    const modelConfig = enabledConfigs[idx];
    if (result.status === 'fulfilled') {
      return {
        modelName: modelConfig.name,
        modelId: modelConfig.modelId,
        status: 'fulfilled',
        content: result.value,
      };
    } else {
      return {
        modelName: modelConfig.name,
        modelId: modelConfig.modelId,
        status: 'rejected',
        error: result.reason?.message || '未知错误',
      };
    }
  });
}

// ─── 4. 缓存管理工具 ─────────────────────────────────────────────────────────

/**
 * 清除所有 Anti-Cocoon 相关缓存
 * @returns {number} 已删除条数
 */
export function clearAllInsightCache() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
  return keysToRemove.length;
}

/**
 * 统计缓存条数
 * @returns {number}
 */
export function countCachedInsights() {
  let count = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(CACHE_PREFIX)) count++;
  }
  return count;
}

// ─── 每日热门新闻 ──────────────────────────────────────────────────────

const TRENDING_CACHE_KEY = 'anti_cocoon_trending';
const TRENDING_CACHE_MAX_AGE = 30 * 60 * 1000; // 30分钟缓存

/**
 * 各分类热榜配置（预设热门话题）
 */
const TRENDING_CATEGORIES = [
  {
    id: 'tech',
    name: '科技热榜',
    icon: '💻',
    color: '#4285F4',
    keywords: ['AI', 'ChatGPT', '芯片', '半导体', '人工智能'],
  },
  {
    id: 'finance',
    name: '财经热榜',
    icon: '💰',
    color: '#34A853',
    keywords: ['A股', '港股', '美股', '比特币', '央行'],
  },
  {
    id: 'auto',
    name: '汽车热榜',
    icon: '🚗',
    color: '#EA4335',
    keywords: ['特斯拉', '比亚迪', '新能源汽车', '自动驾驶', '小米汽车'],
  },
  {
    id: 'global',
    name: '国际热榜',
    icon: '🌍',
    color: '#FBBC05',
    keywords: ['美国', '日本', '欧洲', '中东', '俄乌'],
  },
];

/**
 * 读取热门新闻缓存
 */
function readTrendingCache() {
  try {
    const raw = localStorage.getItem(TRENDING_CACHE_KEY);
    if (!raw) return null;
    
    const entry = JSON.parse(raw);
    const age = Date.now() - entry.timestamp;
    
    if (age > TRENDING_CACHE_MAX_AGE) {
      localStorage.removeItem(TRENDING_CACHE_KEY);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * 写入热门新闻缓存
 */
function writeTrendingCache(data) {
  try {
    const entry = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(TRENDING_CACHE_KEY, JSON.stringify(entry));
  } catch {}
}

/**
 * 获取单个RSS源的新闻
 */
async function fetchSingleFeed(rssUrl, sourceName) {
  const TIMEOUT_MS = 5000;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    const proxyUrl = `${CORS_PROXIES[0]}${encodeURIComponent(rssUrl)}`;
    
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: { 'Accept': '*/*' },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return [];
    
    const text = await response.text();
    if (!text) return [];
    
    let xmlText = text;
    if (text.trimStart().startsWith('{')) {
      try {
        const json = JSON.parse(text);
        xmlText = json.contents || json.data || text;
      } catch {}
    }
    
    const items = parseRssXml(xmlText, '');
    return items.slice(0, 10); // 每个源取前10条
  } catch {
    return [];
  }
}

/**
 * 获取各分类热榜
 * @returns {Promise<Array>} 各分类的热榜数据
 */
export async function fetchTrendingNews() {
  // 检查缓存
  const cached = readTrendingCache();
  if (cached) {
    return cached;
  }

  // 预设热门话题（作为备用）
  const fallbackData = [
    {
      id: 'tech',
      name: '科技热榜',
      icon: '💻',
      color: '#4285F4',
      news: [
        { title: 'ChatGPT', sourceName: 'AI' },
        { title: '人工智能', sourceName: 'AI' },
        { title: '芯片半导体', sourceName: '科技' },
        { title: '苹果 iPhone', sourceName: '科技' },
        { title: '华为', sourceName: '科技' },
      ],
    },
    {
      id: 'finance',
      name: '财经热榜',
      icon: '💰',
      color: '#34A853',
      news: [
        { title: 'A股行情', sourceName: '财经' },
        { title: '比特币', sourceName: '加密货币' },
        { title: '央行利率', sourceName: '财经' },
        { title: '茅台股价', sourceName: '个股' },
        { title: '房地产', sourceName: '财经' },
      ],
    },
    {
      id: 'auto',
      name: '汽车热榜',
      icon: '🚗',
      color: '#EA4335',
      news: [
        { title: '特斯拉', sourceName: '汽车' },
        { title: '比亚迪', sourceName: '汽车' },
        { title: '新能源汽车', sourceName: '汽车' },
        { title: '小米汽车', sourceName: '汽车' },
        { title: '自动驾驶', sourceName: '科技' },
      ],
    },
    {
      id: 'global',
      name: '国际热榜',
      icon: '🌍',
      color: '#FBBC05',
      news: [
        { title: '美国大选', sourceName: '国际' },
        { title: '日本经济', sourceName: '国际' },
        { title: '欧洲局势', sourceName: '国际' },
        { title: '中东冲突', sourceName: '国际' },
        { title: '俄乌战争', sourceName: '国际' },
      ],
    },
  ];

  // 尝试从在线获取
  try {
    // 为每个分类获取新闻
    const promises = TRENDING_CATEGORIES.map(async (category) => {
      const keyword = category.keywords[0]; // 使用第一个关键词
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const proxyUrl = `${CORS_PROXIES[0]}${encodeURIComponent(
          `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`
        )}`;
        
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: { 'Accept': '*/*' },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error('请求失败');
        
        const text = await response.text();
        if (!text) throw new Error('空响应');
        
        let xmlText = text;
        if (text.trimStart().startsWith('{')) {
          try {
            const json = JSON.parse(text);
            xmlText = json.contents || json.data || text;
          } catch {}
        }
        
        const items = parseRssXml(xmlText, keyword);
        if (items.length === 0) throw new Error('无数据');
        
        return {
          ...category,
          news: items.slice(0, 10),
        };
      } catch (err) {
        // 返回备用数据
        const fallback = fallbackData.find(f => f.id === category.id);
        return fallback || {
          ...category,
          news: [],
        };
      }
    });

    const results = await Promise.all(promises);
    const validResults = results.filter(r => r.news && r.news.length > 0);
    
    if (validResults.length > 0) {
      writeTrendingCache(validResults);
      return validResults;
    }
  } catch (err) {
    console.warn('获取在线热榜失败，使用备用数据:', err);
  }

  // 如果在线获取失败，返回备用数据
  writeTrendingCache(fallbackData);
  return fallbackData;
}

/**
 * 获取热门搜索关键词
 * @returns {Array<string>}
 */
export function getHotKeywords() {
  return [
    '人工智能', 'ChatGPT', '芯片', '新能源汽车',
    'A股', '港股', '美股', '比特币',
    '特斯拉', '苹果', '华为', '小米',
    '半导体', '光伏', '锂电', '医药',
  ];
}
