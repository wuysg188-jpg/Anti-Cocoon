/**
 * TrendingBoard.jsx — 真实热榜组件
 * 
 * 点击直接跳转原文
 * 数据来源：GitHub Trending API、HuggingFace API、Google News RSS
 */

import { useState, useEffect } from 'react';
import { TrendingUp, Github, BrainCircuit, ExternalLink, RefreshCw } from 'lucide-react';

// CORS 代理
const PROXY = 'https://api.allorigins.win/raw?url=';

export default function TrendingBoard() {
  const [activeTab, setActiveTab] = useState('github');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    github: [],
    huggingface: [],
    news: [],
  });

  // 获取 GitHub 热门仓库
  const fetchGitHubTrending = async () => {
    try {
      // 使用 GitHub API 搜索今日创建的热门仓库
      const res = await fetch(
        'https://api.github.com/search/repositories?q=stars:>100&sort=stars&order=desc&per_page=10',
        { signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) {
        const json = await res.json();
        return json.items.map((repo, idx) => ({
          rank: idx + 1,
          title: repo.full_name,
          description: repo.description || '',
          stars: repo.stargazers_count,
          language: repo.language,
          url: repo.html_url,
        }));
      }
    } catch (e) {
      console.warn('GitHub 获取失败:', e);
    }
    return [];
  };

  // 获取 HuggingFace 热门模型
  const fetchHuggingFaceTrending = async () => {
    try {
      const res = await fetch(
        'https://huggingface.co/api/models?sort=downloads&direction=-1&limit=10',
        { signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) {
        const json = await res.json();
        return json.map((model, idx) => ({
          rank: idx + 1,
          title: model.id,
          downloads: model.downloads,
          likes: model.likes,
          url: `https://huggingface.co/${model.id}`,
        }));
      }
    } catch (e) {
      console.warn('HuggingFace 获取失败:', e);
    }
    return [];
  };

  // 获取新闻热榜
  const fetchNewsTrending = async () => {
    try {
      const res = await fetch(
        PROXY + encodeURIComponent('https://news.google.com/rss?hl=zh-CN&gl=CN&ceid=CN:zh-Hans'),
        { signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) {
        const text = await res.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'application/xml');
        const items = Array.from(xml.querySelectorAll('item')).slice(0, 10);
        return items.map((item, idx) => ({
          rank: idx + 1,
          title: item.querySelector('title')?.textContent || '',
          source: item.querySelector('source')?.textContent || '',
          url: item.querySelector('link')?.textContent || '#',
          pubDate: item.querySelector('pubDate')?.textContent || '',
        }));
      }
    } catch (e) {
      console.warn('新闻获取失败:', e);
    }
    return [];
  };

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    const [github, huggingface, news] = await Promise.all([
      fetchGitHubTrending(),
      fetchHuggingFaceTrending(),
      fetchNewsTrending(),
    ]);
    setData({ github, huggingface, news });
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // 格式化数字
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  // 标签配置
  const tabs = [
    { id: 'github', name: 'GitHub', icon: <Github size={14} /> },
    { id: 'huggingface', name: 'HuggingFace', icon: <BrainCircuit size={14} /> },
    { id: 'news', name: '新闻', icon: <TrendingUp size={14} /> },
  ];

  // 当前数据
  const currentData = data[activeTab] || [];

  return (
    <div className="animate-fade-in">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-accent" />
          <h2 className="text-subheading text-text-primary">每日热榜</h2>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="btn-ghost p-2 rounded-lg"
          title="刷新"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* 标签 */}
      <div className="flex gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pill flex items-center gap-1.5 ${
              activeTab === tab.id ? 'pill-active' : 'pill-default'
            }`}
          >
            {tab.icon}
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* 列表 */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw size={20} className="animate-spin text-accent mx-auto mb-2" />
            <p className="text-sm text-text-secondary">加载中...</p>
          </div>
        ) : currentData.length === 0 ? (
          <div className="p-8 text-center text-text-tertiary text-sm">
            暂无数据
          </div>
        ) : (
          currentData.map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-bg-hover transition-colors border-b border-bg-border last:border-b-0 group"
            >
              {/* 排名 */}
              <span className={`text-lg font-bold min-w-[24px] text-center ${
                idx === 0 ? 'text-red-500' : 
                idx === 1 ? 'text-orange-500' : 
                idx === 2 ? 'text-yellow-500' :
                'text-text-tertiary'
              }`}>
                {item.rank}
              </span>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-text-primary group-hover:text-accent transition-colors truncate">
                  {item.title}
                </div>
                {item.description && (
                  <div className="text-xs text-text-tertiary truncate mt-0.5">
                    {item.description}
                  </div>
                )}
                {item.source && (
                  <div className="text-xs text-text-tertiary mt-0.5">
                    {item.source}
                  </div>
                )}
              </div>

              {/* 统计 */}
              <div className="flex items-center gap-2 shrink-0">
                {activeTab === 'github' && item.stars && (
                  <span className="text-xs text-yellow-500">⭐ {formatNumber(item.stars)}</span>
                )}
                {activeTab === 'huggingface' && item.downloads && (
                  <span className="text-xs text-text-tertiary">↓ {formatNumber(item.downloads)}</span>
                )}
                {activeTab === 'news' && (
                  <ExternalLink size={12} className="text-text-tertiary group-hover:text-accent" />
                )}
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
