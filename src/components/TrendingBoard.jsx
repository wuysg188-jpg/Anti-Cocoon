/**
 * TrendingBoard.jsx — 每日热榜组件
 * 
 * 功能：
 * - 显示各分类热门新闻
 * - 支持排名和热度显示
 * - 点击可搜索相关关键词
 */

import { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';

// 热门话题分类
const TRENDING_CATEGORIES = [
  {
    id: 'tech',
    name: '科技',
    icon: '💻',
    color: '#3b82f6',
    items: [
      { rank: 1, title: 'ChatGPT', hot: 987 },
      { rank: 2, title: '人工智能', hot: 856 },
      { rank: 3, title: '芯片半导体', hot: 743 },
      { rank: 4, title: '苹果', hot: 698 },
      { rank: 5, title: '华为', hot: 654 },
    ],
  },
  {
    id: 'finance',
    name: '财经',
    icon: '💰',
    color: '#10b981',
    items: [
      { rank: 1, title: 'A股', hot: 923 },
      { rank: 2, title: '比特币', hot: 876 },
      { rank: 3, title: '央行利率', hot: 765 },
      { rank: 4, title: '茅台', hot: 654 },
      { rank: 5, title: '房地产', hot: 598 },
    ],
  },
  {
    id: 'auto',
    name: '汽车',
    icon: '🚗',
    color: '#ef4444',
    items: [
      { rank: 1, title: '特斯拉', hot: 956 },
      { rank: 2, title: '比亚迪', hot: 843 },
      { rank: 3, title: '新能源汽车', hot: 732 },
      { rank: 4, title: '小米汽车', hot: 654 },
      { rank: 5, title: '自动驾驶', hot: 587 },
    ],
  },
  {
    id: 'global',
    name: '国际',
    icon: '🌍',
    color: '#f59e0b',
    items: [
      { rank: 1, title: '美国大选', hot: 945 },
      { rank: 2, title: '日本经济', hot: 832 },
      { rank: 3, title: '欧洲局势', hot: 721 },
      { rank: 4, title: '中东冲突', hot: 654 },
      { rank: 5, title: '俄乌战争', hot: 598 },
    ],
  },
];

export default function TrendingBoard({ onSearch }) {
  const [activeCategory, setActiveCategory] = useState('tech');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(TRENDING_CATEGORIES);

  // 获取当前分类的数据
  const currentCategory = data.find(c => c.id === activeCategory) || data[0];

  return (
    <div className="animate-fade-in">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-accent" />
          <h2 className="text-subheading text-text-primary">每日热榜</h2>
        </div>
        <span className="text-caption text-text-tertiary">实时更新</span>
      </div>

      {/* 分类标签 */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-2">
        {data.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`pill ${
              activeCategory === category.id ? 'pill-active' : 'pill-default'
            }`}
          >
            <span>{category.icon}</span>
            <span>{category.name}</span>
          </button>
        ))}
      </div>

      {/* 热榜列表 */}
      <div className="card overflow-hidden">
        {currentCategory.items.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSearch && onSearch(item.title)}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-bg-hover transition-colors border-b border-bg-border last:border-b-0 text-left"
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

            {/* 标题 */}
            <span className="flex-1 text-sm text-text-primary truncate">
              {item.title}
            </span>

            {/* 热度 */}
            <span className={`text-xs ${
              idx < 3 ? 'text-red-500 font-medium' : 'text-text-tertiary'
            }`}>
              {item.hot}万
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
