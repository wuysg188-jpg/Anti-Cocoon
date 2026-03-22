/**
 * TranslateWidget.jsx — Google Translate 翻译控件
 *
 * 使用 Google Translate 官方脚本 + cookie 方式
 * 隐藏 Google 注入的默认顶部栏，保持页面原有排版
 */

import { useState, useEffect, useRef } from 'react';
import { Languages, ChevronDown, Check } from 'lucide-react';

const LANGUAGES = [
  { code: '',      label: '原文',     flag: '🌐' },
  { code: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
  { code: 'ja',    label: '日本語',   flag: '🇯🇵' },
  { code: 'ko',    label: '한국어',   flag: '🇰🇷' },
  { code: 'fr',    label: 'Français', flag: '🇫🇷' },
  { code: 'de',    label: 'Deutsch',  flag: '🇩🇪' },
  { code: 'es',    label: 'Español',  flag: '🇪🇸' },
  { code: 'ru',    label: 'Русский',  flag: '🇷🇺' },
];

const LANG_STORAGE_KEY = 'anti_cocoon_translate_lang';

/**
 * 获取当前语言代码
 */
function getCurrentLang() {
  try {
    // 优先从 cookie 读取
    const match = document.cookie.match(/googtrans=\/auto\/([^;]+)/);
    if (match && match[1] !== 'auto') return match[1];
    // 从 localStorage 读取
    return localStorage.getItem(LANG_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * 设置 Google Translate cookie
 */
function setCookie(langCode) {
  const value = langCode ? `/auto/${langCode}` : '/auto/auto';
  const expire = langCode
    ? 'expires=Fri, 31 Dec 9999 23:59:59 GMT'
    : 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
  
  document.cookie = `googtrans=${value}; ${expire}; path=/`;
  document.cookie = `googtrans=${value}; ${expire}; path=/; domain=.${location.hostname}`;
  document.cookie = `googtrans=${value}; ${expire}; path=/; domain=${location.hostname}`;
}

/**
 * 注入 Google Translate 脚本
 */
function injectScript() {
  if (document.getElementById('google-translate-script')) return;
  if (window.google?.translate) return;

  window.googleTranslateElementInit = () => {
    try {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'auto',
          includedLanguages: 'zh-CN,zh-TW,ja,ko,fr,de,es,ru,en',
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        'google_translate_element_hidden'
      );
    } catch (e) {
      console.warn('Google Translate init error:', e);
    }
  };

  const script = document.createElement('script');
  script.id = 'google-translate-script';
  script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  script.async = true;
  document.head.appendChild(script);
}

export default function TranslateWidget() {
  const [open, setOpen] = useState(false);
  const [currentCode, setCurrentCode] = useState(() => getCurrentLang());
  const menuRef = useRef(null);

  useEffect(() => {
    injectScript();

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

    // 保存选择
    localStorage.setItem(LANG_STORAGE_KEY, lang.code);
    setCurrentCode(lang.code);
    setOpen(false);

    // 设置 cookie
    setCookie(lang.code);

    // 刷新页面应用翻译
    window.location.reload();
  };

  return (
    <>
      {/* 隐藏的 Google Translate 挂载点 */}
      <div id="google_translate_element_hidden" style={{ display: 'none' }} />
      
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
                key={lang.code || 'original'}
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
    </>
  );
}
