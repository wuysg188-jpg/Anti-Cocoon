/**
 * Anti-Cocoon Worker v2 — 边缘节点 XML 解析
 * 
 * 功能：
 * 1. RSS 代理 + XML -> JSON 解析（边缘节点完成）
 * 2. 搜索聚合
 * 3. 缓存优化
 */

export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 健康检查
      if (url.pathname === '/health') {
        return json({ status: 'ok', time: Date.now(), version: '2.0' }, corsHeaders);
      }

      // RSS 代理（返回 JSON）
      if (url.pathname === '/rss') {
        const targetUrl = url.searchParams.get('url');
        if (!targetUrl) {
          return json({ error: 'Missing url parameter' }, corsHeaders, 400);
        }
        
        const result = await fetchAndParseRSS(targetUrl);
        return json(result, corsHeaders);
      }

      // 批量 RSS 请求
      if (url.pathname === '/batch') {
        const urls = url.searchParams.get('urls');
        if (!urls) {
          return json({ error: 'Missing urls parameter' }, corsHeaders, 400);
        }
        
        const urlList = urls.split(',').slice(0, 10); // 限制最多10个
        const results = await Promise.allSettled(
          urlList.map(u => fetchAndParseRSS(decodeURIComponent(u)))
        );
        
        const data = results.map((r, i) => ({
          url: urlList[i],
          success: r.status === 'fulfilled',
          items: r.status === 'fulfilled' ? r.value.items : [],
          error: r.status === 'rejected' ? r.reason.message : null,
        }));
        
        return json({ results: data }, corsHeaders);
      }

      // 搜索聚合
      if (url.pathname === '/search') {
        const keyword = url.searchParams.get('q');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        
        if (!keyword) {
          return json({ error: 'Missing q parameter' }, corsHeaders, 400);
        }
        
        const sources = [
          `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`,
          `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=en-US&gl=US&ceid=US:en`,
        ];
        
        const results = await Promise.allSettled(
          sources.map(s => fetchAndParseRSS(s))
        );
        
        // 合并去重
        const allItems = results
          .filter(r => r.status === 'fulfilled')
          .flatMap(r => r.value.items);
        
        const seen = new Set();
        const unique = allItems.filter(item => {
          const key = item.link || item.title;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        
        unique.sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
        
        return json({
          keyword,
          items: unique.slice(0, limit),
          count: unique.length,
        }, corsHeaders);
      }

      return json({ error: 'Not Found', path: url.pathname }, corsHeaders, 404);
    } catch (error) {
      return json({ error: error.message }, corsHeaders, 500);
    }
  }
};

// ─── RSS 获取和解析 ──────────────────────────────────────────────────────

async function fetchAndParseRSS(targetUrl) {
  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AntiCocoon/2.0)',
      'Accept': 'application/rss+xml, application/xml, text/xml',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status}`);
  }

  const xml = await response.text();
  const items = parseRSS(xml);

  return {
    items,
    count: items.length,
    fetchedAt: Date.now(),
  };
}

// ─── 轻量级 XML 解析 ────────────────────────────────────────────────────

function parseRSS(xml) {
  const items = [];

  // 解析 RSS item
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    const item = {
      title: extractTag(content, 'title'),
      link: extractTag(content, 'link') || extractTag(content, 'guid'),
      description: cleanHtml(extractTag(content, 'description') || ''),
      pubDate: extractTag(content, 'pubDate'),
      source: extractTag(content, 'source'),
      id: generateId(content),
    };
    
    if (item.title) {
      items.push(item);
    }
  }

  // 解析 Atom entry
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  while ((match = entryRegex.exec(xml)) !== null) {
    const content = match[1];
    const linkMatch = content.match(/<link[^>]*href="([^"]*)"/);
    
    const item = {
      title: extractTag(content, 'title'),
      link: linkMatch ? linkMatch[1] : extractTag(content, 'id'),
      description: cleanHtml(extractTag(content, 'summary') || extractTag(content, 'content') || ''),
      pubDate: extractTag(content, 'published') || extractTag(content, 'updated'),
      source: extractTag(content, 'author') || extractTag(content, 'name'),
      id: generateId(content),
    };
    
    if (item.title) {
      items.push(item);
    }
  }

  return items;
}

function extractTag(xml, tag) {
  // 支持 CDATA
  const regex = new RegExp(`<${tag}[^>]*>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))\\s*<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? (match[1] || match[2] || '').trim() : '';
}

function cleanHtml(str) {
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

function generateId(content) {
  const str = (content || '').slice(0, 200);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// ─── 工具函数 ────────────────────────────────────────────────────────────

function json(data, headers, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}
