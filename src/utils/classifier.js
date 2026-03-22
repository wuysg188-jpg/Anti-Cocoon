/**
 * classifier.js
 * 极速本地新闻分类器 — 纯正则特征词路由，微秒级命中匹配
 * 将无序新闻瞬间归入 10 个预设大类
 */

/** @type {Array<{id: string, label: string, icon: string, keywords: RegExp}>} */
export const CATEGORIES = [
  {
    id: 'semiconductor',
    label: '数码与半导体',
    icon: '💾',
    keywords: /chip|semiconductor|wafer|foundry|tsmc|intel|amd|nvidia|qualcomm|arm|risc|soc|cpu|gpu|nand|dram|memory|fab|lithography|photolithography|etching|芯片|半导体|晶圆|晶片|集成电路|光刻|刻蚀|存储|台积电|英伟达|高通|联发科|中芯|华虹|长存|长鑫/i,
  },
  {
    id: 'ai_software',
    label: '人工智能与软件',
    icon: '🤖',
    keywords: /artificial intelligence|machine learning|deep learning|llm|large language model|gpt|gemini|claude|llama|mistral|transformer|neural network|chatbot|generative ai|openai|anthropic|deepseek|qwen|baidu|ernie|midjourney|stable diffusion|diffusion model|reinforcement learning|rlhf|finetuning|vector database|rag|人工智能|机器学习|深度学习|大模型|语言模型|神经网络|生成式|算法|模型|训练|推理|智能体|多模态|文生图/i,
  },
  {
    id: 'biotech',
    label: '医疗与生物科技',
    icon: '🧬',
    keywords: /biotech|pharmaceutical|drug|fda|clinical trial|mrna|crispr|gene|genomics|proteomics|cancer|oncology|antibody|vaccine|therapy|biologic|cell therapy|gene editing|alzheimer|alzheimers|parkinson|diabetes|obesity|glp-1|semaglutide|ozempic|wegovy|moderna|pfizer|biontech|eli lilly|novo nordisk|生物科技|制药|药物|临床|基因|基因编辑|癌症|肿瘤|疫苗|细胞治疗|抗体|医疗|生命科学|蛋白质|基因组|mRNA/i,
  },
  {
    id: 'energy_auto',
    label: '新能源与汽车',
    icon: '⚡',
    keywords: /electric vehicle|ev|tesla|byd|battery|lithium|solid state battery|charging|fast charge|range|autonomous driving|self.driving|lidar|radar|orin|fsd|noa|nop|rivian|lucid|nio|xpeng|li auto|solar|wind energy|photovoltaic|hydrogen|fuel cell|grid|power storage|ess|energy storage|new energy|碳中和|双碳|电动车|新能源|电池|锂|固态电池|充电|自动驾驶|激光雷达|比亚迪|特斯拉|蔚来|小鹏|理想|光伏|风电|储能|氢能|燃料电池|电网/i,
  },
  {
    id: 'finance',
    label: '商业与金融资本',
    icon: '💹',
    keywords: /ipo|merger|acquisition|m&a|valuation|venture capital|vc|private equity|pe|hedge fund|nasdaq|nyse|s&p|dow jones|fed|federal reserve|interest rate|inflation|gdp|recession|bond|treasury|yield|crypto|bitcoin|ethereum|defi|nft|forex|commodity|oil|gold|银行|上市|并购|融资|估值|风险投资|私募|对冲基金|股市|美联储|利率|通胀|债券|加密货币|比特币|以太坊|黄金|石油|大宗商品|a股|港股|纳斯达克/i,
  },
  {
    id: 'supply_chain',
    label: '远洋与供应链',
    icon: '🚢',
    keywords: /supply chain|logistics|shipping|freight|container|port|maersk|cosco|ever given|suez|panama|tariff|customs|import|export|trade war|sanction|embargo|reshoring|nearshoring|inventory|warehouse|last mile|供应链|物流|航运|货运|集装箱|港口|关税|贸易战|制裁|进出口|海运|空运|仓储|保税|跨境/i,
  },
  {
    id: 'aerospace_defense',
    label: '航天与军工特种',
    icon: '🚀',
    keywords: /spacex|rocket|launch|satellite|starlink|nasa|esa|isro|lunar|mars|orbit|reusable|hypersonic|missile|drone|uav|defense|military|pentagon|nato|warfare|radar|stealth|aircraft|carrier|submarine|nuclear|航天|火箭|卫星|发射|载人|太空|轨道|高超音速|导弹|无人机|军事|国防|航母|潜艇|核武器|隐身|战斗机|北约/i,
  },
  {
    id: 'manufacturing',
    label: '智能制造与工业',
    icon: '🏭',
    keywords: /robot|automation|industrial robot|cobots|cnc|3d printing|additive manufacturing|plc|scada|digital twin|iiot|industry 4\.0|factory|lean|six sigma|siemens|fanuc|abb|kuka|yaskawa|foxconn|manufacturing|production line|机器人|自动化|工业机器人|数控|增材制造|3d打印|数字孪生|工业互联网|智能制造|产线|工厂|精益|西门子|富士康|汽车零部件/i,
  },
  {
    id: 'consumer_retail',
    label: '消费与新零售',
    icon: '🛍️',
    keywords: /ecommerce|e-commerce|retail|amazon|alibaba|tmall|taobao|jd|shopify|tiktok shop|live stream|influencer|brand|consumer|luxury|fashion|apparel|fmcg|cpg|direct-to-consumer|d2c|subscription|membership|loyalty|omnichannel|消费|零售|电商|直播带货|网红|品牌|奢侈品|时尚|快消品|会员|私域|社交电商|拼多多|抖音|小红书|淘宝|京东|亚马逊/i,
  },
  {
    id: 'frontier_science',
    label: '前沿交叉科学',
    icon: '🔬',
    keywords: /quantum|quantum computing|quantum communication|qubit|photonics|metamaterial|nanotechnology|nanomaterial|graphene|superconductor|fusion|nuclear fusion|iter|tokamak|neuroscience|brain computer interface|bci|neuralink|synthetic biology|biomaterials|climate|carbon capture|geoengineering|量子|量子计算|量子通信|比特|光子|超导|纳米|石墨烯|核聚变|托卡马克|神经科学|脑机接口|合成生物学|碳捕获|气候/i,
  },
];

/**
 * 对单条新闻进行分类，返回匹配的 category id。
 * 如果没有匹配，返回 'uncategorized'。
 * @param {{ title: string, description: string, content?: string }} item
 * @returns {string} category id
 */
export function classifyNewsItem(item) {
  const text = [
    item.title || '',
    item.description || '',
    item.content || '',
  ].join(' ');

  for (const category of CATEGORIES) {
    if (category.keywords.test(text)) {
      return category.id;
    }
  }

  return 'uncategorized';
}

/**
 * 对新闻数组进行批量分类，返回带 categoryId 字段的新数组。
 * @param {Array<object>} newsItems
 * @returns {Array<object>}
 */
export function classifyNewsItems(newsItems) {
  return newsItems.map((item) => ({
    ...item,
    categoryId: classifyNewsItem(item),
  }));
}

/**
 * 按 categoryId 对已分类新闻进行分组。
 * @param {Array<object>} classifiedItems
 * @returns {Record<string, Array<object>>}
 */
export function groupByCategory(classifiedItems) {
  const groups = { all: classifiedItems, uncategorized: [] };
  for (const cat of CATEGORIES) {
    groups[cat.id] = [];
  }
  for (const item of classifiedItems) {
    const id = item.categoryId || 'uncategorized';
    if (groups[id]) {
      groups[id].push(item);
    } else {
      groups['uncategorized'].push(item);
    }
  }
  return groups;
}
