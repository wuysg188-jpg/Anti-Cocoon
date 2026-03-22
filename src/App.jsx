/**
 * App.jsx — Anti-Cocoon AI · 跨界情报看板 v2
 *
 * 设计理念：Editorial Intelligence Terminal
 * ─ 放弃泛化"AI感"紫色系，转向琥珀/石板色系
 * ─ 排版驱动：信息密度高，对比清晰，有情报终端的紧张感
 * ─ 每张卡片是一份"情报简报"，而非普通博客列表
 * ─ 新增：实时热度跑马灯、情报分类统计热力图、阅读清单
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Search, Settings, X, ExternalLink, RefreshCw, Clock, Globe,
  ChevronRight, Trash2, Eye, EyeOff, BrainCircuit, Sparkles,
  TrendingUp, Database, AlertCircle, CheckCircle2, Layers,
  BookMarked, ScanSearch, Filter, Rss, Zap, Sun, Moon,
} from 'lucide-react';
import TranslateWidget from './components/TranslateWidget.jsx';
import { CATEGORIES, classifyNewsItems, groupByCategory } from './utils/classifier.js';
import {
  fetchLiveNews,
  fetchSingleModelInsight,
  fetchMultiModelInsights,
  clearAllInsightCache,
  countCachedInsights,
  fetchTrendingNews,
  getHotKeywords,
  parseRssXml,
} from './utils/aiService.js';
import { detectStockCode, getAllStocks } from './utils/stockCodes.js';

// ─── 错误消息映射 ───────────────────────────────────────────────────────────
const ERROR_MESSAGES = {
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
};

// ─── 默认模型配置 ─────────────────────────────────────────────────────────────

const DEFAULT_MODEL_CONFIGS = [
  {
    id: 'custom-1',
    name: '自定义模型 1',
    modelId: '',
    baseUrl: '',
    apiKey: '',
  },
];

const MODEL_THEME_COLORS = [
  { text: 'text-emerald-400', bg: 'bg-emerald-400' },
  { text: 'text-indigo-400',  bg: 'bg-indigo-400' },
  { text: 'text-amber-400',   bg: 'bg-amber-400' },
  { text: 'text-rose-400',    bg: 'bg-rose-400' },
  { text: 'text-sky-400',     bg: 'bg-sky-400' },
  { text: 'text-fuchsia-400', bg: 'bg-fuchsia-400' },
];

const STORAGE_KEY_MODELS = 'anti_cocoon_model_configs';
const STORAGE_KEY_BOOKMARKS = 'anti_cocoon_bookmarks';

// ─── 热门搜索词 ───────────────────────────────────────────────────────────────

const TICKER_TOPICS = [
  'Nvidia', 'TSMC', 'DeepSeek', 'SpaceX', 'CRISPR', 'BYD',
  'Quantum Computing', 'Nuclear Fusion', '供应链', 'OpenAI',
  '新能源', '半导体', 'Robotics', 'GLP-1', 'Bitcoin ETF', 'ASML',
];

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

function loadModelConfigs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MODELS);
    if (!raw) return DEFAULT_MODEL_CONFIGS;
    const saved = JSON.parse(raw);
    return DEFAULT_MODEL_CONFIGS.map((def) => {
      const match = saved.find((s) => s.id === def.id);
      return match ? { ...def, ...match } : def;
    });
  } catch { return DEFAULT_MODEL_CONFIGS; }
}

function saveModelConfigs(configs) {
  try { localStorage.setItem(STORAGE_KEY_MODELS, JSON.stringify(configs)); } catch {}
}

function loadBookmarks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_BOOKMARKS) || '[]'); } catch { return []; }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const now = new Date();
    const diff = now - d;
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const day = Math.floor(diff / 86400000);
    if (m < 2) return '刚刚';
    if (m < 60) return `${m}分钟`;
    if (h < 24) return `${h}小时`;
    if (day < 7) return `${day}天`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

// ─── 骨架屏 ──────────────────────────────────────────────────────────────────

function Skeleton({ w = 'full', h = 3 }) {
  // 将w参数转换为实际宽度值
  const widthMap = {
    'full': '100%',
    '24': '6rem',
    '16': '4rem', 
    '10': '2.5rem',
    '5/6': '83.333%',
    '4/6': '66.667%',
    '4/5': '80%',
  };
  const width = widthMap[w] || w;
  
  return (
    <div 
      className="skeleton rounded" 
      style={{ width, height: `${h * 4}px` }} 
    />
  );
}

function SkeletonCard() {
  return (
    <div className="card-surface rounded-2xl p-4 space-y-3">
      <div className="flex justify-between">
        <Skeleton w="24" h="3" />
        <Skeleton w="10" h="3" />
      </div>
      <Skeleton w="16" h="3" />
      <Skeleton w="full" h="4" />
      <Skeleton w="5/6" h="4" />
      <Skeleton w="4/6" h="4" />
      <div className="skeleton rounded w-full h-3 mt-1" />
      <div className="skeleton rounded w-4/5 h-3" />
      <div className="flex gap-2 pt-2">
        <div className="skeleton rounded-lg flex-1 h-8" />
        <div className="skeleton rounded-lg flex-1 h-8" />
      </div>
    </div>
  );
}

function SkeletonInsight({ lines = 10 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton rounded h-3.5" style={{ width: `${55 + (i % 4) * 12}%` }} />
      ))}
    </div>
  );
}

// ─── 情报卡片 ─────────────────────────────────────────────────────────────────

function NewsCard({ item, index = 0, onSingle, onMulti, bookmarked, onToggleBookmark }) {
  const catDef = CATEGORIES.find((c) => c.id === item.categoryId);

  return (
    <article className={`card-surface rounded-2xl p-4 flex flex-col gap-3 group stagger-enter stagger-delay-${(index % 12) + 1}`}>
      {/* 元信息行 */}
      <div className="flex items-center justify-between text-2xs text-slate-500">
        <span className="flex items-center gap-1.5 min-w-0">
          <Globe size={10} className="shrink-0 text-slate-600" />
          <span className="truncate max-w-[110px]">{item.sourceName || item.author || '—'}</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {formatDate(item.pubDate)}
          </span>
          {/* 书签按钮 */}
          <button
            onClick={() => onToggleBookmark(item)}
            className={`transition-colors ${bookmarked ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'}`}
            title={bookmarked ? '移出阅读清单' : '加入阅读清单'}
          >
            <BookMarked size={11} />
          </button>
        </div>
      </div>

      {/* 分类标签 */}
      {catDef && (
        <span className="cat-chip self-start">
          {catDef.icon} {catDef.label}
        </span>
      )}

      {/* 标题 */}
      <h3 className="text-sm font-semibold leading-snug text-slate-100 line-clamp-3 group-hover:text-amber-100 transition-colors flex-1">
        {item.title}
      </h3>

      {/* 摘要 */}
      {item.description && (
        <p className="text-2xs text-slate-500 leading-relaxed line-clamp-3">
          {item.description}
        </p>
      )}

      {/* 操作 */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSingle(item)}
          className="btn-amber flex-1 flex items-center justify-center gap-1.5 text-2xs font-semibold rounded-lg px-2 py-2"
        >
          <BrainCircuit size={11} />
          深度解读
        </button>
        <button
          onClick={() => onMulti(item)}
          className="btn-fire flex-1 flex items-center justify-center gap-1.5 text-2xs font-semibold rounded-lg px-2 py-2"
        >
          <Sparkles size={11} />
          🔥 三方审查
        </button>
      </div>

      {/* 原文链接 */}
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className="self-end text-2xs text-slate-600 hover:text-amber-500 transition-colors flex items-center gap-1"
      >
        <ExternalLink size={9} />
        原文
      </a>
    </article>
  );
}

// ─── API 配置模态框 ───────────────────────────────────────────────────────────

function ApiModal({ configs, onSave, onClose }) {
  const [local, setLocal] = useState(configs.map((c) => ({ ...c })));
  const [showKey, setShowKey] = useState({});
  const [cacheCount, setCacheCount] = useState(countCachedInsights);

  // ESC键关闭模态框
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const update = (id, field, val) =>
    setLocal((p) => p.map((c) => (c.id === id ? { ...c, [field]: val } : c)));

  const handleAdd = () => {
    const newId = `custom-${Date.now()}`;
    setLocal((p) => [
      ...p,
      {
        id: newId,
        name: `自定义模型 ${p.length + 1}`,
        modelId: '',
        baseUrl: '',
        apiKey: '',
      },
    ]);
  };

  const handleRemove = (id) => {
    if (local.length <= 1) return; // 至少保留一个
    setLocal((p) => p.filter((c) => c.id !== id));
  };

  const handleClearCache = () => {
    const n = clearAllInsightCache();
    setCacheCount(0);
    alert(`已清除 ${n} 条缓存`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative intel-panel rounded-2xl w-full max-w-xl max-h-[88vh] overflow-y-auto animate-slide-up">

        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-white/6 bg-ink-900 z-10">
          <div>
            <h2 className="font-semibold text-slate-100 text-sm">API 密钥库</h2>
            <p className="text-2xs text-slate-500 mt-0.5">BYOK · 密钥仅保存在您的浏览器本地</p>
          </div>
          <button onClick={onClose} className="btn-ghost w-7 h-7 rounded-lg flex items-center justify-center">
            <X size={14} />
          </button>
        </div>

        {/* Models */}
        <div className="p-5 space-y-4">
          {local.map((cfg, idx) => (
            <div key={cfg.id} className="relative rounded-xl border border-white/6 bg-ink-950/60 p-4 space-y-3 group">
              {/* 删除按钮 */}
              {local.length > 1 && (
                <button
                  onClick={() => handleRemove(cfg.id)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all bg-ink-950 p-1.5 rounded-md border border-white/5 shadow-md flex items-center gap-1.5 z-10"
                  title="删除此配置"
                >
                  <Trash2 size={13} />
                  <span className="text-2xs font-medium">删除</span>
                </button>
              )}

              {/* 标题 / 名称编辑 (将原版 text 替换为 input) */}
              <div className="flex items-center gap-2 pr-16 bg-ink-950/40 -mx-2 -mt-2 px-2 py-1.5 rounded-lg border border-transparent hover:border-white/5 transition-colors">
                <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.apiKey?.trim() ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                <input
                  type="text"
                  value={cfg.name}
                  onChange={(e) => update(cfg.id, 'name', e.target.value)}
                  placeholder="模型显示名称"
                  className="bg-transparent border-none text-sm font-medium text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 rounded w-full"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="text-2xs text-slate-500 font-medium block mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showKey[cfg.id] ? 'text' : 'password'}
                    value={cfg.apiKey}
                    onChange={(e) => update(cfg.id, 'apiKey', e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-ink-950 border border-white/8 rounded-lg px-3 py-2 pr-9 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500/40 font-mono transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((p) => ({ ...p, [cfg.id]: !p[cfg.id] }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showKey[cfg.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              {/* Base URL */}
              <div>
                <label className="text-2xs text-slate-500 font-medium block mb-1">Base URL (含 /v1)</label>
                <input
                  type="text"
                  value={cfg.baseUrl}
                  onChange={(e) => update(cfg.id, 'baseUrl', e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full bg-ink-950 border border-white/8 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500/40 font-mono transition-colors"
                />
              </div>

              {/* Model ID */}
              <div>
                <label className="text-2xs text-slate-500 font-medium block mb-1">Model ID (如 gpt-4o, deepseek-chat)</label>
                <input
                  type="text"
                  value={cfg.modelId}
                  onChange={(e) => update(cfg.id, 'modelId', e.target.value)}
                  placeholder="gpt-4o"
                  className="w-full bg-ink-950 border border-white/8 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500/40 font-mono transition-colors"
                />
              </div>
            </div>
          ))}

          {/* 新增按钮 */}
          <button
            onClick={handleAdd}
            className="w-full border border-dashed border-white/10 rounded-xl py-3 text-xs font-medium text-slate-400 hover:text-amber-400 hover:border-amber-400/30 hover:bg-amber-400/5 transition-all flex items-center justify-center gap-2"
          >
            <span className="text-lg leading-none">+</span> 新增 API 配置
          </button>

          {/* Cache row */}
          <div className="flex items-center justify-between text-xs py-2">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Database size={12} />
              本地缓存 {cacheCount} 条（再次点击不扣费）
            </span>
            {cacheCount > 0 && (
              <button onClick={handleClearCache} className="text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
                <Trash2 size={11} />
                清空
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-2 px-5 py-4 border-t border-white/6 bg-ink-900 z-10">
          <button onClick={onClose} className="btn-ghost flex-1 text-sm rounded-xl py-2">取消</button>
          <button
            onClick={() => { onSave(local); onClose(); }}
            className="btn-amber flex-1 text-sm rounded-xl py-2 font-medium"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AI 洞察模态框 ────────────────────────────────────────────────────────────

function InsightModal({ mode, newsItem, modelConfigs, onClose }) {
  const [singleResult, setSingleResult] = useState(null);
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleError, setSingleError] = useState(null);
  const [multiResults, setMultiResults] = useState([]);
  const [multiLoading, setMultiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const fetched = useRef(false);

  // 导出分析结果
  const exportInsight = () => {
    const content = mode === 'single' ? singleResult : multiResults[activeTab]?.content;
    if (!content) return;
    
    const header = `# ${newsItem.title}\n\n> 来源: ${newsItem.sourceName}\n> 日期: ${newsItem.pubDate}\n\n---\n\n`;
    const blob = new Blob([header + content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-${newsItem.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ESC键关闭模态框
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const primaryModel = modelConfigs.find((m) => m.apiKey?.trim() && m.baseUrl?.trim());

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    if (mode === 'single') {
      if (!primaryModel) { setSingleError('请先配置至少一个模型的 API Key'); return; }
      setSingleLoading(true);
      fetchSingleModelInsight({ newsItem, modelConfig: primaryModel })
        .then((r) => { setSingleResult(r); setSingleLoading(false); })
        .catch((e) => { setSingleError(e.message); setSingleLoading(false); });
    } else {
      const enabled = modelConfigs.filter((m) => m.apiKey?.trim() && m.baseUrl?.trim());
      if (enabled.length === 0) {
        setMultiResults([{ modelName: '提示', status: 'rejected', error: '请先配置模型 API Key' }]);
        return;
      }
      setMultiResults(enabled.map((m) => ({ modelName: m.name, modelId: m.modelId, status: 'loading' })));
      setMultiLoading(true);
      fetchMultiModelInsights({ newsItem, modelConfigs: enabled })
        .then((r) => { setMultiResults(r); setMultiLoading(false); })
        .catch((e) => { setMultiResults([{ modelName: '错误', status: 'rejected', error: e.message }]); setMultiLoading(false); });
    }
  }, []); // eslint-disable-line

  const modelTabColors = ['text-emerald-400', 'text-indigo-400', 'text-amber-400'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      <div
        className={`relative intel-panel rounded-2xl flex flex-col animate-slide-up overflow-hidden ${
          mode === 'multi' ? 'w-full max-w-5xl max-h-[92vh]' : 'w-full max-w-2xl max-h-[88vh]'
        }`}
      >
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-white/6">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {/* Mode badge */}
              <div className="flex items-center gap-2 mb-2">
                {mode === 'single' ? (
                  <span className="inline-flex items-center gap-1 text-2xs font-semibold px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/25 text-amber-400">
                    <BrainCircuit size={10} />
                    {primaryModel?.name ?? 'AI'} · 深度解读
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-2xs font-semibold px-2.5 py-1 rounded-full bg-red-400/10 border border-red-400/25 text-red-400">
                    <Sparkles size={10} />
                    🔥 三方交叉审查
                  </span>
                )}
              </div>
              {/* Article title */}
              <h3 className="text-sm font-semibold text-slate-100 line-clamp-2 leading-snug">{newsItem.title}</h3>
              <p className="text-2xs text-slate-500 mt-1">
                {newsItem.sourceName || newsItem.author}
                {newsItem.pubDate && ` · ${formatDate(newsItem.pubDate)}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={exportInsight}
                className="btn-ghost w-7 h-7 rounded-lg flex items-center justify-center"
                title="导出分析结果"
              >
                <Database size={14} />
              </button>
              <button onClick={onClose} className="btn-ghost w-7 h-7 rounded-lg flex items-center justify-center">
                <X size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ── 单模型内容 ───────────────────────────── */}
        {mode === 'single' && (
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {singleLoading && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-xs text-amber-400">
                  <RefreshCw size={12} className="animate-spin" />
                  {primaryModel?.name} 正在分析…
                </div>
                <SkeletonInsight />
              </div>
            )}
            {singleError && (
              <div className="flex gap-2 items-start p-3 rounded-xl bg-red-400/8 border border-red-400/20 text-red-400 text-xs">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                {singleError}
              </div>
            )}
            {singleResult && (
              <div className="prose prose-sm prose-editorial max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{singleResult}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* ── 多模型分组 ───────────────────────────── */}
        {mode === 'multi' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Tabs */}
            <div className="flex items-center gap-0.5 px-5 pt-3 border-b border-white/6 shrink-0 overflow-x-auto scrollbar-hide">
              {multiResults.map((r, idx) => {
                const themeClass = MODEL_THEME_COLORS[idx % MODEL_THEME_COLORS.length].text;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveTab(idx)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
                      activeTab === idx
                        ? `border-amber-400 ${themeClass}`
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {r.status === 'loading' && <RefreshCw size={10} className="animate-spin text-amber-400" />}
                    {r.status === 'fulfilled' && <CheckCircle2 size={10} className="text-emerald-400" />}
                    {r.status === 'rejected' && <AlertCircle size={10} className="text-red-400" />}
                    {r.modelName}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {multiResults[activeTab] ? (
                <>
                  {multiResults[activeTab].status === 'loading' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs text-amber-400">
                        <RefreshCw size={12} className="animate-spin" />
                        {multiResults[activeTab].modelName} 分析中…
                      </div>
                      <SkeletonInsight lines={12} />
                    </div>
                  )}
                  {multiResults[activeTab].status === 'rejected' && (
                    <div className="flex gap-2 items-start p-3 rounded-xl bg-red-400/8 border border-red-400/20 text-red-400 text-xs">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <div>
                        <strong>{multiResults[activeTab].modelName}</strong> 调用失败：{multiResults[activeTab].error}
                      </div>
                    </div>
                  )}
                  {multiResults[activeTab].status === 'fulfilled' && (
                    <div className="prose prose-sm prose-editorial max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{multiResults[activeTab].content}</ReactMarkdown>
                    </div>
                  )}
                </>
              ) : (
                <SkeletonInsight />
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-white/6">
          <span className="text-2xs text-slate-600 flex items-center gap-1">
            <Database size={10} />
            结果已缓存，二次点击免费
          </span>
          <a
            href={newsItem.link}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-amber flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 font-medium"
          >
            <ExternalLink size={11} />
            前往原文
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── 统计热图 Bar ─────────────────────────────────────────────────────────────

function CategoryHeatBar({ groups, total }) {
  if (total === 0) return null;
  return (
    <div className="flex h-1.5 w-full rounded-full overflow-hidden gap-px">
      {CATEGORIES.map((cat, i) => {
        const count = (groups[cat.id] || []).length;
        if (!count) return null;
        const pct = (count / total) * 100;
        const hues = [
          '#fbbf24','#6366f1','#10b981','#f472b6','#38bdf8',
          '#fb923c','#a78bfa','#34d399','#f87171','#818cf8',
        ];
        return (
          <div
            key={cat.id}
            style={{ width: `${pct}%`, background: hues[i] }}
            title={`${cat.label}: ${count}`}
          />
        );
      })}
    </div>
  );
}

// ─── 主应用 ──────────────────────────────────────────────────────────────────

export default function App() {
  const [inputValue, setInputValue] = useState('');
  const [keyword, setKeyword]     = useState('');
  const [newsItems, setNewsItems] = useState([]);
  const [grouped, setGrouped]     = useState({ all: [], uncategorized: [] });
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading]     = useState(false);
  const [searchError, setSearchError] = useState(null);
  const searchInputRef = useRef(null);

  const [theme, setTheme] = useState(() => localStorage.getItem('anti_cocoon_theme') || 'dark');
  const [modelConfigs, setModelConfigs] = useState(loadModelConfigs);
  const [showApiModal, setShowApiModal] = useState(false);
  const [insightModal, setInsightModal] = useState(null);
  const [bookmarks, setBookmarks] = useState(loadBookmarks);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarkSearch, setBookmarkSearch] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date', 'source', 'category'
  const [stockInfo, setStockInfo] = useState(null); // 当前搜索的股票信息
  const [suggestions, setSuggestions] = useState([]); // 股票代码自动补全建议
  const [trendingNews, setTrendingNews] = useState([]); // 各搜索引擎热榜
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null); // 选中查看的新闻
  const [activeSource, setActiveSource] = useState('all'); // 当前选中的热榜源
  const [realTrendingData, setRealTrendingData] = useState({}); // 真实热榜数据

  // 热榜源配置
  const TRENDING_SOURCES_CONFIG = [
    { id: 'google', name: 'Google 热榜', icon: '🔍', color: '#4285F4' },
    { id: 'bing', name: 'Bing 热榜', icon: '🅱️', color: '#00897B' },
    { id: 'yahoo', name: 'Yahoo 热榜', icon: '💜', color: '#6B3FA0' },
  ];

  // 热榜源列表
  const sourceList = [
    { id: 'all', name: '全部', icon: '📊' },
    ...TRENDING_SOURCES_CONFIG,
  ];

  // 获取真实热榜数据
  useEffect(() => {
    const loadRealTrending = async () => {
      setTrendingLoading(true);
      const results = {};

      // 获取 Google 热榜
      try {
        const googleRes = await fetch(
          `https://corsproxy.io/?${encodeURIComponent('https://news.google.com/rss?hl=zh-CN&gl=CN&ceid=CN:zh-Hans')}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (googleRes.ok) {
          const text = await googleRes.text();
          const items = parseRssXml(text, '');
          results.google = items.slice(0, 15).map((item, idx) => ({
            rank: idx + 1,
            title: item.title,
            link: item.link,
            source: item.sourceName,
            pubDate: item.pubDate,
          }));
        }
      } catch (err) {
        console.warn('Google 热榜获取失败:', err);
      }

      // 获取 Bing 热榜
      try {
        const bingRes = await fetch(
          `https://corsproxy.io/?${encodeURIComponent('https://www.bing.com/news/search?q=trending&setlang=zh-CN&format=rss')}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (bingRes.ok) {
          const text = await bingRes.text();
          const items = parseRssXml(text, '');
          results.bing = items.slice(0, 15).map((item, idx) => ({
            rank: idx + 1,
            title: item.title,
            link: item.link,
            source: item.sourceName,
            pubDate: item.pubDate,
          }));
        }
      } catch (err) {
        console.warn('Bing 热榜获取失败:', err);
      }

      // 获取 Yahoo 热榜
      try {
        const yahooRes = await fetch(
          `https://corsproxy.io/?${encodeURIComponent('https://news.yahoo.com/rss')}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (yahooRes.ok) {
          const text = await yahooRes.text();
          const items = parseRssXml(text, '');
          results.yahoo = items.slice(0, 15).map((item, idx) => ({
            rank: idx + 1,
            title: item.title,
            link: item.link,
            source: item.sourceName,
            pubDate: item.pubDate,
          }));
        }
      } catch (err) {
        console.warn('Yahoo 热榜获取失败:', err);
      }

      setRealTrendingData(results);
      setTrendingLoading(false);
    };

    loadRealTrending();
  }, []);

  // 获取当前显示的热榜数据
  const getCurrentTrending = () => {
    if (activeSource === 'all') {
      // 合并所有源的前5条
      const merged = [];
      TRENDING_SOURCES_CONFIG.forEach(source => {
        const items = realTrendingData[source.id] || [];
        items.slice(0, 5).forEach(item => {
          merged.push({
            ...item,
            sourceName: source.name,
            sourceIcon: source.icon,
            sourceColor: source.color,
          });
        });
      });
      return merged;
    }
    const items = realTrendingData[activeSource] || [];
    return items;
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('anti_cocoon_theme', theme);
  }, [theme]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + K: 聚焦搜索框
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Ctrl/Cmd + B: 切换书签视图
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setShowBookmarks(v => !v);
      }
      // /: 聚焦搜索框（类似 GitHub）
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const configuredCount = modelConfigs.filter((m) => m.apiKey?.trim() && m.baseUrl?.trim()).length;

  const displayedItems = (() => {
    let items = [];
    if (showBookmarks) {
      const bIds = new Set(bookmarks.map((b) => b.id));
      items = (grouped['all'] || []).filter((n) => bIds.has(n.id));
    } else if (activeCategory === 'uncategorized') {
      items = grouped['uncategorized'] || [];
    } else if (activeCategory === 'all') {
      items = grouped['all'] || [];
    } else {
      items = grouped[activeCategory] || [];
    }
    
    // 排序
    switch (sortBy) {
      case 'date':
        return items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
      case 'source':
        return items.sort((a, b) => (a.sourceName || '').localeCompare(b.sourceName || ''));
      case 'category':
        return items.sort((a, b) => (a.categoryId || '').localeCompare(b.categoryId || ''));
      default:
        return items;
    }
  })();

  // ── 搜索 ──
  const handleSearch = useCallback(async (kw) => {
    const trimmed = (kw || inputValue).trim();
    if (!trimmed) return;
    
    // 检测是否为股票代码
    const stock = detectStockCode(trimmed);
    setStockInfo(stock);
    
    // 如果是股票代码，使用优化的搜索词
    let searchTerm = trimmed;
    if (stock) {
      // 使用公司名称和行业作为搜索词
      searchTerm = `${stock.name} ${stock.sector}`;
    }
    
    setKeyword(trimmed);
    setLoading(true);
    setSearchError(null);
    setNewsItems([]);
    setGrouped({ all: [], uncategorized: [] });
    setActiveCategory('all');
    setShowBookmarks(false);
    setSuggestions([]);
    
    try {
      const raw = await fetchLiveNews(searchTerm);
      // Sort by publication date descending (newest first)
      raw.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
      const classified = classifyNewsItems(raw);
      const groups = groupByCategory(classified);
      setNewsItems(classified);
      setGrouped(groups);
    } catch (err) {
      setSearchError(err.message || '搜索失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [inputValue]);

  // ── 输入变化处理（用于股票代码自动补全）──
  const handleInputChange = (value) => {
    setInputValue(value);
    setStockInfo(null);
    
    // 检测输入是否可能是股票代码
    if (value.length >= 2) {
      const stock = detectStockCode(value);
      if (stock) {
        setStockInfo(stock);
      }
      
      // 提供自动补全建议
      const allStocks = getAllStocks();
      const filtered = allStocks.filter(s => 
        s.code.toLowerCase().includes(value.toLowerCase()) ||
        s.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  // ── 错误消息处理 ──
  const getErrorInfo = (errorMessage) => {
    // 查找匹配的错误消息
    for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
      if (errorMessage.includes(key)) {
        return value;
      }
    }
    // 默认错误消息
    return {
      title: '出现错误',
      description: errorMessage,
      action: '重试',
    };
  };

  // ── 书签 ──
  const handleToggleBookmark = (item) => {
    setBookmarks((prev) => {
      const exists = prev.find((b) => b.id === item.id);
      const next = exists ? prev.filter((b) => b.id !== item.id) : [...prev, item];
      localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(next));
      return next;
    });
  };

  // 导出书签
  const exportBookmarks = (format = 'json') => {
    const data = format === 'json' 
      ? JSON.stringify(bookmarks, null, 2)
      : bookmarks.map(b => `"${b.title}","${b.link}","${b.pubDate}"`).join('\n');
    
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anti-cocoon-bookmarks.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const bookmarkIds = new Set(bookmarks.map((b) => b.id));
  
  // 过滤后的书签列表
  const filteredBookmarks = bookmarks.filter(b => 
    b.title.toLowerCase().includes(bookmarkSearch.toLowerCase()) ||
    b.description?.toLowerCase().includes(bookmarkSearch.toLowerCase())
  );

  // ── 导航列表 ──
  const navItems = [
    { id: 'all',           label: '全部',   icon: '📡' },
    ...CATEGORIES,
    { id: 'uncategorized', label: '未分类', icon: '📁' },
  ];

  // ─── HOT_KEYWORDS 带搜索跳转 ──
  const HOT_KEYWORDS = ['Nvidia', 'TSMC', 'DeepSeek', 'SpaceX', 'CRISPR', 'BYD', '量子计算', '新能源'];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>

      {/* ══════════════════════ 顶栏 ══════════════════════════════════════════ */}
      <header className="sticky top-0 z-30 header-glass">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-3">

          {/* Logo */}
          <a href="#" onClick={(e) => { e.preventDefault(); setNewsItems([]); setInputValue(''); handleSearch(' '); }} className="flex items-center gap-2.5 shrink-0 group filter hover:brightness-110 transition-all">
            <div className="w-7 h-7 rounded-lg border border-amber-400/30 bg-amber-400/8 flex items-center justify-center group-hover:border-amber-400/60 group-hover:shadow-[0_0_15px_rgba(251,191,36,0.3)] transition-all duration-300 relative overflow-hidden">
              <Rss size={13} className="text-amber-400 relative z-10" />
              <div className="absolute inset-0 bg-amber-400/20 w-0 group-hover:w-full transition-all duration-500 ease-out" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-slate-100 text-sm tracking-tight transition-colors">Anti-Cocoon</span>
              <span className="text-amber-400/70 ml-1 text-xs hidden md:inline transition-colors">情报破壁机</span>
            </div>
          </a>

          {/* 搜索框 */}
          <div className="flex-1 flex items-center gap-2 max-w-xl group relative">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none transition-colors duration-300 group-focus-within:text-amber-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索关键词或股票代码：AI / 半导体 / 600519 / AAPL…"
                className="w-full bg-ink-800 border border-white/8 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-400/50 focus:bg-ink-900 focus:shadow-amber-md focus:ring-1 focus:ring-amber-400/20 transition-all duration-300 ease-out placeholder:transition-opacity focus:placeholder:opacity-50"
              />
              
              {/* 股票信息提示 */}
              {stockInfo && !loading && (
                <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-ink-800 border border-amber-500/30 rounded-lg z-40 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-xs font-semibold">{stockInfo.market}</span>
                    <span className="text-slate-300 text-xs font-medium">{stockInfo.name}</span>
                    <span className="text-slate-500 text-2xs">({stockInfo.sector})</span>
                  </div>
                  <p className="text-slate-500 text-2xs mt-1">{stockInfo.fullName}</p>
                </div>
              )}
              
              {/* 自动补全建议 */}
              {suggestions.length > 0 && !stockInfo && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-ink-800 border border-white/10 rounded-lg z-40 shadow-xl animate-fade-in overflow-hidden">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputValue(s.code);
                        setSuggestions([]);
                        handleSearch(s.code);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-white/5 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 text-2xs font-medium">{s.market}</span>
                        <span className="text-slate-300 text-xs">{s.name}</span>
                      </div>
                      <span className="text-slate-500 text-2xs">{s.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={loading || !inputValue.trim()}
              className="btn-amber shrink-0 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loading ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
              <span className="hidden sm:inline">搜索</span>
            </button>
          </div>

          {/* 右侧工具 */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="btn-ghost w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              title={theme === 'dark' ? '切换为白昼模式' : '切换为黑夜模式'}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} className="text-slate-600" />}
            </button>

            {/* Translate */}
            <div className="hidden md:block">
              <TranslateWidget />
            </div>

            {/* 书签 */}
            <button
              onClick={() => setShowBookmarks((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
                showBookmarks
                  ? 'bg-amber-400/12 border-amber-400/30 text-amber-400'
                  : 'btn-ghost'
              }`}
              title="阅读清单"
            >
              <BookMarked size={13} />
              {bookmarks.length > 0 && (
                <span className="font-mono text-2xs">{bookmarks.length}</span>
              )}
            </button>

            {/* API 配置 */}
            <button
              onClick={() => setShowApiModal(true)}
              className="btn-ghost flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  configuredCount > 0 ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse-amber'
                }`}
              />
              <Settings size={13} />
              <span className="hidden sm:inline">
                {configuredCount > 0 ? `${configuredCount}模型` : '配置'}
              </span>
            </button>
          </div>
        </div>

        {/* 跑马灯条（仅无搜索结果时展示热门词） */}
        {newsItems.length === 0 && !loading && (
          <div className="border-t border-white/4 overflow-hidden h-7 flex items-center">
            <span className="text-2xs text-slate-600 shrink-0 px-3 flex items-center gap-1.5 border-r border-white/6">
              <Zap size={10} className="text-amber-500" />
              热门
            </span>
            <div className="overflow-hidden flex-1">
              <div className="marquee-track">
                {[...TICKER_TOPICS, ...TICKER_TOPICS].map((t, i) => (
                  <button
                    key={i}
                    onClick={() => { setInputValue(t); handleSearch(t); }}
                    className="shrink-0 text-2xs text-slate-500 hover:text-amber-400 px-3 py-0.5 transition-colors"
                  >
                    {t}
                    <span className="text-slate-700 mx-2">·</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ══════════════════════ 类别导航 ===================================== */}
      {(newsItems.length > 0 || loading) && (
        <nav className="sticky top-14 z-20 header-glass border-t border-white/4">
          <div className="max-w-screen-2xl mx-auto px-4">
            <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide py-2">
              {navItems.map((nav) => {
                const count = nav.id === 'all'
                  ? newsItems.length
                  : (grouped[nav.id] || []).length;
                const isActive = !showBookmarks && activeCategory === nav.id;

                return (
                  <button
                    key={nav.id}
                    onClick={() => { setActiveCategory(nav.id); setShowBookmarks(false); }}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-2xs font-semibold whitespace-nowrap transition-all ${
                      isActive ? 'amber-pill' : 'muted-pill'
                    }`}
                  >
                    <span>{nav.icon}</span>
                    <span>{nav.label}</span>
                    {count > 0 && (
                      <span className={`font-mono ${isActive ? 'text-amber-300' : 'text-slate-600'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* 热力分布条 */}
            {newsItems.length > 0 && (
              <div className="pb-2">
                <CategoryHeatBar groups={grouped} total={newsItems.length} />
              </div>
            )}
          </div>
        </nav>
      )}

      {/* ══════════════════════ 主内容 ======================================= */}
      <main className="max-w-screen-2xl mx-auto px-4 py-6">

        {/* ── 首页：真实热榜 ── */}
        {!loading && newsItems.length === 0 && !searchError && !selectedNews && (
          <div className="animate-slide-up max-w-3xl mx-auto">
            {/* 标题 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-amber-400" />
                <h2 className="text-lg font-semibold text-slate-200">实时热榜</h2>
              </div>
              <button
                onClick={() => {
                  setRealTrendingData({});
                  // 重新获取
                  window.location.reload();
                }}
                className="text-2xs text-slate-500 hover:text-amber-400 transition-colors flex items-center gap-1"
              >
                <RefreshCw size={12} className={trendingLoading ? 'animate-spin' : ''} />
                {trendingLoading ? '更新中...' : '刷新'}
              </button>
            </div>

            {/* 热榜源切换标签 */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
              {sourceList.map((source) => (
                <button
                  key={source.id}
                  onClick={() => setActiveSource(source.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    activeSource === source.id
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-white/5 text-slate-400 border border-white/5 hover:border-white/10 hover:text-slate-300'
                  }`}
                >
                  <span>{source.icon}</span>
                  <span>{source.name}</span>
                  {source.id !== 'all' && realTrendingData[source.id] && (
                    <span className="text-2xs opacity-60">({realTrendingData[source.id].length})</span>
                  )}
                </button>
              ))}
            </div>

            {/* 热榜列表 */}
            {getCurrentTrending().length > 0 ? (
              <div className="card-surface rounded-2xl overflow-hidden">
                {getCurrentTrending().map((item, idx) => (
                  <a
                    key={idx}
                    href={item.link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center gap-3 border-b border-white/5 last:border-b-0 block"
                  >
                    {/* 排名 */}
                    <span className={`text-lg font-bold min-w-[28px] text-center ${
                      idx === 0 ? 'text-red-500' : 
                      idx === 1 ? 'text-orange-500' : 
                      idx === 2 ? 'text-yellow-500' :
                      'text-slate-600'
                    }`}>
                      {activeSource === 'all' ? (idx + 1) : item.rank}
                    </span>

                    {/* 内容区 */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-slate-200 hover:text-amber-400 line-clamp-1 transition-colors">
                        {item.title}
                      </span>
                      {item.source && (
                        <span className="text-2xs text-slate-600 mt-0.5 block">{item.source}</span>
                      )}
                    </div>

                    {/* 全部模式显示来源 */}
                    {activeSource === 'all' && item.sourceIcon && (
                      <span 
                        className="text-2xs px-2 py-0.5 rounded-full font-medium shrink-0"
                        style={{ 
                          background: `${item.sourceColor}15`,
                          color: item.sourceColor 
                        }}
                      >
                        {item.sourceIcon}
                      </span>
                    )}

                    {/* 发布时间 */}
                    {item.pubDate && (
                      <span className="text-2xs text-slate-600 shrink-0">
                        {new Date(item.pubDate).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            ) : (
              <div className="card-surface rounded-2xl p-12 text-center">
                {trendingLoading ? (
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw size={24} className="animate-spin text-amber-400" />
                    <p className="text-slate-400 text-sm">正在获取热榜数据...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <TrendingUp size={24} className="text-slate-600" />
                    <p className="text-slate-400 text-sm">暂无热榜数据</p>
                    <p className="text-slate-600 text-2xs">请稍后刷新重试</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 新闻详情弹窗 ── */}
        {selectedNews && (
          <div className="animate-slide-up max-w-2xl mx-auto">
            <button
              onClick={() => setSelectedNews(null)}
              className="flex items-center gap-2 text-slate-400 hover:text-amber-400 mb-4 transition-colors"
            >
              <ChevronRight size={16} className="rotate-180" />
              <span className="text-sm">返回热榜</span>
            </button>
            
            <div className="card-surface rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-2xs px-2 py-0.5 rounded-full font-medium ${
                  selectedNews.tag === '科技' ? 'bg-blue-500/15 text-blue-400' :
                  selectedNews.tag === '财经' ? 'bg-green-500/15 text-green-400' :
                  selectedNews.tag === '汽车' ? 'bg-red-500/15 text-red-400' :
                  selectedNews.tag === '国际' ? 'bg-purple-500/15 text-purple-400' :
                  'bg-slate-500/15 text-slate-400'
                }`}>
                  {selectedNews.tag}
                </span>
                <span className="text-2xs text-slate-500">{selectedNews.hot} 阅读</span>
              </div>
              
              <h1 className="text-xl font-bold text-slate-100 mb-4">
                {selectedNews.title}
              </h1>
              
              {selectedNews.link && (
                <a
                  href={selectedNews.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm mb-4"
                >
                  <ExternalLink size={14} />
                  查看原文
                </a>
              )}
              
              <div className="text-slate-400 text-sm leading-relaxed">
                <p className="mb-3">
                  这是一条关于「{selectedNews.title}」的热门新闻。
                </p>
                <p className="mb-3">
                  点击下方按钮可以搜索更多相关信息，或使用AI深度分析功能获取多维度解读。
                </p>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setInputValue(selectedNews.title); handleSearch(selectedNews.title); setSelectedNews(null); }}
                  className="btn-amber px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
                >
                  <Search size={14} />
                  搜索相关
                </button>
                <button
                  onClick={() => setSelectedNews(null)}
                  className="btn-ghost px-4 py-2 rounded-xl text-sm"
                >
                  返回热榜
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 加载骨架 ── */}
        {loading && (
          <div className="animate-fade-in space-y-4">
            <div className="flex items-center gap-2 text-xs text-amber-400 mb-5">
              <RefreshCw size={13} className="animate-spin" />
              正在聚合「{keyword}」的全球情报…
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        )}

        {/* ── 搜索错误 ── */}
        {searchError && !loading && (() => {
          const errorInfo = getErrorInfo(searchError);
          return (
            <div className="flex flex-col items-center gap-4 py-20 animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-red-400/8 border border-red-400/20 flex items-center justify-center">
                <AlertCircle size={22} className="text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-red-400 text-sm font-medium">{errorInfo.title}</p>
                <p className="text-slate-500 text-xs mt-1">{errorInfo.description}</p>
              </div>
              <button onClick={() => handleSearch()} className="btn-amber px-4 py-2 rounded-xl text-xs flex items-center gap-1.5">
                <RefreshCw size={12} /> {errorInfo.action}
              </button>
            </div>
          );
        })()}

        {/* ── 书签清单 ── */}
        {showBookmarks && !loading && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <BookMarked size={15} className="text-amber-400" />
                <h2 className="text-sm font-semibold text-slate-200">阅读清单 ({bookmarks.length})</h2>
              </div>
              {bookmarks.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="搜索书签..."
                      value={bookmarkSearch}
                      onChange={(e) => setBookmarkSearch(e.target.value)}
                      className="input-search pl-9 pr-3 py-2 text-xs rounded-xl w-48"
                    />
                  </div>
                  <button 
                    onClick={() => exportBookmarks('json')}
                    className="btn-ghost px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"
                    title="导出为JSON"
                  >
                    <Database size={12} /> JSON
                  </button>
                  <button 
                    onClick={() => exportBookmarks('csv')}
                    className="btn-ghost px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"
                    title="导出为CSV"
                  >
                    <Database size={12} /> CSV
                  </button>
                </div>
              )}
            </div>
            {bookmarks.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <BookMarked size={28} className="mx-auto mb-3 opacity-30 animate-pulse" />
                <p className="text-sm">还没有收藏任何情报</p>
                <p className="text-xs mt-1">点击新闻卡片右上角的书签图标即可收藏</p>
              </div>
            ) : filteredBookmarks.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Search size={28} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">没有找到匹配的书签</p>
                <p className="text-xs mt-1">尝试其他关键词</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredBookmarks.map((item, idx) => (
                  <NewsCard
                    key={item.id}
                    index={idx}
                    item={item}
                    onSingle={(n) => setInsightModal({ mode: 'single', newsItem: n })}
                    onMulti={(n) => setInsightModal({ mode: 'multi', newsItem: n })}
                    bookmarked={bookmarkIds.has(item.id)}
                    onToggleBookmark={handleToggleBookmark}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 新闻网格 ── */}
        {!loading && !showBookmarks && displayedItems.length > 0 && (
          <div className="animate-fade-in">
            {/* 状态行 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <TrendingUp size={13} className="text-amber-400" />
                <span>
                  {stockInfo ? (
                    <>
                      <span className="text-amber-400 font-medium">{stockInfo.market}</span>
                      <span className="mx-1">·</span>
                      <span className="text-slate-300 font-medium">{stockInfo.name}</span>
                      <span className="text-slate-500 ml-1">({stockInfo.code})</span>
                    </>
                  ) : (
                    <>「{keyword}」</>
                  )}
                  <span className="text-slate-300 font-medium ml-1">{displayedItems.length}</span>
                  <span className="ml-1">条情报</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent border border-white/10 rounded-lg px-2 py-1 text-2xs text-slate-400 focus:outline-none focus:border-amber-400/30"
                >
                  <option value="date">按日期排序</option>
                  <option value="source">按来源排序</option>
                  <option value="category">按分类排序</option>
                </select>
                <button
                  onClick={() => handleSearch(keyword)}
                  className="btn-ghost flex items-center gap-1 text-2xs px-2 py-1 rounded-lg"
                >
                  <RefreshCw size={10} /> 刷新
                </button>
              </div>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedItems.map((item, idx) => (
                <NewsCard
                  key={item.id}
                  index={idx}
                  item={item}
                  onSingle={(n) => setInsightModal({ mode: 'single', newsItem: n })}
                  onMulti={(n) => setInsightModal({ mode: 'multi', newsItem: n })}
                  bookmarked={bookmarkIds.has(item.id)}
                  onToggleBookmark={handleToggleBookmark}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── 当前分类无内容 ── */}
        {!loading && !showBookmarks && newsItems.length > 0 && displayedItems.length === 0 && (
          <div className="py-16 text-center animate-fade-in">
            <p className="text-slate-500 text-sm">当前分类暂无情报</p>
            <button
              onClick={() => setActiveCategory('all')}
              className="mt-3 text-amber-400 text-xs flex items-center gap-1 mx-auto hover:text-amber-300 transition-colors"
            >
              <ChevronRight size={13} /> 查看全部
            </button>
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-6 px-4 text-center">
        <p className="text-2xs text-slate-600">
          Anti-Cocoon AI · BYOK · 密钥仅存于本地浏览器，不经服务器中转
          <span className="mx-2 text-slate-700">·</span>
          打破信息茧房，用全球视角洞见真相
        </p>
      </footer>

      {/* ══════════════════════ 模态框 ======================================= */}
      {showApiModal && (
        <ApiModal
          configs={modelConfigs}
          onSave={(c) => { setModelConfigs(c); saveModelConfigs(c); }}
          onClose={() => setShowApiModal(false)}
        />
      )}

      {insightModal && (
        <InsightModal
          mode={insightModal.mode}
          newsItem={insightModal.newsItem}
          modelConfigs={modelConfigs}
          onClose={() => setInsightModal(null)}
        />
      )}
    </div>
  );
}
