const activityOptions = [
  {
    id: 'sedentary',
    label: '久坐少动',
    desc: '办公学习为主，几乎不运动',
    factor: 1.2,
    icon: 'home',
  },
  {
    id: 'light',
    label: '轻度活动',
    desc: '每周运动 1 到 3 天',
    factor: 1.375,
    icon: 'activity',
  },
  {
    id: 'moderate',
    label: '中度活动',
    desc: '每周运动 3 到 5 天',
    factor: 1.55,
    icon: 'heart',
  },
  {
    id: 'active',
    label: '高度活动',
    desc: '每周运动 6 到 7 天',
    factor: 1.725,
    icon: 'rocket',
  },
]

const getDefaultResult = () => ({
  bmr: '--',
  tdee: '--',
  cut: '--',
  maintain: '--',
  gain: '--',
  activityLabel: '',
  summary: '',
})

Page({
  data: {
    gender: 'male',
    ageValue: '',
    heightValue: '',
    weightValue: '',
    activityKey: 'sedentary',
    activityOptions,
    hasResult: false,
    result: getDefaultResult(),
  },

  updateDraft(patch) {
    this.setData({
      ...patch,
      hasResult: false,
      result: getDefaultResult(),
    })
  },

  onGenderSelect(event) {
    this.updateDraft({
      gender: event.currentTarget.dataset.gender,
    })
  },

  onInput(event) {
    const { field } = event.currentTarget.dataset

    this.updateDraft({
      [field]: event.detail.value,
    })
  },

  onActivitySelect(event) {
    this.updateDraft({
      activityKey: event.currentTarget.dataset.key,
    })
  },

  onCalculate() {
    const age = Number(this.data.ageValue)
    const height = Number(this.data.heightValue)
    const weight = Number(this.data.weightValue)
    const activity = this.data.activityOptions.find((item) => item.id === this.data.activityKey)

    if (!age || !height || !weight) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none',
      })
      return
    }

    if (age < 10 || age > 100) {
      wx.showToast({
        title: '年龄范围不太对',
        icon: 'none',
      })
      return
    }

    if (height < 100 || height > 250) {
      wx.showToast({
        title: '身高范围不太对',
        icon: 'none',
      })
      return
    }

    if (weight < 20 || weight > 300) {
      wx.showToast({
        title: '体重范围不太对',
        icon: 'none',
      })
      return
    }

    const bmr = this.calculateBmr({
      gender: this.data.gender,
      age,
      height,
      weight,
    })
    const tdee = bmr * activity.factor
    const maintain = Math.round(tdee)
    const cut = Math.max(Math.round(tdee - 450), Math.round(bmr))
    const gain = Math.round(tdee + 250)

    this.setData({
      hasResult: true,
      result: {
        bmr: String(Math.round(bmr)),
        tdee: String(maintain),
        cut: String(cut),
        maintain: String(maintain),
        gain: String(gain),
        activityLabel: activity.label,
        summary: `按${activity.label}估算，你每天总消耗约 ${maintain} 千卡。`,
      },
    })
  },

  calculateBmr({ gender, age, height, weight }) {
    if (gender === 'male') {
      return 10 * weight + 6.25 * height - 5 * age + 5
    }

    return 10 * weight + 6.25 * height - 5 * age - 161
  },

  onReset() {
    this.setData({
      gender: 'male',
      ageValue: '',
      heightValue: '',
      weightValue: '',
      activityKey: 'sedentary',
      hasResult: false,
      result: getDefaultResult(),
    })
  },

  onShareAppMessage() {
    return {
      title: '算一下每天基础代谢和热量消耗',
      path: '/pages/bmr/bmr',
    }
  },

  onShareTimeline() {
    return {
      title: '基础代谢率计算器：估算每日热量消耗',
      query: '',
    }
  },
})
