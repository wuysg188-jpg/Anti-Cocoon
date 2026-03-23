# Anti-Cocoon Worker — 代理服务部署指南

## 为什么需要代理服务？

公共 CORS 代理（如 allorigins.win、corsproxy.io）存在以下问题：
- **速率限制** - 容易被封禁
- **不稳定** - 随时可能宕机
- **安全隐患** - 数据经过第三方服务器

自建代理可以彻底解决这些问题，且部署成本几乎为零。

## 部署到 Cloudflare Workers

### 1. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

### 3. 部署

```bash
cd server
wrangler deploy
```

部署完成后，你会得到一个类似 `https://anti-cocoon-proxy.<你的用户名>.workers.dev` 的 URL。

### 4. 配置前端

在 `src/config/index.js` 中添加你的 Worker URL：

```javascript
export const API_BASE_URL = 'https://anti-cocoon-proxy.<你的用户名>.workers.dev';
```

## API 端点

### `/api/rss`
代理 RSS 请求并解析为 JSON

**参数：**
- `url` - RSS 源 URL

**示例：**
```
/api/rss?url=https://news.google.com/rss?hl=zh-CN
```

### `/api/search`
搜索新闻聚合

**参数：**
- `q` - 搜索关键词
- `limit` - 返回数量（默认20）

**示例：**
```
/api/search?q=ChatGPT&limit=10
```

### `/health`
健康检查

**响应：**
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

## 可选：使用 KV 缓存

1. 创建 KV 命名空间：
```bash
wrangler kv:namespace create CACHE
```

2. 将返回的 ID 填入 `wrangler.toml`：
```toml
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
```

3. 取消 `worker.js` 中 `getCache` 和 `setCache` 的注释

## 成本

Cloudflare Workers 免费额度：
- **10万请求/天**
- **10ms CPU 时间/请求**
- **无限带宽**

对于个人项目完全够用。
