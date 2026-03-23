/**
 * TrendingBoard.jsx — 每日热榜组件
 * 
 * 功能：
 * - 显示各分类热门新闻/项目
 * - 支持排名和热度显示
 * - 点击搜索相关新闻
 * - 包含科技、财经、汽车、国际、GitHub、HuggingFace
 */

import { useState } from 'react';
import { TrendingUp, Github, BrainCircuit } from 'lucide-react';

// 热门话题分类
const TRENDING_DATA = [
  {
    id: 'tech',
    name: '科技',
    icon: '💻',
    color: '#3b82f6',
    items: [
      { rank: 1, title: 'ChatGPT', hot: 987 },
      { rank: 2, title: '人工智能', hot: 856 },
      { rank: 3, title: '芯片半导体', hot: 743 },
      { rank: 4, title: '苹果 iPhone', hot: 698 },
      { rank: 5, title: '华为', hot: 654 },
    ],
  },
  {
    id: 'finance',
    name: '财经',
    icon: '💰',
    color: '#10b981',
    items: [
      { rank: 1, title: 'A股行情', hot: 923 },
      { rank: 2, title: '比特币', hot: 876 },
      { rank: 3, title: '央行利率', hot: 765 },
      { rank: 4, title: '茅台股价', hot: 654 },
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
  {
    id: 'github',
    name: 'GitHub',
    icon: '⭐',
    color: '#8b5cf6',
    items: [
      { rank: 1, title: 'ChatGPT', hot: '120k', url: 'https://github.com/search?q=ChatGPT' },
      { rank: 2, title: 'React', hot: '218k', url: 'https://github.com/facebook/react' },
      { rank: 3, title: 'Vue.js', hot: '206k', url: 'https://github.com/vuejs/core' },
      { rank: 4, title: 'TensorFlow', hot: '183k', url: 'https://github.com/tensorflow/tensorflow' },
      { rank: 5, title: 'Python', hot: '168k', url: 'https://github.com/python/cpython' },
    ],
  },
  {
    id: 'huggingface',
    name: 'HuggingFace',
    icon: '🤗',
    color: '#ec4899',
    items: [
      { rank: 1, title: 'LLaMA', hot: '10M', url: 'https://huggingface.co/meta-llama' },
      { rank: 2, title: 'Stable Diffusion', hot: '8M', url: 'https://huggingface.co/runwayml/stable-diffusion-v1-5' },
      { rank: 3, title: 'BERT', hot: '5M', url: 'https://huggingface.co/bert-base-uncased' },
      { rank: 4, title: 'Whisper', hot: '4M', url: 'https://huggingface.co/openai/whisper-large-v3' },
      { rank: 5, title: 'GPT-2', hot: '3M', url: 'https://huggingface.co/gpt2' },
    ],
  },
];

export default function TrendingBoard({ onSearch }) {
  const [activeCategory, setActiveCategory] = useState('tech');

  // 获取当前分类的数据
  const currentCategory = TRENDING_DATA.find(c => c.id === activeCategory) || TRENDING_DATA[0];

  // 处理点击
  const handleClick = (item) => {
    if (onSearch) {
      onSearch(item.title);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-accent" />
        <h2 className="text-subheading text-text-primary">每日热榜</h2>
      </div>

      {/* 分类标签 */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-2">
        {TRENDING_DATA.map((category) => (
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
            onClick={() => handleClick(item)}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-bg-hover transition-colors border-b border-bg-border last:border-b-0 text-left group"
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
            <span className="flex-1 text-sm text-text-primary group-hover:text-accent transition-colors truncate">
              {item.title}
            </span>

            {/* 分类标识 */}
            {(activeCategory === 'github' || activeCategory === 'huggingface') && (
              <span className="text-xs text-text-tertiary">
                {activeCategory === 'github' ? <Github size={12} /> : <BrainCircuit size={12} />}
              </span>
            )}

            {/* 热度 */}
            <span className={`text-xs ${
              idx < 3 ? 'text-red-500 font-medium' : 'text-text-tertiary'
            }`}>
              {typeof item.hot === 'number' ? `${item.hot}万` : item.hot}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
