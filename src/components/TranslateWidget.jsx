/**
 * TranslateWidget.jsx — 自定义全页翻译控件
 *
 * 原理：Google Translate 读取浏览器的 `googtrans` cookie 决定目标语言。
 * 设置 cookie 后重载页面，Google CDN 脚本会自动翻译全部可见文本。
 * 完全不使用 Google 注入的默认 UI，避免丑陋的顶部栏。
 *
 * 支持语言：英文(原文) / 中文简体 / 中文繁体 / 日文 / 韩文 / 法文 / 德文 / 西班牙文 / 阿拉伯文
 */

import { useState, useEffect, useRef } from 'react';
import { Languages, ChevronDown, Check } from 'lucide-react';

const LANGUAGES = [
  { code: null,   label: '原文 / EN',  flag: '🌐' },
  { code: 'zh-CN', label: '简体中文',   flag: '🇨🇳' },
  { code: 'zh-TW', label: '繁體中文',   flag: '🇹🇼' },
  { code: 'ja',    label: '日本語',     flag: '🇯🇵' },
  { code: 'ko',    label: '한국어',     flag: '🇰🇷' },
  { code: 'fr',    label: 'Français',  flag: '🇫🇷' },
  { code: 'de',    label: 'Deutsch',   flag: '🇩🇪' },
  { code: 'es',    label: 'Español',   flag: '🇪🇸' },
  { code: 'ar',    label: 'العربية',   flag: '🇸🇦' },
  { code: 'ru',    label: 'Русский',   flag: '🇷🇺' },
];

/**
 * 读取当前 googtrans cookie 中的目标语言代码
 */
function getCurrentLangCode() {
  try {
    const match = document.cookie.match(/googtrans=\/[a-z-]+\/([^;]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * 设置 googtrans cookie，支持跨主域名（同时写 / 和 .host）
 */
function setGoogTransCookie(targetCode) {
  const value = targetCode ? `/auto/${targetCode}` : '/auto/auto';
  const expire = targetCode
    ? 'expires=Fri, 31 Dec 9999 23:59:59 GMT'
    : 'expires=Thu, 01 Jan 1970 00:00:00 GMT'; // 清除

  // 写两条以覆盖 Google Translate 可能检测的全部路径
  document.cookie = `googtrans=${value}; ${expire}; path=/`;
  document.cookie = `googtrans=${value}; ${expire}; path=/; domain=${location.hostname}`;
}

/**
 * 注入 Google Translate element.js（仅一次，用于驱动翻译引擎）
 * 我们不渲染 Google 的默认 UI，但依赖其底层翻译引擎
 */
function injectGoogleTranslateScript() {
  if (document.getElementById('gt-engine-script')) return;

  // 初始化翻译引擎
  window.googleTranslateElementInit = () => {
    new window.google.translate.TranslateElement(
      { pageLanguage: 'auto', autoDisplay: false },
      'google_translate_element'
    );
  };

  const script = document.createElement('script');
  script.id = 'gt-engine-script';
  script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  script.async = true;
  document.head.appendChild(script);
}

export default function TranslateWidget() {
  const [open, setOpen] = useState(false);
  const [currentCode, setCurrentCode] = useState(() => getCurrentLangCode());
  const menuRef = useRef(null);

  useEffect(() => {
    injectGoogleTranslateScript();

    // 点击外部关闭
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentLang = LANGUAGES.find((l) => l.code === currentCode) || LANGUAGES[0];

  const handleSelect = (lang) => {
    if (lang.code === currentCode) {
      setOpen(false);
      return;
    }

    if (lang.code === null) {
      // 还原原文：清除 cookie 并强制刷新
      setGoogTransCookie(null);
      setCurrentCode(null);
      setOpen(false);
      window.location.reload();
    } else {
      // 设置翻译目标语言 cookie 并刷新
      setGoogTransCookie(lang.code);
      setCurrentCode(lang.code);
      setOpen(false);
      window.location.reload();
    }
  };

  return (
    <div ref={menuRef} className="relative">
      {/* 触发按钮 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-500/25 bg-amber-500/8 hover:bg-amber-500/15 text-amber-300/80 hover:text-amber-200 transition-all text-xs font-medium"
        title="切换页面语言"
      >
        <Languages size={13} />
        <span className="hidden sm:inline">{currentLang.flag} {currentLang.label}</span>
        <span className="inline sm:hidden">{currentLang.flag}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* 下拉菜单 */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 py-1 z-50 animate-fade-in">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code ?? 'original'}
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

      {/* 隐藏的 Google Translate 挂载点（不显示任何 UI） */}
      <div id="google_translate_element" style={{ display: 'none' }} />
    </div>
  );
}
