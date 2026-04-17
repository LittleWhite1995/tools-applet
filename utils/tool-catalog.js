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
    category: '生活计算',
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

const topicCards = [
  {
    id: 'guide',
    label: '新手必读',
    title: '全能工具箱使用指南',
    desc: '快速了解搜索、热门工具和高频能力的使用方式',
    icon: 'book-open',
    iconColor: '#b6d6c9',
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
    actionText: '打开工具',
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
  topicCards,
  toolCatalog,
  searchTools,
}
