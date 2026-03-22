/**
 * TranslateWidget.jsx — 自定义全页翻译控件
 *
 * 使用 Google Translate API 动态翻译，不刷新页面
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Languages, ChevronDown, Check, Loader2 } from 'lucide-react';

const LANGUAGES = [
  { code: 'en',    label: 'English',   flag: '🇺🇸' },
  { code: 'zh-CN', label: '简体中文',   flag: '🇨🇳' },
  { code: 'zh-TW', label: '繁體中文',   flag: '🇹🇼' },
  { code: 'ja',    label: '日本語',     flag: '🇯🇵' },
  { code: 'ko',    label: '한국어',     flag: '🇰🇷' },
  { code: 'fr',    label: 'Français',  flag: '🇫🇷' },
  { code: 'de',    label: 'Deutsch',   flag: '🇩🇪' },
  { code: 'es',    label: 'Español',   flag: '🇪🇸' },
  { code: 'ru',    label: 'Русский',   flag: '🇷🇺' },
];

// 存储当前语言的 key
const LANG_STORAGE_KEY = 'anti_cocoon_lang';

/**
 * 获取当前存储的语言代码
 */
function getCurrentLangCode() {
  try {
    return localStorage.getItem(LANG_STORAGE_KEY) || 'en';
  } catch {
    return 'en';
  }
}

/**
 * 动态翻译页面内容（使用 Google Translate 免费接口）
 */
async function translatePage(targetLang) {
  // 如果是英文，恢复原文
  if (targetLang === 'en') {
    restoreOriginalText();
    return;
  }

  // 获取所有文本节点
  const textNodes = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // 跳过脚本、样式、已翻译标记等
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'code', 'pre'].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest('#google_translate_element')) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let node;
  while (node = walker.nextNode()) {
    // 保存原始文本
    if (!node._originalText) {
      node._originalText = node.textContent;
    }
    textNodes.push(node);
  }

  // 批量翻译（每次最多100个文本）
  const BATCH_SIZE = 100;
  for (let i = 0; i < textNodes.length; i += BATCH_SIZE) {
    const batch = textNodes.slice(i, i + BATCH_SIZE);
    const texts = batch.map(n => n._originalText || n.textContent);
    
    try {
      const translated = await translateTexts(texts, targetLang);
      if (translated && translated.length === batch.length) {
        batch.forEach((node, idx) => {
          node.textContent = translated[idx];
        });
      }
    } catch (err) {
      console.warn('Translation batch failed:', err);
    }
  }
}

/**
 * 恢复原始文本
 */
function restoreOriginalText() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT
  );

  let node;
  while (node = walker.nextNode()) {
    if (node._originalText) {
      node.textContent = node._originalText;
    }
  }
}

/**
 * 调用 Google Translate API 翻译文本数组
 */
async function translateTexts(texts, targetLang) {
  const textParam = texts.map(t => `q=${encodeURIComponent(t)}`).join('&');
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&${textParam}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Translation failed');
  
  const data = await response.json();
  // 提取翻译结果
  const translated = data[0].map(item => item[0]);
  return translated;
}

export default function TranslateWidget() {
  const [open, setOpen] = useState(false);
  const [currentCode, setCurrentCode] = useState(() => getCurrentLangCode());
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    // 点击外部关闭
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // 初始化时恢复之前的语言
  useEffect(() => {
    const savedLang = getCurrentLangCode();
    if (savedLang && savedLang !== 'en') {
      // 延迟执行，等待页面加载完成
      setTimeout(() => {
        translatePage(savedLang);
      }, 1000);
    }
  }, []);

  const currentLang = LANGUAGES.find((l) => l.code === currentCode) || LANGUAGES[0];

  const handleSelect = async (lang) => {
    if (lang.code === currentCode || loading) {
      setOpen(false);
      return;
    }

    setLoading(true);
    setOpen(false);
    setCurrentCode(lang.code);
    
    try {
      // 保存语言偏好
      localStorage.setItem(LANG_STORAGE_KEY, lang.code);
      
      // 动态翻译页面（不刷新）
      await translatePage(lang.code);
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      {/* 触发按钮 */}
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-500/25 bg-amber-500/8 hover:bg-amber-500/15 text-amber-300/80 hover:text-amber-200 transition-all text-xs font-medium disabled:opacity-50"
        title="切换页面语言"
      >
        {loading ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Languages size={13} />
        )}
        <span className="hidden sm:inline">{currentLang.flag} {currentLang.label}</span>
        <span className="inline sm:hidden">{currentLang.flag}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* 下拉菜单 */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 py-1 z-50 animate-fade-in">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-white/6 transition-colors ${
                lang.code === currentCode
                  ? 'text-amber-300 font-medium'
                  : 'text-white/65 hover:text-white/90'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </span>
              {lang.code === currentCode && <Check size={11} className="text-amber-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
