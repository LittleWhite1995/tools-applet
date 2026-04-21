const featuredTools = [
  {
    id: 'restaurant',
    title: '餐饮投资计算器',
    desc: '开店成本、保本和经营分析',
    icon: 'shop',
    iconColor: '#24584d',
    tone: 'deep',
    category: '经营计算',
    path: '/pages/restaurant/restaurant',
    keywords: ['餐饮', '餐饮开店', '开店', '投资', '建店成本', '盈亏平衡', '经营分析', '保本'],
  },
]

const hotTools = [
  {
    id: 'qrcode',
    title: '二维码生成',
    desc: '快速生成各类美化码',
    icon: 'qrcode',
    iconColor: '#2f7567',
    tone: 'mint',
    category: '图片处理',
    path: '/pages/qrcode/qrcode',
    keywords: ['二维码', '生成', '扫码', '美化码', '链接'],
  },
  {
    id: 'bmi',
    title: 'BMI 计算',
    desc: '科学评估身体健康指标',
    icon: 'heart',
    iconColor: '#2d6895',
    tone: 'sky',
    category: '生活健康',
    path: '/pages/bmi/bmi',
    keywords: ['bmi', '体重', '身高', '健康', '指数'],
  },
  {
    id: 'mortgage',
    title: '房贷计算器',
    desc: '最新利率组合贷算力',
    icon: 'houses',
    iconColor: '#9a6a19',
    tone: 'amber',
    category: '生活计算',
    path: '/pages/mortgage/mortgage',
    keywords: ['房贷', '贷款', '利率', '月供', '组合贷'],
  },
  {
    id: 'salary',
    title: '工资计算器',
    desc: '税后到手一键估算',
    icon: 'wallet',
    iconColor: '#6655a6',
    tone: 'violet',
    category: '生活计算',
    path: '/pages/salary/salary',
    keywords: ['工资', '薪资', '税后', '个税', '五险一金', '到手工资'],
  },
  {
    id: 'social-security-card',
    title: '电子社保卡',
    desc: '社保查询与医保码',
    icon: 'user-safety',
    iconColor: '#c83737',
    tone: 'red',
    category: '民生服务',
    shortLink: '#小程序://电子社保卡/Tm6FppEAraGw4Hg',
    keywords: ['电子社保卡', '社保', '医保', '医保码', '社保卡', '民生服务'],
  },
  {
    id: 'image-compress',
    title: '图片压缩',
    desc: '清晰压缩证件照素材',
    icon: 'file-zip',
    iconColor: '#4d7b35',
    tone: 'green',
    category: '图片处理',
    path: '/pages/image-compress/image-compress',
    keywords: ['图片', '压缩', '证件照', '素材', '体积'],
  },
]

// 更多工具 - 可搜索，不在首页展示
const moreTools = [
  {
    id: 'converter',
    title: '单位换算',
    desc: '长度面积重量快捷换',
    icon: 'measurement',
    iconColor: '#a85b52',
    tone: 'coral',
    category: '生活计算',
    path: '/pages/converter/converter',
    keywords: ['单位', '换算', '长度', '面积', '重量', '体积', '温度'],
  },
  {
    id: 'bmr',
    title: '基础代谢率',
    desc: '了解身体每日基础消耗',
    icon: 'activity',
    iconColor: '#c4622d',
    tone: 'coral',
    category: '生活健康',
    path: '/pages/bmr/bmr',
    keywords: ['bmr', '基础代谢', '代谢率', '热量', '卡路里', '每日消耗'],
  },
  {
    id: 'relationship',
    title: '亲戚关系计算器',
    desc: '快速算出称呼，姑舅姨表不再卡壳',
    icon: 'usergroup',
    iconColor: '#8b5a4a',
    tone: 'coral',
    category: '生活计算',
    path: '/pages/relationship/relationship',
    keywords: ['亲戚', '称呼', '关系', '家庭', '家族', '姑妈', '舅舅', '姨妈', '表哥', '堂姐'],
  },
  {
    id: 'compound',
    title: '复利 / 定投计算器',
    desc: '估算长期复利增长和每月定投结果',
    icon: 'saving-pot',
    iconColor: '#3f7a4b',
    tone: 'green',
    category: '理财计算',
    path: '/pages/compound/compound',
    keywords: ['复利', '定投', '理财', '投资', '基金', '本金', '收益率', '年化', '长期投资'],
  },
  {
    id: 'shelf-life',
    title: '商品保质期计算器',
    desc: '快速算出到期日和剩余天数',
    icon: 'calendar',
    iconColor: '#b67f2e',
    tone: 'amber',
    category: '生活计算',
    path: '/pages/shelf-life/shelf-life',
    keywords: ['保质期', '到期', '过期', '商品', '食品', '生产日期', '有效期', '保鲜'],
  },
]

const topicCards = [
  {
    id: 'guide',
    label: '新手必读',
    title: '全能工具箱使用指南',
    desc: '快速了解搜索、热门工具和高频能力的使用方式',
    icon: 'book-open',
    iconColor: '#24584d',
    button: '查看指南',
    tone: 'deep',
    pressKey: 'topic-guide',
    category: '使用指南',
    path: '/pages/guide/guide',
    keywords: ['指南', '教程', '使用', '帮助', '新手'],
  },
]

const toolCatalog = [
  ...featuredTools.map((item) => ({
    ...item,
    type: 'tool',
    actionText: '打开工具',
  })),
  ...hotTools.map((item) => ({
    ...item,
    type: 'tool',
    actionText: item.shortLink ? '跳转小程序' : '打开工具',
  })),
  ...moreTools.map((item) => ({
    ...item,
    type: 'tool',
    actionText: item.shortLink ? '跳转小程序' : '打开工具',
  })),
  ...topicCards.map((item) => ({
    ...item,
    type: 'topic',
    actionText: '查看专题',
  })),
]

const normalize = (value) => String(value || '').trim().toLowerCase()

const getSearchText = (item) => [
  item.title,
  item.desc,
  item.category,
  ...(item.keywords || []),
].join(' ').toLowerCase()

const searchTools = (keyword) => {
  const query = normalize(keyword)

  if (!query) {
    return toolCatalog
  }

  return toolCatalog.filter((item) => getSearchText(item).includes(query))
}

module.exports = {
  featuredTools,
  hotTools,
  moreTools,
  topicCards,
  toolCatalog,
  searchTools,
}
