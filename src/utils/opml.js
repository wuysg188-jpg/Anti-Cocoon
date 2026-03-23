/**
 * opml.js — OPML 订阅源管理
 * 
 * 支持导入/导出 OPML 格式的 RSS 订阅源
 * 让用户完全掌控数据源
 */

// ─── 默认订阅源 ──────────────────────────────────────────────────────────

export const DEFAULT_FEEDS = [
  { name: 'Google News 中文', url: 'https://news.google.com/rss?hl=zh-CN&gl=CN&ceid=CN:zh-Hans', category: '综合' },
  { name: 'Google News 英文', url: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en', category: '综合' },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', category: '科技' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: '科技' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: '科技' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: '科技' },
  { name: '36氪', url: 'https://36kr.com/feed', category: '科技' },
  { name: '少数派', url: 'https://sspai.com/feed', category: '科技' },
  { name: 'IT之家', url: 'https://www.ithome.com/rss/', category: '科技' },
  { name: 'BBC 中文', url: 'https://feeds.bbci.co.uk/zhongwen/simp/rss.xml', category: '新闻' },
  { name: 'Reuters', url: 'https://www.reutersagency.com/feed/', category: '新闻' },
];

// ─── OPML 解析 ───────────────────────────────────────────────────────────

/**
 * 解析 OPML 文件内容
 * @param {string} opmlContent - OPML XML 内容
 * @returns {Array} 订阅源列表
 */
export function parseOPML(opmlContent) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(opmlContent, 'application/xml');
  
  const feeds = [];
  
  // 递归解析 outline 元素
  function parseOutline(element, parentCategory = '') {
    const children = element.querySelectorAll(':scope > outline');
    
    children.forEach(child => {
      const type = child.getAttribute('type');
      const xmlUrl = child.getAttribute('xmlUrl');
      const htmlUrl = child.getAttribute('htmlUrl');
      const title = child.getAttribute('title') || child.getAttribute('text') || '';
      const category = parentCategory || child.getAttribute('title') || child.getAttribute('text') || '';
      
      if (xmlUrl && (type === 'rss' || type === 'atom' || xmlUrl.includes('rss') || xmlUrl.includes('feed'))) {
        feeds.push({
          name: title,
          url: xmlUrl,
          htmlUrl: htmlUrl || '',
          category: category,
        });
      } else if (child.children.length > 0) {
        // 这是一个分类文件夹
        const folderName = child.getAttribute('title') || child.getAttribute('text') || '';
        parseOutline(child, folderName);
      }
    });
  }
  
  const body = doc.querySelector('body');
  if (body) {
    parseOutline(body);
  }
  
  return feeds;
}

// ─── OPML 生成 ───────────────────────────────────────────────────────────

/**
 * 生成 OPML 文件内容
 * @param {Array} feeds - 订阅源列表
 * @param {string} title - OPML 标题
 * @returns {string} OPML XML 内容
 */
export function generateOPML(feeds, title = 'Anti-Cocoon Subscriptions') {
  // 按分类分组
  const grouped = {};
  feeds.forEach(feed => {
    const category = feed.category || '未分类';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(feed);
  });
  
  // 生成 outline
  let outlines = '';
  for (const [category, categoryFeeds] of Object.entries(grouped)) {
    outlines += `    <outline text="${escapeXml(category)}" title="${escapeXml(category)}">\n`;
    categoryFeeds.forEach(feed => {
      outlines += `      <outline type="rss" text="${escapeXml(feed.name)}" title="${escapeXml(feed.name)}" xmlUrl="${escapeXml(feed.url)}" htmlUrl="${escapeXml(feed.htmlUrl || '')}" />\n`;
    });
    outlines += `    </outline>\n`;
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>${escapeXml(title)}</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
  </head>
  <body>
${outlines}  </body>
</opml>`;
}

// ─── XML 转义 ────────────────────────────────────────────────────────────

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ─── 文件操作 ────────────────────────────────────────────────────────────

/**
 * 导出 OPML 文件
 * @param {Array} feeds - 订阅源列表
 * @param {string} filename - 文件名
 */
export function exportOPML(feeds, filename = 'anti-cocoon-feeds.opml') {
  const content = generateOPML(feeds);
  const blob = new Blob([content], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 导入 OPML 文件
 * @param {File} file - OPML 文件
 * @returns {Promise<Array>} 解析后的订阅源列表
 */
export function importOPML(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const feeds = parseOPML(e.target.result);
        resolve(feeds);
      } catch (err) {
        reject(new Error('OPML 文件解析失败: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

// ─── 存储管理 ────────────────────────────────────────────────────────────

const FEEDS_STORAGE_KEY = 'anti_cocoon_feeds';

/**
 * 保存订阅源到本地
 * @param {Array} feeds - 订阅源列表
 */
export function saveFeeds(feeds) {
  try {
    localStorage.setItem(FEEDS_STORAGE_KEY, JSON.stringify(feeds));
  } catch (e) {
    console.warn('保存订阅源失败:', e);
  }
}

/**
 * 从本地加载订阅源
 * @returns {Array} 订阅源列表
 */
export function loadFeeds() {
  try {
    const saved = localStorage.getItem(FEEDS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('加载订阅源失败:', e);
  }
  return DEFAULT_FEEDS;
}
