/**
 * OPMLManager.jsx — 订阅源管理组件
 * 
 * 支持导入/导出 OPML，管理自定义订阅源
 */

import { useState, useRef } from 'react';
import { Upload, Download, Plus, Trash2, Rss } from 'lucide-react';
import { exportOPML, importOPML, loadFeeds, saveFeeds, DEFAULT_FEEDS } from '../utils/opml.js';

export default function OPMLManager({ onClose, onFeedsUpdate }) {
  const [feeds, setFeeds] = useState(loadFeeds());
  const [newFeed, setNewFeed] = useState({ name: '', url: '', category: '自定义' });
  const [showAddForm, setShowAddForm] = useState(false);
  const fileInputRef = useRef(null);

  // 导出 OPML
  const handleExport = () => {
    exportOPML(feeds);
  };

  // 导入 OPML
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedFeeds = await importOPML(file);
      if (importedFeeds.length === 0) {
        alert('未找到有效的订阅源');
        return;
      }
      
      // 合并订阅源（去重）
      const existingUrls = new Set(feeds.map(f => f.url));
      const newFeeds = importedFeeds.filter(f => !existingUrls.has(f.url));
      
      const merged = [...feeds, ...newFeeds];
      setFeeds(merged);
      saveFeeds(merged);
      
      alert(`成功导入 ${newFeeds.length} 个订阅源`);
      if (onFeedsUpdate) onFeedsUpdate(merged);
    } catch (err) {
      alert(err.message);
    }
    
    // 清除文件选择
    e.target.value = '';
  };

  // 添加订阅源
  const handleAdd = () => {
    if (!newFeed.name || !newFeed.url) {
      alert('请填写名称和 URL');
      return;
    }
    
    const updated = [...feeds, { ...newFeed }];
    setFeeds(updated);
    saveFeeds(updated);
    setNewFeed({ name: '', url: '', category: '自定义' });
    setShowAddForm(false);
    
    if (onFeedsUpdate) onFeedsUpdate(updated);
  };

  // 删除订阅源
  const handleDelete = (index) => {
    const updated = feeds.filter((_, i) => i !== index);
    setFeeds(updated);
    saveFeeds(updated);
    
    if (onFeedsUpdate) onFeedsUpdate(updated);
  };

  // 重置为默认
  const handleReset = () => {
    if (confirm('确定要重置为默认订阅源吗？')) {
      setFeeds(DEFAULT_FEEDS);
      saveFeeds(DEFAULT_FEEDS);
      
      if (onFeedsUpdate) onFeedsUpdate(DEFAULT_FEEDS);
    }
  };

  // 按分类分组
  const grouped = {};
  feeds.forEach((feed, index) => {
    const cat = feed.category || '未分类';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ ...feed, index });
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-card rounded-2xl border border-bg-border shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-bg-border">
          <div className="flex items-center gap-2">
            <Rss size={18} className="text-accent" />
            <h2 className="text-lg font-semibold text-text-primary">订阅源管理</h2>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            ✕
          </button>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center gap-2 p-4 border-b border-bg-border">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
          >
            <Upload size={14} />
            导入 OPML
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".opml,.xml"
            onChange={handleImport}
            className="hidden"
          />
          
          <button
            onClick={handleExport}
            className="btn-secondary flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
          >
            <Download size={14} />
            导出 OPML
          </button>
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-ghost flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
          >
            <Plus size={14} />
            添加
          </button>
          
          <button
            onClick={handleReset}
            className="btn-ghost text-text-tertiary ml-auto text-xs"
          >
            重置默认
          </button>
        </div>

        {/* 添加表单 */}
        {showAddForm && (
          <div className="p-4 border-b border-bg-border bg-bg-surface">
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="订阅源名称"
                value={newFeed.name}
                onChange={(e) => setNewFeed({ ...newFeed, name: e.target.value })}
                className="input text-sm"
              />
              <input
                type="url"
                placeholder="RSS/Atom URL"
                value={newFeed.url}
                onChange={(e) => setNewFeed({ ...newFeed, url: e.target.value })}
                className="input text-sm"
              />
              <input
                type="text"
                placeholder="分类（默认：自定义）"
                value={newFeed.category}
                onChange={(e) => setNewFeed({ ...newFeed, category: e.target.value })}
                className="input text-sm"
              />
              <div className="flex gap-2">
                <button onClick={handleAdd} className="btn-primary px-4 py-2 rounded-lg text-sm">
                  确认添加
                </button>
                <button onClick={() => setShowAddForm(false)} className="btn-ghost px-4 py-2 rounded-lg text-sm">
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 订阅源列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {Object.entries(grouped).map(([category, categoryFeeds]) => (
            <div key={category} className="mb-4">
              <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                {category} ({categoryFeeds.length})
              </h3>
              <div className="space-y-1">
                {categoryFeeds.map((feed) => (
                  <div
                    key={feed.index}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg-hover group"
                  >
                    <Rss size={14} className="text-text-tertiary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-primary truncate">{feed.name}</div>
                      <div className="text-xs text-text-tertiary truncate">{feed.url}</div>
                    </div>
                    <button
                      onClick={() => handleDelete(feed.index)}
                      className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-error transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {feeds.length === 0 && (
            <div className="text-center py-8 text-text-tertiary text-sm">
              暂无订阅源，点击"导入 OPML"或"添加"开始
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="p-4 border-t border-bg-border text-center text-xs text-text-tertiary">
          共 {feeds.length} 个订阅源 · 支持 OPML 格式导入导出
        </div>
      </div>
    </div>
  );
}
