/**
 * config/index.js — 项目配置文件
 */

// ─── CORS 代理配置 ──────────────────────────────────────────────────────

export const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://corsproxy.io/?',
];

// ─── 缓存配置 ───────────────────────────────────────────────────────────

export const CACHE_CONFIG = {
  news: {
    prefix: 'anti_cocoon_news_',
    maxAge: 10 * 60 * 1000, // 10分钟
  },
  insight: {
    prefix: 'anti_cocoon_insight_',
    maxAge: 24 * 60 * 60 * 1000, // 24小时
  },
  trending: {
    prefix: 'anti_cocoon_trending_',
    maxAge: 30 * 60 * 1000, // 30分钟
  },
  bookmarks: {
    key: 'anti_cocoon_bookmarks',
  },
  models: {
    key: 'anti_cocoon_models',
  },
  theme: {
    key: 'anti_cocoon_theme',
  },
};

// ─── 新闻源配置 ─────────────────────────────────────────────────────────

export const NEWS_SOURCES = {
  // 国际源
  google_zh: {
    name: 'Google 中文',
    icon: '🔍',
    rss: 'https://news.google.com/rss/search?q={KEYWORD}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
    priority: 1,
  },
  google_tw: {
    name: 'Google 繁体',
    icon: '🔍',
    rss: 'https://news.google.com/rss/search?q={KEYWORD}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    priority: 1,
  },
  google_en: {
    name: 'Google 英文',
    icon: '🌐',
    rss: 'https://news.google.com/rss/search?q={KEYWORD}&hl=en-US&gl=US&ceid=US:en',
    priority: 1,
  },
  bing_zh: {
    name: 'Bing 中文',
    icon: '🅱️',
    rss: 'https://www.bing.com/news/search?q={KEYWORD}&setlang=zh-CN&format=rss',
    priority: 2,
  },
  bing_en: {
    name: 'Bing 英文',
    icon: '🅱️',
    rss: 'https://www.bing.com/news/search?q={KEYWORD}&format=rss',
    priority: 2,
  },
  yahoo: {
    name: 'Yahoo',
    icon: '💜',
    rss: 'https://news.search.yahoo.com/rss?p={KEYWORD}',
    priority: 2,
  },
  duckduckgo: {
    name: 'DuckDuckGo',
    icon: '🦆',
    rss: 'https://rss.bing.com/search?q={KEYWORD}&format=rss',
    priority: 3,
  },
  reddit: {
    name: 'Reddit',
    icon: '🤖',
    rss: 'https://www.reddit.com/search.rss?q={KEYWORD}&sort=new',
    priority: 3,
  },
};

// ─── 热榜配置 ───────────────────────────────────────────────────────────

export const TRENDING_SOURCES = [
  { id: 'google', name: 'Google 热榜', icon: '🔍', url: 'https://news.google.com/rss?hl=zh-CN&gl=CN&ceid=CN:zh-Hans' },
  { id: 'google_tech', name: '科技热榜', icon: '💻', url: 'https://news.google.com/rss/search?q=科技+AI&hl=zh-CN&gl=CN&ceid=CN:zh-Hans' },
  { id: 'google_finance', name: '财经热榜', icon: '💰', url: 'https://news.google.com/rss/search?q=股票+财经&hl=zh-CN&gl=CN&ceid=CN:zh-Hans' },
  { id: 'google_world', name: '国际热榜', icon: '🌍', url: 'https://news.google.com/rss/search?q=国际+世界&hl=en-US&gl=US&ceid=US:en' },
];

// ─── 分类配置 ───────────────────────────────────────────────────────────

export const CATEGORIES = [
  { id: 'semiconductor', label: '半导体', icon: '🔲', keywords: /\b(chip|semiconductor|wafer|foundry|TSMC|Intel|AMD|NVIDIA|芯片|半导体|晶圆|台积电)\b/i },
  { id: 'ai_software', label: '人工智能', icon: '🤖', keywords: /\b(AI|artificial intelligence|machine learning|deep learning|GPT|LLM|人工智能|机器学习|深度学习|大模型)\b/i },
  { id: 'biotech', label: '生物科技', icon: '🧬', keywords: /\b(biotech|CRISPR|gene|mRNA|vaccine|pharma|生物科技|基因|疫苗|制药|医药)\b/i },
  { id: 'energy', label: '新能源', icon: '🔋', keywords: /\b(energy|solar|battery|EV|lithium|hydrogen|能源|光伏|电池|新能源|锂电|氢能)\b/i },
  { id: 'aerospace', label: '航天', icon: '🚀', keywords: /\b(space|rocket|satellite|NASA|SpaceX|航天|火箭|卫星|太空)\b/i },
  { id: 'geopolitics', label: '地缘政治', icon: '🗺️', keywords: /\b(geopolitics|sanctions|diplomacy|tariff|trade war|地缘|制裁|外交|贸易战|关税)\b/i },
  { id: 'economy', label: '经济', icon: '📈', keywords: /\b(GDP|inflation|interest rate|central bank|Fed|ECB|经济|通胀|利率|央行|美联储)\b/i },
  { id: 'crypto', label: '加密货币', icon: '₿', keywords: /\b(crypto|bitcoin|BTC|ethereum|ETH|blockchain|Web3|加密|比特币|以太坊|区块链)\b/i },
  { id: 'health', label: '健康', icon: '🏥', keywords: /\b(health|hospital|disease|pandemic|COVID|健康|医院|疾病|疫情)\b/i },
  { id: 'entertainment', label: '娱乐', icon: '🎬', keywords: /\b(movie|film|music|game|Netflix|Disney|电影|音乐|游戏|综艺)\b/i },
];

// ─── 错误消息配置 ───────────────────────────────────────────────────────

export const ERROR_MESSAGES = {
  'Failed to fetch': {
    title: '网络连接失败',
    description: '请检查您的网络连接，然后重试',
    action: '重试',
  },
  'NetworkError': {
    title: '网络连接失败',
    description: '请检查您的网络连接，然后重试',
    action: '重试',
  },
  'TimeoutError': {
    title: '请求超时',
    description: '服务器响应时间过长，请稍后重试',
    action: '重试',
  },
  '代理节点故障': {
    title: '服务暂时不可用',
    description: '我们正在尝试其他数据源，请稍候',
    action: '重试',
  },
  'API Key 未配置': {
    title: '需要配置 AI 模型',
    description: '点击右上角设置图标，添加您的 API 密钥',
    action: '前往设置',
  },
  'API 请求失败': {
    title: 'AI 分析失败',
    description: '请检查 API 密钥是否正确，或尝试其他模型',
    action: '查看设置',
  },
  '所有代理节点尝试失败': {
    title: '数据源不可用',
    description: '暂时无法获取新闻数据，请稍后再试',
    action: '重试',
  },
  '未找到相关新闻': {
    title: '没有找到相关内容',
    description: '请尝试其他关键词，或检查拼写是否正确',
    action: '重试',
  },
};

// ─── 默认模型配置 ───────────────────────────────────────────────────────

export const DEFAULT_MODELS = [
  {
    id: 'openai-gpt4',
    name: 'GPT-4 (OpenAI)',
    modelId: 'gpt-4',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    modelId: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
  },
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    modelId: 'claude-3-opus-20240229',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKey: '',
  },
];

// ─── 系统提示词 ─────────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `你是一位拥有全球视野的高级产业情报分析师，专注于"去茧房"式深度解读。你的任务是对用户提供的新闻原文进行多维度分析，输出结构化 Markdown 报告。

必须严格遵循以下分析框架，不得省略任何章节：

## 🔍 核心事件解读
用2-3句话简洁概括事件的本质，剥离表象，直指核心。

## ⚙️ 底层逻辑拆解
深挖驱动此事件发生的深层原因（技术、经济、政策、地缘等），揭示冰山下的规律。

## 🌍 他山之石 · 横向对标
找出历史上或国际上 1-2 个相似案例进行对比分析，提供参考坐标。

## 🧭 个体生态位分析
从不同立场（如：消费者/投资者/从业者/普通公民）分析此事件的影响，避免单一视角。

## 📊 情报评级
- **置信度**: ⭐⭐⭐⭐⭐ (1-5星)
- **影响半径**: 本地/区域/国家/全球
- **时效性**: 短期(<1周)/中期(1-3月)/长期(>1年)
- **建议关注指数**: 1-10`;

// ─── AI分析配置 ─────────────────────────────────────────────────────────

export const AI_CONFIG = {
  maxContentChars: 3000, // 单次发送给AI的最大字符数
  timeout: 60000, // API请求超时时间（毫秒）
  maxRetries: 2, // 最大重试次数
};
