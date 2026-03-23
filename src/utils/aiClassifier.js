/**
 * aiClassifier.js — AI 语义分类器
 * 
 * 使用轻量级 AI 模型进行新闻分类
 * 支持批量分类，减少 API 调用次数
 */

// ─── 分类配置 ────────────────────────────────────────────────────────────

export const AI_CATEGORIES = [
  { id: 'semiconductor', label: '半导体', icon: '🔲', keywords: ['芯片', '半导体', '晶圆', '台积电', 'Intel', 'AMD', 'NVIDIA'] },
  { id: 'ai', label: '人工智能', icon: '🤖', keywords: ['AI', 'ChatGPT', '大模型', '深度学习', '机器学习'] },
  { id: 'biotech', label: '生物科技', icon: '🧬', keywords: ['基因', '疫苗', '制药', '医药', '生物科技'] },
  { id: 'energy', label: '新能源', icon: '🔋', keywords: ['光伏', '电池', '新能源', '锂电', '氢能'] },
  { id: 'aerospace', label: '航天', icon: '🚀', keywords: ['火箭', '卫星', '航天', 'SpaceX', '太空'] },
  { id: 'geopolitics', label: '地缘政治', icon: '🗺️', keywords: ['制裁', '外交', '贸易战', '关税', '地缘'] },
  { id: 'economy', label: '经济', icon: '📈', keywords: ['GDP', '通胀', '利率', '央行', '经济'] },
  { id: 'crypto', label: '加密货币', icon: '₿', keywords: ['比特币', '以太坊', '区块链', '加密'] },
  { id: 'health', label: '健康', icon: '🏥', keywords: ['健康', '医院', '疾病', '疫情'] },
  { id: 'entertainment', label: '娱乐', icon: '🎬', keywords: ['电影', '音乐', '游戏', '综艺'] },
];

// ─── AI 分类函数 ──────────────────────────────────────────────────────────

/**
 * 使用 AI 对新闻进行语义分类
 * @param {Array} newsItems - 新闻条目数组
 * @param {Object} modelConfig - AI 模型配置
 * @returns {Promise<Array>} 带分类标签的新闻数组
 */
export async function classifyWithAI(newsItems, modelConfig) {
  if (!modelConfig || !modelConfig.apiKey) {
    // 没有配置 AI，回退到关键词分类
    return classifyWithKeywords(newsItems);
  }

  try {
    // 构建分类提示词
    const prompt = buildClassificationPrompt(newsItems);
    
    // 调用 AI API
    const response = await fetch(`${modelConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${modelConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: modelConfig.modelId || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `你是一个新闻分类器。请将每条新闻分类到以下类别之一：
${AI_CATEGORIES.map(c => `- ${c.id}: ${c.label}`).join('\n')}

请返回 JSON 数组，每个元素格式：{"index": 数字, "category": "类别ID"}

只返回 JSON，不要其他内容。`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0,
        max_tokens: 1000,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No AI response');
    }

    // 解析 AI 返回的分类结果
    const classifications = JSON.parse(content);
    
    // 应用分类结果
    return newsItems.map((item, idx) => {
      const classification = classifications.find(c => c.index === idx);
      const categoryId = classification?.category || 'uncategorized';
      const catDef = AI_CATEGORIES.find(c => c.id === categoryId);
      
      return {
        ...item,
        categoryId,
        categoryLabel: catDef?.label || '未分类',
        categoryIcon: catDef?.icon || '📁',
      };
    });
  } catch (error) {
    console.warn('AI 分类失败，回退到关键词分类:', error);
    return classifyWithKeywords(newsItems);
  }
}

/**
 * 构建分类提示词
 */
function buildClassificationPrompt(newsItems) {
  const lines = newsItems.map((item, idx) => 
    `${idx}. ${item.title}${item.description ? ' - ' + item.description.slice(0, 100) : ''}`
  );
  
  return `请对以下新闻进行分类：

${lines.join('\n')}`;
}

// ─── 关键词分类（回退方案）────────────────────────────────────────────────

/**
 * 使用关键词匹配进行分类
 * @param {Array} newsItems - 新闻条目数组
 * @returns {Array} 带分类标签的新闻数组
 */
export function classifyWithKeywords(newsItems) {
  return newsItems.map(item => {
    const text = `${item.title} ${item.description || ''}`.toLowerCase();
    
    let bestMatch = null;
    let bestScore = 0;
    
    for (const category of AI_CATEGORIES) {
      let score = 0;
      for (const keyword of category.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          score += keyword.length; // 更长的关键词权重更高
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = category;
      }
    }
    
    if (bestMatch && bestScore > 0) {
      return {
        ...item,
        categoryId: bestMatch.id,
        categoryLabel: bestMatch.label,
        categoryIcon: bestMatch.icon,
      };
    }
    
    return {
      ...item,
      categoryId: 'uncategorized',
      categoryLabel: '未分类',
      categoryIcon: '📁',
    };
  });
}

// ─── 按分类分组 ──────────────────────────────────────────────────────────

/**
 * 将新闻按分类分组
 * @param {Array} classifiedItems - 带分类标签的新闻数组
 * @returns {Object} 按分类分组的新闻
 */
export function groupByCategory(classifiedItems) {
  const groups = { all: classifiedItems, uncategorized: [] };
  
  for (const category of AI_CATEGORIES) {
    groups[category.id] = [];
  }
  
  for (const item of classifiedItems) {
    const categoryId = item.categoryId || 'uncategorized';
    if (groups[categoryId]) {
      groups[categoryId].push(item);
    } else {
      groups.uncategorized.push(item);
    }
  }
  
  return groups;
}
