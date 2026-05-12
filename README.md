<h1 align="center">全能工具箱</h1>

<p align="center">
  一个基于原生微信小程序开发的轻量工具合集，覆盖日常计算、图片/视频处理、生活查询、本地记账和便民服务入口。
</p>

<p align="center">
  <a href="#-功能特性">功能特性</a> ·
  <a href="#-快速开始">快速开始</a> ·
  <a href="#-技术栈">技术栈</a> ·
  <a href="#-新增工具">新增工具</a>
</p>

<p align="center">
  <img alt="微信小程序" src="https://img.shields.io/badge/WeChat-Mini%20Program-07C160">
  <img alt="TDesign" src="https://img.shields.io/badge/UI-TDesign%20MiniProgram-0052D9">
  <img alt="Renderer" src="https://img.shields.io/badge/Renderer-Skyline-2F7567">
</p>

<p align="center">
  <img src="assets/readme/applet-qrcode.jpg" alt="全能工具箱小程序二维码" width="220">
</p>

> [!IMPORTANT]
> 本项目是一个偏本地化运行的微信小程序工具箱。多数计算与图片处理能力在小程序端完成，不依赖后端服务；工具入口、搜索关键词和分类信息集中维护在 `utils/tool-catalog.js`。

---

## ✨ 功能特性

- 🔎 **首页推荐与搜索** - 首页展示主推工具、热门工具和专题入口，搜索页支持按名称、分类、描述和关键词检索。
- 🧮 **生活计算工具** - 覆盖房贷、工资、养老金、退休年龄、单位换算、比价、日期间隔、保质期等高频场景。
- 🖼️ **图片与视频处理** - 支持二维码生成、图片压缩、图片尺寸调整、九宫格切图和视频压缩。
- 🧾 **本地记录工具** - 打牌记账等工具在本地完成记录和结算，适合轻量场景。
- 🧭 **便民服务入口** - 聚合电子社保卡、12333、国家政务服务平台等外部小程序入口。
- 🧩 **集中化工具目录** - 通过 `featuredTools`、`hotTools`、`moreTools`、`topicCards` 控制首页曝光、搜索可见性和专题入口。

---

## 🚀 快速开始

**前提条件**：安装微信开发者工具，并确保本机可使用 npm。

### 方式一：微信开发者工具导入

1. 使用微信开发者工具导入当前项目目录。
2. 如依赖缺失，在项目根目录执行：

```bash
npm install
```

3. 在微信开发者工具中执行「工具 -> 构建 npm」。
4. 点击「编译」预览小程序。

> [!TIP]
> `miniprogram_npm/` 是微信开发者工具构建 npm 后生成的目录。如果 TDesign 组件无法加载，优先重新执行「构建 npm」。

### 方式二：本地依赖更新

```bash
npm install
```

然后回到微信开发者工具重新构建 npm 并编译。

> [!WARNING]
> 项目启用了 `__usePrivacyCheck__`。涉及保存图片、视频到相册等能力时，需要同步关注微信小程序的隐私与授权配置。

---

## 📦 技术栈

- **框架**：微信小程序原生开发
- **页面结构**：JavaScript + WXML + WXSS + JSON
- **UI 组件**：TDesign MiniProgram
- **渲染器**：Skyline
- **组件框架**：glass-easel
- **工具数据**：`utils/tool-catalog.js`
- **通用能力**：`utils/image-save.js`、`utils/device.js`

---

## 🧰 工具清单

| 分类 | 工具 |
| --- | --- |
| 经营计算 | 餐饮投资计算器 |
| 日常计算 | 单位换算、校准尺子 |
| 生活计算 | 房贷计算器、工资计算器、养老金估算器、退休年龄计算器、比价计算器、亲戚关系计算器、商品保质期计算器、日期间隔计算器 |
| 生活健康 | BMI 计算、基础代谢率 |
| 理财计算 | 复利 / 定投计算器 |
| 生活娱乐 | 星座计算器、选择困难助手 |
| 图片处理 | 二维码生成、图片压缩、图片尺寸调整、九宫格切图 |
| 视频处理 | 视频压缩 |
| 棋牌工具 | 打牌记账 |
| 使用指南 | 全能工具箱使用指南 |
| 外部入口 | 电子社保卡、12333、国家政务服务平台、Sky星尘 |

---

## 📁 项目结构

```text
.
├── app.js                         # 小程序全局入口
├── app.json                       # 页面注册、权限和全局渲染配置
├── app.wxss                       # 全局样式
├── components/
│   └── navigation-bar/            # 自定义导航栏组件
├── pages/
│   ├── index/                     # 首页
│   ├── search/                    # 工具搜索页
│   ├── guide/                     # 使用指南
│   ├── restaurant/                # 餐饮投资计算器
│   ├── qrcode/                    # 二维码生成
│   ├── mortgage/                  # 房贷计算器
│   ├── salary/                    # 工资计算器
│   ├── retirement-pension/        # 养老金估算器
│   ├── retirement-age/            # 退休年龄计算器
│   ├── converter/                 # 单位换算
│   ├── ruler/                     # 校准尺子
│   ├── price-compare/             # 比价计算器
│   ├── bmi/                       # BMI 计算
│   ├── bmr/                       # 基础代谢率
│   ├── relationship/              # 亲戚关系计算器
│   ├── compound/                  # 复利 / 定投计算器
│   ├── zodiac/                    # 星座计算器
│   ├── choice-helper/             # 选择困难助手
│   ├── shelf-life/                # 商品保质期计算器
│   ├── date-diff/                 # 日期间隔计算器
│   ├── poker-ledger/              # 打牌记账
│   ├── image-compress/            # 图片压缩
│   ├── image-resize/              # 图片尺寸调整
│   ├── video-compress/            # 视频压缩
│   └── nine-grid/                 # 九宫格切图
├── utils/
│   ├── tool-catalog.js            # 工具目录、分类、关键词和搜索逻辑
│   ├── image-save.js              # 图片保存相关封装
│   └── device.js                  # 设备信息相关封装
├── assets/
│   └── icons/                     # 外部入口和工具图标资源
├── miniprogram_npm/               # 小程序 npm 构建产物
├── package.json                   # npm 依赖声明
├── project.config.json            # 微信开发者工具项目配置
├── project.private.config.json    # 本地开发者私有配置
└── sitemap.json                   # 小程序页面收录配置
```

---

## 🧩 新增工具

1. 在 `pages/` 下新建工具目录，例如 `pages/example/`。
2. 添加同名页面文件：`example.js`、`example.wxml`、`example.wxss`、`example.json`。
3. 在 `app.json` 的 `pages` 数组中注册页面路径。
4. 在 `utils/tool-catalog.js` 中补充工具元信息：
   - `id`
   - `title`
   - `desc`
   - `category`
   - `path`
   - `keywords`
   - 图标、色调和首页展示配置
5. 根据展示策略放入对应列表：
   - `featuredTools`：首页主推工具
   - `hotTools`：首页热门工具
   - `moreTools`：仅搜索页可见
   - `topicCards`：专题或指南类入口
6. 如使用 TDesign 组件，在页面 `json` 的 `usingComponents` 中声明对应组件。

---

## 🔧 维护建议

- 计算类页面优先把核心计算逻辑拆成清晰函数，减少和页面状态混写。
- 工具名称、描述、分类和关键词优先维护在 `tool-catalog.js`，避免首页、搜索页和页面文案互相漂移。
- 图片/视频处理类页面需要重点关注临时文件、canvas 尺寸、压缩质量、保存授权和失败兜底。
- 涉及本地存储的页面需要考虑历史数据兼容、异常恢复和清空入口。
- 新增页面后同时检查首页入口、搜索结果、返回路径和隐私权限描述。

---

## 🤝 参与方式

欢迎通过以下方式参与维护：

- 提交 Issue 反馈 Bug 或功能建议。
- 提交 Pull Request 补充工具、修复问题或完善文档。
- 新增工具时请同步更新 `app.json` 和 `utils/tool-catalog.js`。

---

## 🔗 友链与致谢

感谢 [Linux Do](https://linux.do/) 社区佬们的支持。

---

<p align="center">
  Made with care for daily tools.
</p>
