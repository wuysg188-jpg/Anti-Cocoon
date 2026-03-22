/**
 * stockCodes.js — 股票代码识别与公司名称映射
 *
 * 支持：A股（上交所、深交所）、港股、美股
 * 功能：识别股票代码，返回公司名称用于新闻搜索
 */

// ─── A股代码映射（主板、创业板、科创板）──────────────────────────────
const A_STOCKS = {
  // 上交所主板 (60xxxx)
  '600519': { name: '贵州茅台', fullName: '贵州茅台酒股份有限公司', sector: '白酒' },
  '601318': { name: '中国平安', fullName: '中国平安保险(集团)股份有限公司', sector: '保险' },
  '600036': { name: '招商银行', fullName: '招商银行股份有限公司', sector: '银行' },
  '601166': { name: '兴业银行', fullName: '兴业银行股份有限公司', sector: '银行' },
  '600276': { name: '恒瑞医药', fullName: '江苏恒瑞医药股份有限公司', sector: '医药' },
  '601888': { name: '中国中免', fullName: '中国旅游集团中免股份有限公司', sector: '旅游零售' },
  '600900': { name: '长江电力', fullName: '中国长江电力股份有限公司', sector: '电力' },
  '601012': { name: '隆基绿能', fullName: '隆基绿能科技股份有限公司', sector: '光伏' },
  '600030': { name: '中信证券', fullName: '中信证券股份有限公司', sector: '证券' },
  '601398': { name: '工商银行', fullName: '中国工商银行股份有限公司', sector: '银行' },
  '601288': { name: '农业银行', fullName: '中国农业银行股份有限公司', sector: '银行' },
  '601988': { name: '中国银行', fullName: '中国银行股份有限公司', sector: '银行' },
  '601668': { name: '中国建筑', fullName: '中国建筑股份有限公司', sector: '建筑' },
  '600028': { name: '中国石化', fullName: '中国石油化工股份有限公司', sector: '石油化工' },
  '601857': { name: '中国石油', fullName: '中国石油天然气股份有限公司', sector: '石油' },
  '600104': { name: '上汽集团', fullName: '上海汽车集团股份有限公司', sector: '汽车' },
  '601633': { name: '长城汽车', fullName: '长城汽车股份有限公司', sector: '汽车' },
  '600690': { name: '海尔智家', fullName: '海尔智家股份有限公司', sector: '家电' },
  '600887': { name: '伊利股份', fullName: '内蒙古伊利实业集团股份有限公司', sector: '乳业' },
  '600048': { name: '保利发展', fullName: '保利发展控股集团股份有限公司', sector: '房地产' },

  // 深交所主板 (000xxx)
  '000858': { name: '五粮液', fullName: '宜宾五粮液股份有限公司', sector: '白酒' },
  '000333': { name: '美的集团', fullName: '美的集团股份有限公司', sector: '家电' },
  '000651': { name: '格力电器', fullName: '珠海格力电器股份有限公司', sector: '家电' },
  '000002': { name: '万科A', fullName: '万科企业股份有限公司', sector: '房地产' },
  '000001': { name: '平安银行', fullName: '平安银行股份有限公司', sector: '银行' },
  '000725': { name: '京东方A', fullName: '京东方科技集团股份有限公司', sector: '显示面板' },
  '002415': { name: '海康威视', fullName: '杭州海康威视数字技术股份有限公司', sector: '安防' },
  '000568': { name: '泸州老窖', fullName: '泸州老窖股份有限公司', sector: '白酒' },
  '000538': { name: '云南白药', fullName: '云南白药集团股份有限公司', sector: '医药' },
  '000895': { name: '双汇发展', fullName: '河南双汇投资发展股份有限公司', sector: '食品' },
  '002304': { name: '洋河股份', fullName: '江苏洋河酒厂股份有限公司', sector: '白酒' },
  '000876': { name: '新希望', fullName: '新希望六和股份有限公司', sector: '农牧' },
  '002714': { name: '牧原股份', fullName: '牧原食品股份有限公司', sector: '养殖' },
  '000792': { name: '盐湖股份', fullName: '青海盐湖工业股份有限公司', sector: '化工' },
  '002475': { name: '立讯精密', fullName: '立讯精密工业股份有限公司', sector: '电子' },

  // 深交所中小板 (002xxx)
  '002594': { name: '比亚迪', fullName: '比亚迪股份有限公司', sector: '汽车/新能源' },
  '002415': { name: '海康威视', fullName: '杭州海康威视数字技术股份有限公司', sector: '安防' },
  '002230': { name: '科大讯飞', fullName: '科大讯飞股份有限公司', sector: '人工智能' },
  '002352': { name: '顺丰控股', fullName: '顺丰控股股份有限公司', sector: '物流' },
  '002049': { name: '紫光国微', fullName: '紫光国微电子股份有限公司', sector: '芯片' },

  // 创业板 (300xxx)
  '300750': { name: '宁德时代', fullName: '宁德时代新能源科技股份有限公司', sector: '新能源电池' },
  '300059': { name: '东方财富', fullName: '东方财富信息股份有限公司', sector: '金融科技' },
  '300015': { name: '爱尔眼科', fullName: '爱尔眼科医院集团股份有限公司', sector: '医疗' },
  '300760': { name: '迈瑞医疗', fullName: '深圳迈瑞生物医疗电子股份有限公司', sector: '医疗器械' },
  '300124': { name: '汇川技术', fullName: '深圳市汇川技术股份有限公司', sector: '工业自动化' },
  '300274': { name: '阳光电源', fullName: '阳光电源股份有限公司', sector: '新能源' },
  '300014': { name: '亿纬锂能', fullName: '惠州亿纬锂能股份有限公司', sector: '锂电池' },

  // 科创板 (688xxx)
  '688111': { name: '金山办公', fullName: '北京金山办公软件股份有限公司', sector: '软件' },
  '688981': { name: '中芯国际', fullName: '中芯国际集成电路制造有限公司', sector: '芯片制造' },
  '688005': { name: '容百科技', fullName: '宁波容百新能源科技股份有限公司', sector: '新能源材料' },
  '688599': { name: '天合光能', fullName: '天合光能股份有限公司', sector: '光伏' },
};

// ─── 港股代码映射 ──────────────────────────────────────────────────────
const HK_STOCKS = {
  '0700': { name: '腾讯控股', fullName: '腾讯控股有限公司', sector: '互联网' },
  '9988': { name: '阿里巴巴', fullName: '阿里巴巴集团控股有限公司', sector: '电商' },
  '3690': { name: '美团', fullName: '美团', sector: '本地生活' },
  '9999': { name: '网易', fullName: '网易公司', sector: '互联网游戏' },
  '9618': { name: '京东集团', fullName: '京东集团股份有限公司', sector: '电商' },
  '1810': { name: '小米集团', fullName: '小米集团', sector: '消费电子' },
  '0941': { name: '中国移动', fullName: '中国移动有限公司', sector: '电信' },
  '0883': { name: '中国海洋石油', fullName: '中国海洋石油有限公司', sector: '石油' },
  '1299': { name: '友邦保险', fullName: '友邦保险控股有限公司', sector: '保险' },
  '0388': { name: '香港交易所', fullName: '香港交易及结算所有限公司', sector: '金融' },
  '2318': { name: '中国平安', fullName: '中国平安保险(集团)股份有限公司', sector: '保险' },
  '1398': { name: '工商银行', fullName: '中国工商银行股份有限公司', sector: '银行' },
  '0939': { name: '建设银行', fullName: '中国建设银行股份有限公司', sector: '银行' },
  '3988': { name: '中国银行', fullName: '中国银行股份有限公司', sector: '银行' },
  '0268': { name: '金蝶国际', fullName: '金蝶国际软件集团有限公司', sector: '软件' },
  '6060': { name: '众安在线', fullName: '众安在线财产保险股份有限公司', sector: '保险科技' },
  '0241': { name: '阿里健康', fullName: '阿里健康信息技术有限公司', sector: '医疗健康' },
  '6969': { name: '思摩尔国际', fullName: '思摩尔国际控股有限公司', sector: '电子烟' },
  '2020': { name: '安踏体育', fullName: '安踏体育用品有限公司', sector: '体育用品' },
  '1024': { name: '快手', fullName: '快手科技', sector: '短视频' },
  '9888': { name: '百度集团', fullName: '百度集团股份有限公司', sector: '互联网' },
  '9961': { name: '携程集团', fullName: '携程集团有限公司', sector: '旅游' },
  '0285': { name: '比亚迪电子', fullName: '比亚迪电子(国际)有限公司', sector: '电子制造' },
  '1211': { name: '比亚迪股份', fullName: '比亚迪股份有限公司', sector: '汽车/新能源' },
};

// ─── 美股代码映射 ──────────────────────────────────────────────────────
const US_STOCKS = {
  'AAPL': { name: 'Apple', fullName: 'Apple Inc.', sector: '科技' },
  'MSFT': { name: 'Microsoft', fullName: 'Microsoft Corporation', sector: '科技' },
  'GOOGL': { name: 'Google', fullName: 'Alphabet Inc.', sector: '互联网' },
  'AMZN': { name: 'Amazon', fullName: 'Amazon.com Inc.', sector: '电商/云计算' },
  'TSLA': { name: 'Tesla', fullName: 'Tesla Inc.', sector: '电动汽车' },
  'META': { name: 'Meta', fullName: 'Meta Platforms Inc.', sector: '社交网络' },
  'NVDA': { name: 'NVIDIA', fullName: 'NVIDIA Corporation', sector: '芯片' },
  'JPM': { name: 'JPMorgan', fullName: 'JPMorgan Chase & Co.', sector: '银行' },
  'V': { name: 'Visa', fullName: 'Visa Inc.', sector: '支付' },
  'JNJ': { name: 'Johnson & Johnson', fullName: 'Johnson & Johnson', sector: '医药' },
  'WMT': { name: 'Walmart', fullName: 'Walmart Inc.', sector: '零售' },
  'PG': { name: 'Procter & Gamble', fullName: 'The Procter & Gamble Company', sector: '消费品' },
  'MA': { name: 'Mastercard', fullName: 'Mastercard Incorporated', sector: '支付' },
  'UNH': { name: 'UnitedHealth', fullName: 'UnitedHealth Group Incorporated', sector: '医疗保险' },
  'HD': { name: 'Home Depot', fullName: 'The Home Depot Inc.', sector: '零售' },
  'DIS': { name: 'Disney', fullName: 'The Walt Disney Company', sector: '娱乐' },
  'PYPL': { name: 'PayPal', fullName: 'PayPal Holdings Inc.', sector: '支付' },
  'BAC': { name: 'Bank of America', fullName: 'Bank of America Corporation', sector: '银行' },
  'ADBE': { name: 'Adobe', fullName: 'Adobe Inc.', sector: '软件' },
  'CRM': { name: 'Salesforce', fullName: 'Salesforce Inc.', sector: '软件' },
  'NFLX': { name: 'Netflix', fullName: 'Netflix Inc.', sector: '流媒体' },
  'INTC': { name: 'Intel', fullName: 'Intel Corporation', sector: '芯片' },
  'AMD': { name: 'AMD', fullName: 'Advanced Micro Devices Inc.', sector: '芯片' },
  'PDD': { name: 'Pinduoduo', fullName: 'PDD Holdings Inc.', sector: '电商' },
  'BABA': { name: 'Alibaba', fullName: 'Alibaba Group Holding Limited', sector: '电商' },
  'JD': { name: 'JD.com', fullName: 'JD.com Inc.', sector: '电商' },
  'NIO': { name: 'NIO', fullName: 'NIO Inc.', sector: '电动汽车' },
  'XPEV': { name: 'XPeng', fullName: 'XPeng Inc.', sector: '电动汽车' },
  'LI': { name: 'Li Auto', fullName: 'Li Auto Inc.', sector: '电动汽车' },
  'BIDU': { name: 'Baidu', fullName: 'Baidu Inc.', sector: '互联网' },
  'TME': { name: 'Tencent Music', fullName: 'Tencent Music Entertainment Group', sector: '音乐流媒体' },
  'BILI': { name: 'Bilibili', fullName: 'Bilibili Inc.', sector: '视频' },
  'DIDI': { name: 'DiDi', fullName: 'DiDi Global Inc.', sector: '出行' },
  'ZM': { name: 'Zoom', fullName: 'Zoom Video Communications Inc.', sector: '视频会议' },
  'COIN': { name: 'Coinbase', fullName: 'Coinbase Global Inc.', sector: '加密货币' },
  'PLTR': { name: 'Palantir', fullName: 'Palantir Technologies Inc.', sector: '大数据' },
  'SNAP': { name: 'Snapchat', fullName: 'Snap Inc.', sector: '社交网络' },
  'UBER': { name: 'Uber', fullName: 'Uber Technologies Inc.', sector: '出行' },
  'ABNB': { name: 'Airbnb', fullName: 'Airbnb Inc.', sector: '旅游' },
};

// ─── 股票代码识别函数 ──────────────────────────────────────────────────

/**
 * 检测输入是否为股票代码
 * @param {string} input - 用户输入
 * @returns {object|null} - 返回股票信息，如果不是股票代码则返回null
 */
export function detectStockCode(input) {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim().toUpperCase();

  // A股代码检测：6位数字
  // 上交所：60xxxx, 68xxxx（科创板）
  // 深交所：000xxx, 002xxx, 003xxx, 300xxx（创业板）
  const aStockPattern = /^(60\d{4}|68\d{4}|000\d{3}|002\d{3}|003\d{3}|300\d{3})$/;
  if (aStockPattern.test(trimmed)) {
    const stock = A_STOCKS[trimmed];
    if (stock) {
      return {
        code: trimmed,
        name: stock.name,
        fullName: stock.fullName,
        sector: stock.sector,
        market: 'A股',
        searchTerms: [stock.name, stock.fullName, trimmed],
      };
    }
    // 即使没有映射，也识别为A股代码
    return {
      code: trimmed,
      name: trimmed,
      fullName: `股票代码 ${trimmed}`,
      sector: '未知',
      market: 'A股',
      searchTerms: [trimmed, `股票 ${trimmed}`],
    };
  }

  // 港股代码检测：4-5位数字，可选.HK后缀
  const hkPattern = /^(\d{4,5})(\.HK)?$/i;
  const hkMatch = trimmed.match(hkPattern);
  if (hkMatch) {
    const code = hkMatch[1].padStart(5, '0'); // 补齐到5位
    const codeShort = code.slice(-4); // 取后4位用于查找
    const stock = HK_STOCKS[codeShort] || HK_STOCKS[code];
    if (stock) {
      return {
        code: code,
        name: stock.name,
        fullName: stock.fullName,
        sector: stock.sector,
        market: '港股',
        searchTerms: [stock.name, stock.fullName, `${code}.HK`],
      };
    }
    return {
      code: code,
      name: `${code}.HK`,
      fullName: `港股代码 ${code}`,
      sector: '未知',
      market: '港股',
      searchTerms: [`${code}.HK`, `港股 ${code}`],
    };
  }

  // 美股代码检测：1-5位字母
  const usPattern = /^[A-Z]{1,5}$/;
  if (usPattern.test(trimmed) && US_STOCKS[trimmed]) {
    const stock = US_STOCKS[trimmed];
    return {
      code: trimmed,
      name: stock.name,
      fullName: stock.fullName,
      sector: stock.sector,
      market: '美股',
      searchTerms: [stock.name, stock.fullName, trimmed, `${trimmed} stock`],
    };
  }

  return null;
}

/**
 * 获取股票搜索关键词
 * @param {string} input - 用户输入
 * @returns {string} - 返回用于搜索的关键词
 */
export function getStockSearchQuery(input) {
  const stock = detectStockCode(input);
  if (stock) {
    // 返回最适合搜索的关键词组合
    return `${stock.name} ${stock.sector} 股票`;
  }
  return input;
}

/**
 * 获取所有股票代码（用于自动补全）
 * @returns {Array} - 返回所有股票代码和名称
 */
export function getAllStocks() {
  const stocks = [];

  // A股
  for (const [code, info] of Object.entries(A_STOCKS)) {
    stocks.push({ code, name: info.name, market: 'A股', sector: info.sector });
  }

  // 港股
  for (const [code, info] of Object.entries(HK_STOCKS)) {
    stocks.push({ code: `${code}.HK`, name: info.name, market: '港股', sector: info.sector });
  }

  // 美股
  for (const [code, info] of Object.entries(US_STOCKS)) {
    stocks.push({ code, name: info.name, market: '美股', sector: info.sector });
  }

  return stocks;
}

// 导出各市场股票数据
export { A_STOCKS, HK_STOCKS, US_STOCKS };
