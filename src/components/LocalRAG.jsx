/**
 * LocalRAG.jsx — 本地情报问答
 * 
 * 基于 IndexedDB 中存储的新闻进行本地问答
 * 实现纯前端微型 RAG
 */

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, User, Loader2, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function LocalRAG({ newsItems = [], modelConfig, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 构建上下文
  const buildContext = (query) => {
    // 从新闻列表中找到相关内容
    const queryLower = query.toLowerCase();
    const relevantNews = newsItems
      .filter(item => {
        const text = `${item.title} ${item.description || ''}`.toLowerCase();
        // 简单的关键词匹配
        const keywords = queryLower.split(/\s+/);
        return keywords.some(kw => text.includes(kw));
      })
      .slice(0, 10); // 最多取10条

    if (relevantNews.length === 0) {
      // 如果没有匹配的，返回最近的新闻
      return newsItems.slice(0, 15);
    }

    return relevantNews;
  };

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // 获取相关上下文
      const context = buildContext(input);
      
      if (context.length === 0) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '当前没有存储任何新闻数据。请先搜索一些新闻，然后再进行问答。'
        }]);
        setLoading(false);
        return;
      }

      // 构建 prompt
      const newsContext = context.map((item, i) => 
        `${i + 1}. [${item.sourceName || '未知来源'}] ${item.title}${item.description ? '\n   ' + item.description.slice(0, 100) : ''}`
      ).join('\n');

      const systemPrompt = `你是一个新闻情报分析助手。基于以下存储的新闻数据回答用户问题。

新闻数据（共 ${context.length} 条）：
${newsContext}

请根据以上新闻数据回答用户问题。如果数据中没有相关信息，请如实说明。回答请使用中文，简洁明了。`;

      // 调用 AI
      const response = await callAI(systemPrompt, input, modelConfig);
      
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `抱歉，处理出错：${error.message}`
      }]);
    }

    setLoading(false);
  };

  // 调用 AI API
  const callAI = async (systemPrompt, userQuery, config) => {
    if (!config || !config.apiKey) {
      throw new Error('请先配置 AI 模型（点击右上角设置）');
    }

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelId || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuery },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API 错误: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '无法获取回答';
  };

  // 快捷问题
  const quickQuestions = [
    '总结一下最近的重要新闻',
    '有什么科技领域的最新动态？',
    '最近有哪些重大事件？',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-card rounded-2xl border border-bg-border shadow-xl w-full max-w-2xl h-[80vh] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-bg-border">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-accent" />
            <h2 className="text-lg font-semibold text-text-primary">情报问答</h2>
            <span className="text-xs text-text-tertiary">基于 {newsItems.length} 条新闻</span>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">✕</button>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Bot size={32} className="mx-auto text-text-tertiary mb-3" />
              <p className="text-sm text-text-secondary mb-4">
                我可以基于你存储的新闻回答问题
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q)}
                    className="text-xs px-3 py-1.5 rounded-full bg-bg-surface border border-bg-border text-text-secondary hover:border-accent hover:text-accent transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <Bot size={16} className="text-accent" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user' 
                  ? 'bg-accent text-white' 
                  : 'bg-bg-surface border border-bg-border'
              }`}>
                {msg.role === 'user' ? (
                  <p className="text-sm">{msg.content}</p>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-bg-surface flex items-center justify-center shrink-0">
                  <User size={16} className="text-text-secondary" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-accent" />
              </div>
              <div className="bg-bg-surface rounded-2xl px-4 py-3 border border-bg-border">
                <Loader2 size={16} className="animate-spin text-accent" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 输入框 */}
        <div className="p-4 border-t border-bg-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="输入你的问题..."
              className="flex-1 input text-sm"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="btn-primary px-4 rounded-lg disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
