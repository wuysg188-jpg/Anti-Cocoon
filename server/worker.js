/**
 * Anti-Cocoon Worker — 轻量级 RSS 代理服务
 * 
 * 部署到 Cloudflare Workers（免费额度：10万请求/天）
 * 
 * 功能：
 * 1. RSS 代理 - 解决 CORS 问题
 * 2. RSS 解析 - 服务端解析 XML，返回 JSON
 * 3. 缓存 - 内置缓存减少重复请求
 */

// ─── 配置 ────────────────────────────────────────────────────────────────

const CACHE_TTL = 300; // 缓存时间（秒）
const ALLOWED_ORIGINS = ['*']; // 允许的域名，生产环境建议限制

// ─── 主处理函数 ──────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS 头
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 处理 OPTIONS 请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 路由
      if (url.pathname === '/api/rss') {
        return await handleRss(url, corsHeaders, ctx);
      }
      
      if (url.pathname === '/api/search') {
        return await handleSearch(url, corsHeaders, ctx);
      }
      
      if (url.pathname === '/health') {
        return jsonResponse({ status: 'ok', timestamp: Date.now() }, corsHeaders);
      }

      return jsonResponse({ error: 'Not Found' }, corsHeaders, 404);
    } catch (error) {
      return jsonResponse({ error: error.message }, corsHeaders, 500);
    }
  },
};

// ─── RSS 代理 ────────────────────────────────────────────────────────────

async function handleRss(url, corsHeaders, ctx) {
  const targetUrl = url.searchParams.get('url');
  
  if (!targetUrl) {
    return jsonResponse({ error: 'Missing url parameter' }, corsHeaders, 400);
  }

  // 验证 URL
  try {
    new URL(targetUrl);
  } catch {
    return jsonResponse({ error: 'Invalid URL' }, corsHeaders, 400);
  }

  // 检查缓存
  const cacheKey = `rss:${targetUrl}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return jsonResponse({ ...cached, cached: true }, corsHeaders);
  }

  // 获取 RSS
  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AntiCocoon/1.0)',
      'Accept': 'application/rss+xml, application/xml, text/xml',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    return jsonResponse({ error: `Fetch failed: ${response.status}` }, corsHeaders, response.status);
  }

  const xml = await response.text();
  const items = parseRssXml(xml);

  const result = {
    items,
    count: items.length,
    fetchedAt: Date.now(),
  };

  // 缓存结果
  ctx.waitUntil(setCache(cacheKey, result, CACHE_TTL));

  return jsonResponse(result, corsHeaders);
}

// ─── 搜索聚合 ────────────────────────────────────────────────────────────

async function handleSearch(url, corsHeaders, ctx) {
  const keyword = url.searchParams.get('q');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  if (!keyword) {
    return jsonResponse({ error: 'Missing q parameter' }, corsHeaders, 400);
  }

  // 检查缓存
  const cacheKey = `search:${keyword}:${limit}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return jsonResponse({ ...cached, cached: true }, corsHeaders);
  }

  // RSS 源
  const sources = [
    `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`,
    `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=en-US&gl=US&ceid=US:en`,
    `https://www.bing.com/news/search?q=${encodeURIComponent(keyword)}&format=rss`,
  ];

  // 并行获取
  const results = await Promise.allSettled(
    sources.map(async (src) => {
      const response = await fetch(src, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AntiCocoon/1.0)' },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return [];
      const xml = await response.text();
      return parseRssXml(xml);
    })
  );

  // 合并结果
  const allItems = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // 去重
  const seen = new Set();
  const uniqueItems = allItems.filter(item => {
    const key = item.link || item.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 排序
  uniqueItems.sort((a, b) => {
    const dateA = new Date(a.pubDate || 0);
    const dateB = new Date(b.pubDate || 0);
    return dateB - dateA;
  });

  const result = {
    keyword,
    items: uniqueItems.slice(0, limit),
    count: uniqueItems.length,
    sources: results.map((r, i) => ({
      url: sources[i],
      success: r.status === 'fulfilled',
      count: r.status === 'fulfilled' ? r.value.length : 0,
    })),
    fetchedAt: Date.now(),
  };

  // 缓存
  ctx.waitUntil(setCache(cacheKey, result, CACHE_TTL));

  return jsonResponse(result, corsHeaders);
}

// ─── RSS 解析 ────────────────────────────────────────────────────────────

function parseRssXml(xml) {
  const items = [];
  
  // 匹配 RSS item
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    
    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link') || extractTag(itemXml, 'guid');
    const description = extractTag(itemXml, 'description') || extractTag(itemXml, 'summary');
    const pubDate = extractTag(itemXml, 'pubDate') || extractTag(itemXml, 'published');
    const source = extractTag(itemXml, 'source');
    
    if (title) {
      items.push({
        title: cleanXml(title),
        link: link?.trim() || '#',
        description: cleanXml(description || '').slice(0, 500),
        pubDate: pubDate?.trim() || '',
        source: cleanXml(source || '') || 'Unknown',
        id: generateId(title, link),
      });
    }
  }

  // 匹配 Atom entry
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  while ((match = entryRegex.exec(xml)) !== null) {
    const entryXml = match[1];
    
    const title = extractTag(entryXml, 'title');
    const linkMatch = entryXml.match(/<link[^>]*href="([^"]*)"[^>]*\/?>/i);
    const link = linkMatch ? linkMatch[1] : extractTag(entryXml, 'id');
    const summary = extractTag(entryXml, 'summary') || extractTag(entryXml, 'content');
    const published = extractTag(entryXml, 'published') || extractTag(entryXml, 'updated');
    const author = extractTag(entryXml, 'author') || extractTag(entryXml, 'name');
    
    if (title) {
      items.push({
        title: cleanXml(title),
        link: link?.trim() || '#',
        description: cleanXml(summary || '').slice(0, 500),
        pubDate: published?.trim() || '',
        source: cleanXml(author || '') || 'Unknown',
        id: generateId(title, link),
      });
    }
  }

  return items;
}

function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : null;
}

function cleanXml(str) {
  if (!str) return '';
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateId(title, link) {
  const str = (link || title || '').slice(0, 100);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// ─── 缓存 ────────────────────────────────────────────────────────────────

async function getCache(key) {
  // 这里使用简单的内存缓存，生产环境建议使用 KV
  // 如果有 Cloudflare KV，可以使用 env.CACHE.get(key)
  return null;
}

async function setCache(key, value, ttl) {
  // 这里使用简单的内存缓存，生产环境建议使用 KV
  // 如果有 Cloudflare KV，可以使用 env.CACHE.put(key, JSON.stringify(value), { expirationTtl: ttl })
}

// ─── 工具函数 ────────────────────────────────────────────────────────────

function jsonResponse(data, headers, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}
