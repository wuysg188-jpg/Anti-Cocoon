/**
 * TrendingBoard.jsx — 真实热榜
 * 点击直接跳转原文
 */

import { useState, useEffect } from 'react';
import { TrendingUp, Github, BrainCircuit, RefreshCw, ExternalLink } from 'lucide-react';

// 预设的热门数据（作为备用）
const FALLBACK_GITHUB = [
  { rank: 1, name: 'facebook/react', desc: 'The library for web and native user interfaces.', stars: '218k', url: 'https://github.com/facebook/react' },
  { rank: 2, name: 'vuejs/core', desc: 'Vue.js is a progressive JavaScript framework.', stars: '206k', url: 'https://github.com/vuejs/core' },
  { rank: 3, name: 'tensorflow/tensorflow', desc: 'An open-source machine learning framework.', stars: '183k', url: 'https://github.com/tensorflow/tensorflow' },
  { rank: 4, name: 'langchain-ai/langchain', desc: 'Build context-aware reasoning applications.', stars: '89k', url: 'https://github.com/langchain-ai/langchain' },
  { rank: 5, name: 'openai/whisper', desc: 'Robust Speech Recognition via Large-Scale Weak Supervision.', stars: '62k', url: 'https://github.com/openai/whisper' },
];

const FALLBACK_HF = [
  { rank: 1, name: 'meta-llama/Llama-2-7b', downloads: '10M', url: 'https://huggingface.co/meta-llama/Llama-2-7b' },
  { rank: 2, name: 'openai/whisper-large-v3', downloads: '8M', url: 'https://huggingface.co/openai/whisper-large-v3' },
  { rank: 3, name: 'stabilityai/stable-diffusion-xl-base-1.0', downloads: '5M', url: 'https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0' },
  { rank: 4, name: 'bert-base-uncased', downloads: '4M', url: 'https://huggingface.co/bert-base-uncased' },
  { rank: 5, name: 'gpt2', downloads: '3M', url: 'https://huggingface.co/gpt2' },
];

const FALLBACK_NEWS = [
  { rank: 1, title: 'AI技术最新突破', source: '科技日报', url: 'https://news.google.com' },
  { rank: 2, title: '新能源汽车销量创新高', source: '财经网', url: 'https://news.google.com' },
  { rank: 3, title: '芯片产业发展报告', source: '新华网', url: 'https://news.google.com' },
  { rank: 4, title: 'SpaceX发射成功', source: '环球时报', url: 'https://news.google.com' },
  { rank: 5, title: '比特币价格波动', source: '证券时报', url: 'https://news.google.com' },
];

export default function TrendingBoard() {
  const [activeTab, setActiveTab] = useState('github');
  const [loading, setLoading] = useState(true);
  const [github, setGithub] = useState(FALLBACK_GITHUB);
  const [huggingface, setHuggingface] = useState(FALLBACK_HF);
  const [news, setNews] = useState(FALLBACK_NEWS);

  // 获取 GitHub 热门
  const loadGithub = async () => {
    try {
      const res = await fetch(
        'https://api.github.com/search/repositories?q=stars:>50000&sort=stars&order=desc&per_page=10',
        { signal: AbortSignal.timeout(10000) }
      );
      if (res.ok) {
        const json = await res.json();
        if (json.items && json.items.length > 0) {
          setGithub(json.items.map((r, i) => ({
            rank: i + 1,
            name: r.full_name,
            desc: r.description || '',
            stars: formatStars(r.stargazers_count),
            url: r.html_url,
          })));
        }
      }
    } catch (e) {
      console.warn('GitHub API 失败，使用备用数据');
    }
  };

  // 获取 HuggingFace 热门
  const loadHuggingface = async () => {
    try {
      const res = await fetch(
        'https://huggingface.co/api/models?sort=downloads&direction=-1&limit=10',
        { signal: AbortSignal.timeout(10000) }
      );
      if (res.ok) {
        const json = await res.json();
        if (json && json.length > 0) {
          setHuggingface(json.map((m, i) => ({
            rank: i + 1,
            name: m.id,
            downloads: formatNum(m.downloads),
            url: `https://huggingface.co/${m.id}`,
          })));
        }
      }
    } catch (e) {
      console.warn('HuggingFace API 失败，使用备用数据');
    }
  };

  // 获取新闻热榜
  const loadNews = async () => {
    try {
      const proxy = 'https://api.allorigins.win/raw?url=';
      const res = await fetch(
        proxy + encodeURIComponent('https://news.google.com/rss?hl=zh-CN&gl=CN&ceid=CN:zh-Hans'),
        { signal: AbortSignal.timeout(10000) }
      );
      if (res.ok) {
        const text = await res.text();
        if (text && text.includes('<item>')) {
          const parser = new DOMParser();
          const xml = parser.parseFromString(text, 'application/xml');
          const items = Array.from(xml.querySelectorAll('item')).slice(0, 10);
          if (items.length > 0) {
            setNews(items.map((item, i) => ({
              rank: i + 1,
              title: item.querySelector('title')?.textContent || '',
              source: item.querySelector('source')?.textContent || 'Google News',
              url: item.querySelector('link')?.textContent || 'https://news.google.com',
            })));
          }
        }
      }
    } catch (e) {
      console.warn('新闻获取失败，使用备用数据');
    }
  };

  // 格式化 stars
  const formatStars = (n) => {
    if (n >= 1000) return (n / 1000).toFixed(0) + 'k';
    return String(n);
  };

  // 格式化数字
  const formatNum = (n) => {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'k';
    return String(n);
  };

  // 加载全部
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadGithub(), loadHuggingface(), loadNews()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  // 获取当前数据
  const getData = () => {
    if (activeTab === 'github') return github;
    if (activeTab === 'huggingface') return huggingface;
    return news;
  };

  const data = getData();

  return (
    <div className="animate-fade-in">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">每日热榜</h2>
        </div>
        <button 
          onClick={() => { setLoading(true); Promise.all([loadGithub(), loadHuggingface(), loadNews()]).then(() => setLoading(false)); }} 
          disabled={loading} 
          className="btn-ghost p-2 rounded-lg"
          title="刷新"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* 标签 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('github')}
          className={`pill flex items-center gap-1.5 ${activeTab === 'github' ? 'pill-active' : 'pill-default'}`}
        >
          <Github size={14} />
          <span>GitHub</span>
        </button>
        <button
          onClick={() => setActiveTab('huggingface')}
          className={`pill flex items-center gap-1.5 ${activeTab === 'huggingface' ? 'pill-active' : 'pill-default'}`}
        >
          <BrainCircuit size={14} />
          <span>HuggingFace</span>
        </button>
        <button
          onClick={() => setActiveTab('news')}
          className={`pill flex items-center gap-1.5 ${activeTab === 'news' ? 'pill-active' : 'pill-default'}`}
        >
          <TrendingUp size={14} />
          <span>新闻</span>
        </button>
      </div>

      {/* 列表 */}
      <div className="card overflow-hidden">
        {loading && data.length === 0 ? (
          <div className="p-8 text-center">
            <RefreshCw size={20} className="animate-spin text-accent mx-auto mb-2" />
            <p className="text-sm text-text-secondary">加载中...</p>
          </div>
        ) : (
          data.map((item, idx) => (
            <a
              key={`${activeTab}-${idx}`}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 hover:bg-bg-hover border-b border-bg-border last:border-b-0 transition-colors"
            >
              {/* 排名 */}
              <span className={`text-lg font-bold w-6 text-center shrink-0 ${
                idx === 0 ? 'text-red-500' :
                idx === 1 ? 'text-orange-500' :
                idx === 2 ? 'text-yellow-500' :
                'text-text-tertiary'
              }`}>
                {item.rank}
              </span>

              {/* 名称 */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text-primary truncate">
                  {item.name || item.title}
                </div>
                {item.desc && (
                  <div className="text-xs text-text-tertiary truncate mt-0.5">{item.desc}</div>
                )}
                {item.source && (
                  <div className="text-xs text-text-tertiary mt-0.5">{item.source}</div>
                )}
              </div>

              {/* 数据 */}
              <div className="flex items-center gap-2 shrink-0">
                {activeTab === 'github' && item.stars && (
                  <span className="text-sm text-yellow-500">⭐ {item.stars}</span>
                )}
                {activeTab === 'huggingface' && item.downloads && (
                  <span className="text-sm text-text-tertiary">↓ {item.downloads}</span>
                )}
                <ExternalLink size={12} className="text-text-tertiary" />
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
