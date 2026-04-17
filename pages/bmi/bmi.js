Page({
  data: {
    heightValue: '',
    weightValue: '',
    hasResult: false,
    bmiValue: '--',
    bmiLevel: '',
    bmiDesc: '',
    idealRange: '',
    markerStyle: 'left: 0%',
    resultTone: 'normal',
  },

  onHeightInput(event) {
    this.setData({
      heightValue: event.detail.value,
    })
  },

  onWeightInput(event) {
    this.setData({
      weightValue: event.detail.value,
    })
  },

  onCalculate() {
    const height = Number(this.data.heightValue)
    const weight = Number(this.data.weightValue)

    if (!height || !weight) {
      wx.showToast({
        title: '请填写身高和体重',
        icon: 'none',
      })
      return
    }

    if (height < 80 || height > 250) {
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

    const meter = height / 100
    const bmi = weight / (meter * meter)
    const bmiValue = bmi.toFixed(1)
    const result = this.getBmiResult(bmi)
    const minWeight = 18.5 * meter * meter
    const maxWeight = 23.9 * meter * meter

    this.setData({
      hasResult: true,
      bmiValue,
      bmiLevel: result.level,
      bmiDesc: result.desc,
      resultTone: result.tone,
      idealRange: `${minWeight.toFixed(1)} - ${maxWeight.toFixed(1)} kg`,
      markerStyle: `left: ${this.getMarkerPercent(bmi)}%`,
    })
  },

  getBmiResult(bmi) {
    if (bmi < 18.5) {
      return {
        level: '偏瘦',
        desc: '可以适当增加优质蛋白和力量训练，让身体状态更稳。',
        tone: 'low',
      }
    }

    if (bmi < 24) {
      return {
        level: '正常',
        desc: '当前 BMI 位于健康区间，继续保持规律饮食和运动。',
        tone: 'normal',
      }
    }

    if (bmi < 28) {
      return {
        level: '超重',
        desc: '建议关注腰围、饮食结构和日常活动量，慢慢调回舒适区。',
        tone: 'high',
      }
    }

    return {
      level: '肥胖',
      desc: '建议结合身体状况制定减重计划，必要时咨询专业医生。',
      tone: 'alert',
    }
  },

  getMarkerPercent(bmi) {
    const min = 14
    const max = 34
    const clamped = Math.min(Math.max(bmi, min), max)

    return Math.round(((clamped - min) / (max - min)) * 100)
  },

  onReset() {
    this.setData({
      heightValue: '',
      weightValue: '',
      hasResult: false,
      bmiValue: '--',
      bmiLevel: '',
      bmiDesc: '',
      idealRange: '',
      markerStyle: 'left: 0%',
      resultTone: 'normal',
    })
  },
})
