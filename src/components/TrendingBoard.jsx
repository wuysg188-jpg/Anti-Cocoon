/**
 * TrendingBoard.jsx — 真实热榜
 * 点击直接跳转原文，不触发搜索
 */

import { useState, useEffect } from 'react';
import { TrendingUp, Github, BrainCircuit, RefreshCw } from 'lucide-react';

export default function TrendingBoard() {
  const [activeTab, setActiveTab] = useState('github');
  const [loading, setLoading] = useState(false);
  const [github, setGithub] = useState([]);
  const [huggingface, setHuggingface] = useState([]);
  const [news, setNews] = useState([]);

  // 获取 GitHub 热门
  const loadGithub = async () => {
    try {
      const res = await fetch(
        'https://api.github.com/search/repositories?q=stars:>50000&sort=stars&order=desc&per_page=10'
      );
      if (res.ok) {
        const json = await res.json();
        setGithub(json.items.map((r, i) => ({
          rank: i + 1,
          name: r.full_name,
          desc: r.description,
          stars: r.stargazers_count,
          lang: r.language,
          url: r.html_url,
        })));
      }
    } catch (e) {
      console.error('GitHub error:', e);
    }
  };

  // 获取 HuggingFace 热门
  const loadHuggingface = async () => {
    try {
      const res = await fetch(
        'https://huggingface.co/api/models?sort=downloads&direction=-1&limit=10'
      );
      if (res.ok) {
        const json = await res.json();
        setHuggingface(json.map((m, i) => ({
          rank: i + 1,
          name: m.id,
          downloads: m.downloads,
          likes: m.likes,
          url: `https://huggingface.co/${m.id}`,
        })));
      }
    } catch (e) {
      console.error('HuggingFace error:', e);
    }
  };

  // 获取新闻热榜
  const loadNews = async () => {
    try {
      const proxy = 'https://api.allorigins.win/raw?url=';
      const res = await fetch(
        proxy + encodeURIComponent('https://news.google.com/rss?hl=zh-CN&gl=CN&ceid=CN:zh-Hans'),
        { signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) {
        const text = await res.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'application/xml');
        const items = Array.from(xml.querySelectorAll('item')).slice(0, 10);
        setNews(items.map((item, i) => ({
          rank: i + 1,
          title: item.querySelector('title')?.textContent || '',
          source: item.querySelector('source')?.textContent || '',
          url: item.querySelector('link')?.textContent || '#',
        })));
      }
    } catch (e) {
      console.error('News error:', e);
    }
  };

  // 加载全部
  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadGithub(), loadHuggingface(), loadNews()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // 格式化数字
  const fmt = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  };

  // 获取当前数据
  const getData = () => {
    if (activeTab === 'github') return github;
    if (activeTab === 'huggingface') return huggingface;
    return news;
  };

  const data = getData();

  return (
    <div>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">每日热榜</h2>
        </div>
        <button onClick={loadAll} disabled={loading} className="btn-ghost p-2 rounded-lg">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* 标签 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('github')}
          className={`pill ${activeTab === 'github' ? 'pill-active' : 'pill-default'}`}
        >
          <Github size={14} /> GitHub
        </button>
        <button
          onClick={() => setActiveTab('huggingface')}
          className={`pill ${activeTab === 'huggingface' ? 'pill-active' : 'pill-default'}`}
        >
          <BrainCircuit size={14} /> HuggingFace
        </button>
        <button
          onClick={() => setActiveTab('news')}
          className={`pill ${activeTab === 'news' ? 'pill-active' : 'pill-default'}`}
        >
          <TrendingUp size={14} /> 新闻
        </button>
      </div>

      {/* 列表 */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw size={20} className="animate-spin text-accent mx-auto" />
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-text-tertiary text-sm">暂无数据</div>
        ) : (
          data.map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 hover:bg-bg-hover border-b border-border last:border-b-0 cursor-pointer"
            >
              {/* 排名 */}
              <span className={`text-lg font-bold w-6 text-center ${
                idx === 0 ? 'text-red-500' :
                idx === 1 ? 'text-orange-500' :
                idx === 2 ? 'text-yellow-500' :
                'text-text-tertiary'
              }`}>
                {item.rank}
              </span>

              {/* 名称 */}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-text-primary truncate">
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
              <div className="text-right shrink-0">
                {activeTab === 'github' && item.stars && (
                  <span className="text-sm text-yellow-500">⭐ {fmt(item.stars)}</span>
                )}
                {activeTab === 'huggingface' && item.downloads != null && (
                  <span className="text-sm text-text-tertiary">↓ {fmt(item.downloads)}</span>
                )}
                {activeTab === 'news' && (
                  <span className="text-xs text-accent">查看 →</span>
                )}
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
