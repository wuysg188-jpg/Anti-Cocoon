/**
 * aiService.js
 * 核心数据与 AI 管线
 *
 * 功能：
 * 1. fetchLiveNews         — 通过 rss2json 代理 Google News RSS，绕过跨域
 * 2. fetchSingleModelInsight — 单模型 AI 深度分析，LocalStorage 防重复计费缓存
 * 3. fetchMultiModelInsights — 多模型并发交叉审查，Promise.allSettled 容错
 */

// ─── 常量 ─────────────────────────────────────────────────────────────────────

/**
 * allorigins.win — free CORS proxy that returns raw content of any URL.
 * We fetch the Google News RSS XML, then parse it client-side with DOMParser.
 *
 * Alternative proxy mirrors (if allorigins is down):
 *   https://corsproxy.io/?{encodedUrl}
 *   https://api.codetabs.com/v1/proxy?quest={url}
 */
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://api.allorigins.win/get?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://corsproxy.io/?'
];

// We use multiple URL formats for Google News to maximise hit rate
const GOOGLE_NEWS_RSS_URLS = [
  // English global (most reliable with CORS proxies)
  'https://news.google.com/rss/search?q={KEYWORD}&hl=en-US&gl=US&ceid=US:en',
  // Plain fallback
  'https://news.google.com/rss/search?q={KEYWORD}',
];

const CACHE_PREFIX = 'anti_cocoon_insight_';

/** 单次发送给 AI 的最大新闻文本字符数（防止 Token 爆炸） */
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
}

/**
 * 写入 LocalStorage 缓存
 * @param {string} key
 * @param {string} value
 */
function writeCache(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage full — silently fail
  }
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
function parseRssXml(xmlText, keyword) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'application/xml');

  // Check for parse errors
  const parseError = xml.querySelector('parsererror');
  if (parseError) {
    throw new Error('RSS 解析失败：格式错误');
  }

  const items = Array.from(xml.querySelectorAll('item'));
  if (items.length === 0) {
    throw new Error(`未找到「${keyword}」相关新闻，请尝试其他关键词`);
  }

  const channelTitle = xml.querySelector('channel > title')?.textContent || 'Google News';

  return items.map((item) => {
    const title = item.querySelector('title')?.textContent || '（无标题）';
    const link = item.querySelector('link')?.textContent
      || item.querySelector('guid')?.textContent || '#';
    const description = stripHtml(item.querySelector('description')?.textContent || '');
    const pubDate = item.querySelector('pubDate')?.textContent || '';
    const source = item.querySelector('source')?.textContent || channelTitle;

    const newsItem = {
      title,
      link,
      description,
      content: description,
      pubDate,
      author: source,
      sourceName: source,
      thumbnail: null,
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
  const rssUrls = GOOGLE_NEWS_RSS_URLS.map((t) =>
    t.replace('{KEYWORD}', encodeURIComponent(kw))
  );

  let lastError = null;

  // Waterfall through multiple proxies
  for (const proxyBase of CORS_PROXIES) {
    for (const rssUrl of rssUrls) {
      const proxyUrl = `${proxyBase}${encodeURIComponent(rssUrl)}`;
      try {
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: { 'Accept': '*/*' },
        });

        if (!response.ok) {
          lastError = new Error(`代理节点故障 (HTTP ${response.status})`);
          continue;
        }

        const text = await response.text();
        if (!text || text.trim().length === 0) {
          lastError = new Error('代理返回空白');
          continue;
        }

        // allorigins sometimes returns JSON wrapping the content
        let xmlText = text;
        if (text.trimStart().startsWith('{')) {
          try {
            const json = JSON.parse(text);
            xmlText = json.contents || json.data || text;
          } catch { /* use as text */ }
        }

        const items = parseRssXml(xmlText, kw);
        return items;
      } catch (err) {
        lastError = err;
        // Proceed to next combination
      }
    }
  }

  throw lastError || new Error(`所有情报节点尝试失败。请检查网络或更换关键词。`);
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
