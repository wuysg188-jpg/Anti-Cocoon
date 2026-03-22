# Anti-Cocoon AI · 跨界情报看板

<div align="center">

[![版本](https://img.shields.io/github/v/tag/wuysg188-jpg/Anti-Cocoon?style=flat-square&color=blue)](https://github.com/wuysg188-jpg/Anti-Cocoon/releases)
[![许可证](https://img.shields.io/github/license/wuysg188-jpg/Anti-Cocoon?style=flat-square&color=green)](LICENSE)
[![Stars](https://img.shields.io/github/stars/wuysg188-jpg/Anti-Cocoon?style=flat-square&color=yellow)](https://github.com/wuysg188-jpg/Anti-Cocoon/stargazers)
[![Forks](https://img.shields.io/github/forks/wuysg188-jpg/Anti-Cocoon?style=flat-square&color=orange)](https://github.com/wuysg188-jpg/Anti-Cocoon/network/members)
[![Issues](https://img.shields.io/github/issues/wuysg188-jpg/Anti-Cocoon?style=flat-square&color=red)](https://github.com/wuysg188-jpg/Anti-Cocoon/issues)

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-部署成功-222222?style=flat-square&logo=github&logoColor=white)](https://wuysg188-jpg.github.io/Anti-Cocoon/)

[🌐 在线预览](https://wuysg188-jpg.github.io/Anti-Cocoon/) | [📖 文档](#) | [🐛 提交Issue](https://github.com/wuysg188-jpg/Anti-Cocoon/issues)

</div>

一个旨在**打破信息茧房**的AI驱动型新闻聚合与分析平台。以情报终端的视角，聚合全球资讯，通过多AI模型交叉审查，洞见事件底层逻辑。

## 📖 项目简介

Anti-Cocoon AI 是一个基于React + Tailwind CSS + Vite构建的现代化前端应用。它集成了新闻聚合、AI深度分析、智能分类等功能，专注于解决信息茧房问题，提供多维度、跨视角的新闻解读。

## ✨ 主要功能

- **📈 股票代码搜索**：输入股票代码即可查看个股相关新闻
  - 支持A股（如：600519贵州茅台、000858五粮液）
  - 支持港股（如：0700腾讯、9988阿里巴巴）
  - 支持美股（如：AAPL苹果、TSLA特斯拉）
  - 内置200+热门股票代码映射
- **📰 多新闻源聚合**：Google News、Bing News、Yahoo News
- **🤖 AI深度分析**：单模型深度解读与多模型交叉审查
- **🏷️ 智能分类**：10个预设类别，关键词正则匹配快速归档
- **📋 阅读清单**：收藏新闻条目，方便后续查阅
- **🌐 多语言翻译**：集成Google Translate，支持页面级翻译
- **🔐 BYOK模式**：自带API密钥，隐私安全有保障
- **💾 本地缓存**：分析结果本地存储，避免重复消耗
- **🎨 响应式设计**：支持桌面端/移动端，深色/浅色主题

## 🛠️ 技术栈

| 类别 | 技术 |
|:---|:---|
| 前端框架 | React 18 |
| 构建工具 | Vite 5 |
| 样式方案 | Tailwind CSS 3 |
| Markdown渲染 | react-markdown + remark-gfm |
| 图标库 | lucide-react |
| 数据源 | Google News RSS |
| 数据存储 | LocalStorage |

## 🚀 快速开始

### 环境要求

- Node.js 16+
- npm 或 yarn

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/wuysg188-jpg/Anti-Cocoon.git
   cd Anti-Cocoon
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```
   应用将运行在 `http://localhost:5173`

4. **构建生产版本**
   ```bash
   npm run build
   ```

## ⚙️ 配置说明

### AI模型配置（BYOK模式）

项目采用BYOK（Bring Your Own Key）模式，需要用户自行配置AI模型：

1. 打开应用后，点击右上角设置图标
2. 添加AI模型配置：
   - **API Key**：从AI服务商获取
   - **Base URL**：API端点地址
   - **Model ID**：模型标识符
3. 支持兼容OpenAI API格式的服务商（OpenAI、DeepSeek、Claude、通义千问等）

### 新闻分类

项目内置10个预设分类：
- 半导体、人工智能、生物科技、新能源、航天
- 地缘政治、经济、加密货币、健康、娱乐

## 📁 项目结构

```
Anti-Cocoon-AI-Web/
├── index.html            # 入口HTML
├── package.json          # 项目配置
├── vite.config.js        # Vite配置
├── tailwind.config.js    # Tailwind配置
├── postcss.config.js     # PostCSS配置
├── CHANGELOG.md          # 更新日志
├── .gitignore            # Git忽略文件
└── src/
    ├── main.jsx          # 应用入口
    ├── App.jsx           # 根组件
    ├── index.css         # 全局样式
    ├── components/
    │   └── TranslateWidget.jsx  # 翻译组件
    └── utils/
        ├── aiService.js  # AI服务核心
        └── classifier.js # 新闻分类器
```

## 🔧 特殊功能

### 多模型交叉审查

- 支持配置多个AI模型进行"三方审查"
- 使用`Promise.allSettled`并发执行，单个模型失败不影响其他结果
- 自动对比不同模型的分析结果，验证信息可靠性

### CORS代理瀑布流

- 配置多个公共CORS代理
- 自动尝试，提高Google News RSS获取成功率

### 隐私安全

- 所有敏感信息（API密钥、分析缓存）仅存储在浏览器LocalStorage
- 不经过任何后端服务器中转

## 📝 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本更新历史。

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开Pull Request

## 📄 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- 感谢所有提供CORS代理的公共服务
- 感谢Tailwind CSS团队提供的优秀工具
- 感谢React社区的支持和贡献

---

**打破信息茧房，拥抱多元视角** 🌍