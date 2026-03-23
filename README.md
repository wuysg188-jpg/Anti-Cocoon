# Anti-Cocoon AI · 跨界情报看板

<div align="center">

[![版本](https://img.shields.io/github/v/tag/wuysg188-jpg/Anti-Cocoon?style=flat-square&color=blue)](https://github.com/wuysg188-jpg/Anti-Cocoon/releases)
[![许可证](https://img.shields.io/github/license/wuysg188-jpg/Anti-Cocoon?style=flat-square&color=green)](LICENSE)
[![Stars](https://img.shields.io/github/stars/wuysg188-jpg/Anti-Cocoon?style=flat-square&color=yellow)](https://github.com/wuysg188-jpg/Anti-Cocoon/stargazers)
[![Forks](https://img.shields.io/github/forks/wuysg188-jpg/Anti-Cocoon?style=flat-square&color=orange)](https://github.com/wuysg188-jpg/Anti-Cocoon/network/members)

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare_Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![PWA](https://img.shields.io/badge/PWA-支持离线-5A0FC8?style=flat-square)](https://web.dev/pwa/)

[🌐 在线预览](https://wuysg188-jpg.github.io/Anti-Cocoon/) | [📖 文档](#-项目架构) | [🐛 提交Issue](https://github.com/wuysg188-jpg/Anti-Cocoon/issues)

</div>

> **打破信息茧房，拥抱多元视角** 🌍

一个基于 AI 的新闻聚合与分析平台。支持自定义订阅源、本地 RAG 问答、多模型交叉审查，完全掌控你的信息流。

## ✨ 核心特性

### 📰 信息聚合
- **OPML 订阅源** - 导入/导出 RSS，完全掌控数据源
- **多源聚合** - Google News、GitHub、HuggingFace
- **股票搜索** - 支持 A股/港股/美股 代码搜索

### 🤖 AI 分析
- **深度解读** - 单模型深度分析新闻
- **交叉审查** - 多模型并发验证可靠性
- **本地 RAG** - 基于存储新闻的智能问答

### 🔧 工程优化
- **自建 Worker** - Cloudflare Workers 解决 CORS
- **边缘解析** - XML→JSON 在边缘节点完成
- **PWA 支持** - 可安装、离线缓存

### 🔐 隐私安全
- **BYOK 模式** - 自带 API 密钥
- **本地存储** - IndexedDB，数据不离端
- **零追踪** - 不收集任何用户数据

## 🏗️ 项目架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Anti-Cocoon v0.5.0                      │
├─────────────────────────────────────────────────────────────┤
│  前端 (GitHub Pages)                                         │
│  ├── React 18 + Vite 5 + Tailwind CSS                       │
│  ├── OPML 订阅源管理                                         │
│  ├── 本地 RAG 问答                                           │
│  └── PWA 离线支持                                            │
├─────────────────────────────────────────────────────────────┤
│  Worker (Cloudflare)                                         │
│  ├── RSS 代理                                                │
│  ├── XML → JSON 解析                                         │
│  └── 搜索聚合                                                │
├─────────────────────────────────────────────────────────────┤
│  存储 (IndexedDB)                                            │
│  ├── 新闻缓存                                                │
│  ├── AI 分析结果                                             │
│  └── 订阅源配置                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ 技术栈

| 类别 | 技术 | 用途 |
|:---|:---|:---|
| 前端框架 | React 18 | UI 组件化 |
| 构建工具 | Vite 5 | 快速构建 |
| 样式方案 | Tailwind CSS 3 | 原子化样式 |
| 后端代理 | Cloudflare Workers | CORS 解决 + XML 解析 |
| 本地存储 | IndexedDB | 大容量缓存 |
| AI 接口 | OpenAI 兼容 API | 深度分析 |
| PWA | Service Worker | 离线支持 |

## 🚀 快速开始

### 方式一：直接使用（推荐）

访问在线版本：https://wuysg188-jpg.github.io/Anti-Cocoon/

### 方式二：本地开发

```bash
# 克隆项目
git clone https://github.com/wuysg188-jpg/Anti-Cocoon.git
cd Anti-Cocoon

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

### 方式三：部署 Worker（可选）

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 部署 Worker
cd server
wrangler deploy
```

## ⚙️ 配置说明

### AI 模型配置（BYOK）

1. 点击右上角 ⚙️ 设置图标
2. 添加 AI 模型：
   - **API Key**: 你的 API 密钥
   - **Base URL**: API 端点（如 `https://api.openai.com/v1`）
   - **Model ID**: 模型名称（如 `gpt-4o-mini`）
3. 支持任何 OpenAI 兼容 API

### OPML 订阅源

1. 点击顶部 📡 图标
2. **导入**: 从 Feedly/Inoreader 导出 OPML 文件
3. **导出**: 备份你的订阅源
4. **添加**: 手动添加 RSS/Atom 源

## 📁 项目结构

```
Anti-Cocoon/
├── src/
│   ├── components/
│   │   ├── TrendingBoard.jsx    # 热榜组件
│   │   ├── OPMLManager.jsx      # 订阅源管理
│   │   ├── LocalRAG.jsx         # 本地 RAG 问答
│   │   └── TranslateWidget.jsx  # 翻译组件
│   ├── utils/
│   │   ├── aiService.js         # AI 服务
│   │   ├── opml.js              # OPML 解析
│   │   ├── storage.js           # IndexedDB 存储
│   │   └── classifier.js        # 新闻分类
│   ├── config/
│   │   └── index.js             # 配置文件
│   └── App.jsx                  # 主应用
├── server/
│   ├── worker.js                # Cloudflare Worker
│   └── wrangler.toml            # 部署配置
├── public/
│   ├── manifest.json            # PWA 配置
│   └── sw.js                    # Service Worker
└── package.json
```

## 📊 版本历史

| 版本 | 日期 | 主要更新 |
|:---|:---|:---|
| v0.5.0 | 2026-03-22 | OPML、PWA、Worker XML解析、本地RAG |
| v0.4.0 | 2026-03-22 | Worker代理、AI分类、IndexedDB |
| v0.3.0 | 2026-03-22 | 架构重构、统一配置 |
| v0.2.0 | 2026-03-22 | 股票代码搜索 |
| v0.1.0 | 2026-03-22 | 初始版本 |

完整日志：[CHANGELOG.md](CHANGELOG.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

```bash
# Fork 项目
# 创建功能分支
git checkout -b feature/AmazingFeature

# 提交更改
git commit -m 'Add AmazingFeature'

# 推送分支
git push origin feature/AmazingFeature

# 打开 Pull Request
```

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

## 🙏 致谢

- [Cloudflare Workers](https://workers.cloudflare.com/) - 边缘计算平台
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [React](https://react.dev/) - UI 框架
- [Lucide](https://lucide.dev/) - 图标库

---

<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐ Star！**

</div>
