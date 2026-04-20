const getRelationGroups = (selfGender) => {
  const spouseToken = selfGender === 'female' ? '老公' : '老婆'
  const inLawTokens = selfGender === 'female'
    ? ['公公', '婆婆']
    : ['岳父', '岳母']

  return [
    {
      title: '直系长辈',
      items: ['爸爸', '妈妈', '爷爷', '奶奶', '外公', '外婆'],
    },
    {
      title: '平辈亲属',
      items: ['哥哥', '弟弟', '姐姐', '妹妹', spouseToken, '姐夫'],
    },
    {
      title: '旁系亲属',
      items: ['伯父', '叔叔', '姑妈', '舅舅', '姨妈', ...inLawTokens],
    },
    {
      title: '晚辈亲属',
      items: ['儿子', '女儿', '侄子', '外甥', '孙子', '外孙'],
    },
  ]
}

const getExampleQueries = (selfGender) => ([
  '爸爸的姐姐的儿子',
  '妈妈的哥哥',
  selfGender === 'female' ? '老公的妈妈' : '老婆的妈妈',
  '姐姐的女儿',
  '儿子的儿子',
])

const tokenAliases = {
  爸爸: '爸爸',
  父亲: '爸爸',
  老爸: '爸爸',
  爸: '爸爸',
  妈妈: '妈妈',
  母亲: '妈妈',
  老妈: '妈妈',
  妈: '妈妈',
  哥哥: '哥哥',
  哥: '哥哥',
  弟弟: '弟弟',
  弟: '弟弟',
  姐姐: '姐姐',
  姐: '姐姐',
  妹妹: '妹妹',
  妹: '妹妹',
  老公: '老公',
  丈夫: '老公',
  先生: '老公',
  老婆: '老婆',
  妻子: '老婆',
  太太: '老婆',
  妻: '老婆',
  儿子: '儿子',
  女儿: '女儿',
  闺女: '女儿',
  爷爷: '爷爷',
  奶奶: '奶奶',
  外公: '外公',
  姥爷: '外公',
  外婆: '外婆',
  姥姥: '外婆',
  伯父: '伯父',
  伯伯: '伯父',
  叔叔: '叔叔',
  姑妈: '姑妈',
  姑姑: '姑妈',
  姑母: '姑妈',
  舅舅: '舅舅',
  姨妈: '姨妈',
  阿姨: '姨妈',
  姨母: '姨妈',
  姑父: '姑父',
  姨父: '姨父',
  姨夫: '姨父',
  舅妈: '舅妈',
  舅母: '舅妈',
  伯母: '伯母',
  婶婶: '婶婶',
  婶母: '婶婶',
  姐夫: '姐夫',
  妹夫: '妹夫',
  嫂子: '嫂子',
  弟妹: '弟妹',
  公公: '公公',
  婆婆: '婆婆',
  岳父: '岳父',
  岳母: '岳母',
  儿媳: '儿媳',
  媳妇: '儿媳',
  女婿: '女婿',
  孙子: '孙子',
  孙女: '孙女',
  外孙: '外孙',
  外孙女: '外孙女',
  侄子: '侄子',
  侄女: '侄女',
  外甥: '外甥',
  外甥女: '外甥女',
}

const tokenToPath = {
  爸爸: 'f',
  妈妈: 'm',
  哥哥: 'ob',
  弟弟: 'lb',
  姐姐: 'os',
  妹妹: 'ls',
  老公: 'h',
  老婆: 'w',
  儿子: 's',
  女儿: 'd',
  爷爷: 'ff',
  奶奶: 'fm',
  外公: 'mf',
  外婆: 'mm',
  伯父: 'fob',
  叔叔: 'flb',
  姑妈: 'fos',
  舅舅: 'mob',
  姨妈: 'mos',
  姑父: 'fosh',
  姨父: 'mosh',
  舅妈: 'mobw',
  伯母: 'fobw',
  婶婶: 'flbw',
  姐夫: 'osh',
  妹夫: 'lsh',
  嫂子: 'obw',
  弟妹: 'lbw',
  公公: 'hf',
  婆婆: 'hm',
  岳父: 'wf',
  岳母: 'wm',
  儿媳: 'sw',
  女婿: 'dh',
  孙子: 'ss',
  孙女: 'sd',
  外孙: 'ds',
  外孙女: 'dd',
  侄子: 'obs',
  侄女: 'obd',
  外甥: 'oss',
  外甥女: 'osd',
}

const relationTitleMap = {
  f: { title: '爸爸' },
  m: { title: '妈妈' },
  ob: { title: '哥哥' },
  lb: { title: '弟弟' },
  os: { title: '姐姐' },
  ls: { title: '妹妹' },
  h: { title: '老公' },
  w: { title: '老婆' },
  s: { title: '儿子' },
  d: { title: '女儿' },
  ff: { title: '爷爷' },
  fm: { title: '奶奶' },
  mf: { title: '外公' },
  mm: { title: '外婆' },
  fff: { title: '曾祖父' },
  ffm: { title: '曾祖母' },
  fmf: { title: '曾外祖父' },
  fmm: { title: '曾外祖母' },
  mff: { title: '外曾祖父' },
  mfm: { title: '外曾祖母' },
  mmf: { title: '外曾祖父' },
  mmm: { title: '外曾祖母' },
  fob: { title: '伯父' },
  flb: { title: '叔叔' },
  fos: { title: '姑妈' },
  fls: { title: '姑妈' },
  mob: { title: '舅舅' },
  mlb: { title: '舅舅' },
  mos: { title: '姨妈' },
  mls: { title: '姨妈' },
  fosh: { title: '姑父' },
  flsh: { title: '姑父' },
  mosh: { title: '姨父' },
  mlsh: { title: '姨父' },
  mobw: { title: '舅妈' },
  mlbw: { title: '舅妈' },
  fobw: { title: '伯母' },
  flbw: { title: '婶婶' },
  obw: { title: '嫂子' },
  lbw: { title: '弟妹' },
  osh: { title: '姐夫' },
  lsh: { title: '妹夫' },
  hf: { title: '公公' },
  hm: { title: '婆婆' },
  wf: { title: '岳父' },
  wm: { title: '岳母' },
  sw: { title: '儿媳' },
  dh: { title: '女婿' },
  ss: { title: '孙子' },
  sd: { title: '孙女' },
  ds: { title: '外孙' },
  dd: { title: '外孙女' },
  obs: { title: '侄子' },
  lbs: { title: '侄子' },
  obd: { title: '侄女' },
  lbd: { title: '侄女' },
  oss: { title: '外甥' },
  lss: { title: '外甥' },
  osd: { title: '外甥女' },
  lsd: { title: '外甥女' },
  fobs: { title: '堂哥 / 堂弟', note: '堂系称呼会受对方年龄影响，这里返回常见叫法。' },
  flbs: { title: '堂哥 / 堂弟', note: '堂系称呼会受对方年龄影响，这里返回常见叫法。' },
  fobd: { title: '堂姐 / 堂妹', note: '堂系称呼会受对方年龄影响，这里返回常见叫法。' },
  flbd: { title: '堂姐 / 堂妹', note: '堂系称呼会受对方年龄影响，这里返回常见叫法。' },
  foss: { title: '表哥 / 表弟', note: '表亲称呼会受对方年龄影响，这里返回常见叫法。' },
  flss: { title: '表哥 / 表弟', note: '表亲称呼会受对方年龄影响，这里返回常见叫法。' },
  mobs: { title: '表哥 / 表弟', note: '表亲称呼会受对方年龄影响，这里返回常见叫法。' },
  mlbs: { title: '表哥 / 表弟', note: '表亲称呼会受对方年龄影响，这里返回常见叫法。' },
  moss: { title: '表哥 / 表弟', note: '表亲称呼会受对方年龄影响，这里返回常见叫法。' },
  mlss: { title: '表哥 / 表弟', note: '表亲称呼会受对方年龄影响，这里返回常见叫法。' },
  fosd: { title: '表姐 / 表妹', note: '表亲称呼会受对方年龄影响，这里返回常见叫法。' },
  flsd: { title: '表姐 / 表妹', note: '表亲称呼会受对方年龄影响，这里返回常见叫法。' },
  mobd: { title: '表姐 / 表妹', note: '表亲称呼会受对方年龄影响，这里返回常见叫法。' },
  mlbd: { title: '表姐 / 表妹', note: '表亲称呼会受对方年龄影响，这里返回常见叫法。' },
  mosd: { title: '表姐 / 表妹', note: '表亲称呼会受对方年龄影响，这里返回常见叫法。' },
  mlsd: { title: '表姐 / 表妹', note: '表亲称呼会受对方年龄影响，这里返回常见叫法。' },
}

const relationKeys = Object.keys(relationTitleMap)

const getEmptyResult = () => ({
  hasResult: false,
  title: '--',
  relationPath: '',
  badge: '待计算',
})

const canPathContinue = (relationPath) => relationKeys.some((item) => (
  item.startsWith(relationPath) && item !== relationPath
))

const normalizeInput = (value) => String(value || '')
  .trim()
  .replace(/[，,、\s]+/g, '')
  .replace(/之/g, '的')
  .replace(/^的+|的+$/g, '')
  .replace(/的{2,}/g, '的')

const getDraftMeta = (value) => {
  const normalized = normalizeInput(value)

  if (!normalized) {
    return {
      normalized: '',
      relationSteps: [],
      relationPath: '',
      canAppendMore: true,
    }
  }

  const rawSteps = normalized.split('的').filter(Boolean)
  const relationSteps = rawSteps.map((item) => tokenAliases[item] || item)
  const relationPath = relationSteps.reduce((total, item) => (
    total + (tokenToPath[item] || '')
  ), '')

  return {
    normalized,
    relationSteps,
    relationPath,
    canAppendMore: relationPath ? canPathContinue(relationPath) : true,
  }
}

const parseRelation = (value) => {
  const normalized = normalizeInput(value)

  if (!normalized) {
    return {
      error: '请输入关系链',
    }
  }

  const parts = normalized.split('的').filter(Boolean)
  const relationTokens = []
  let relationPath = ''

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index]
    const canonical = tokenAliases[part]

    if (!canonical) {
      return {
        error: `暂不支持“${part}”这种写法`,
      }
    }

    relationTokens.push(canonical)
    relationPath += tokenToPath[canonical]
  }

  return {
    relationPath,
  }
}

Page({
  data: {
    selfGender: 'female',
    relationInput: '',
    relationSteps: [],
    relationPath: '',
    canAppendMore: true,
    relationGroups: getRelationGroups('female'),
    exampleQueries: getExampleQueries('female'),
    result: getEmptyResult(),
  },

  setDraftState(relationInput, options = {}) {
    const draft = getDraftMeta(relationInput)

    this.setData({
      relationInput: draft.normalized,
      relationSteps: draft.relationSteps,
      relationPath: draft.relationPath,
      canAppendMore: draft.canAppendMore,
      ...(options.result ? { result: options.result } : {}),
    })
  },

  resetResult() {
    this.setData({
      result: getEmptyResult(),
    })
  },

  onGenderSelect(event) {
    const selfGender = event.currentTarget.dataset.gender

    this.setData({
      selfGender,
      relationGroups: getRelationGroups(selfGender),
      exampleQueries: getExampleQueries(selfGender),
      result: getEmptyResult(),
    })
  },

  onAppendToken(event) {
    const { token } = event.currentTarget.dataset

    if (this.data.relationSteps.length && !this.data.canAppendMore) {
      wx.showToast({
        title: '先算到这儿，再往下就有点绕了',
        icon: 'none',
      })
      return
    }

    const currentValue = normalizeInput(this.data.relationInput)
    const nextValue = currentValue ? `${currentValue}的${token}` : token
    const nextDraft = getDraftMeta(nextValue)

    if (!relationTitleMap[nextDraft.relationPath] && !nextDraft.canAppendMore) {
      wx.showToast({
        title: '这个方向暂不支持继续往下算',
        icon: 'none',
      })
      return
    }

    this.setDraftState(nextValue, {
      result: getEmptyResult(),
    })
    this.onCalculate(true)
  },

  onDeleteStep() {
    const currentValue = normalizeInput(this.data.relationInput)

    if (!currentValue) return

    const parts = currentValue.split('的').filter(Boolean)
    parts.pop()

    this.setDraftState(parts.join('的'), {
      result: getEmptyResult(),
    })

    if (parts.length) {
      this.onCalculate(true)
      return
    }

    this.resetResult()
  },

  onClear() {
    this.setDraftState('', {
      result: getEmptyResult(),
    })
  },

  onExampleTap(event) {
    const { query } = event.currentTarget.dataset

    this.setDraftState(query, {
      result: getEmptyResult(),
    })
    this.onCalculate(true)
  },

  onCalculate(silent = false) {
    const parsed = parseRelation(this.data.relationInput)

    if (parsed.error) {
      if (!silent) {
        wx.showToast({
          title: parsed.error,
          icon: 'none',
        })
      }
      return
    }

    const resolved = relationTitleMap[parsed.relationPath]

    if (!resolved) {
      if (!silent) {
        wx.showToast({
          title: '这个关系有点复杂，试试换成更基础的叫法',
          icon: 'none',
        })
      }
      return
    }

    this.setData({
      result: {
        hasResult: true,
        title: resolved.title,
        relationPath: parsed.relationPath,
        badge: resolved.note ? '常见叫法' : '推荐称呼',
      },
    })
  },
})
