# 日常工具箱小程序

这是一个基于原生微信小程序开发的轻量工具合集，主要提供日常计算、图片处理、生活查询和本地记账类能力。

## 项目特点

- 使用微信小程序原生页面结构开发。
- UI 组件主要基于 `tdesign-miniprogram`。
- 启用 Skyline 渲染器和 glass-easel 组件框架。
- 多数工具在本地完成计算或处理，不依赖后端服务。
- 工具入口、搜索关键词和分类信息集中维护在 `utils/tool-catalog.js`。

## 目录结构

```text
.
├── app.js                  # 小程序全局入口
├── app.json                # 页面注册和全局配置
├── app.wxss                # 全局样式
├── components/             # 自定义组件
│   └── navigation-bar/     # 自定义导航栏
├── pages/                  # 页面与工具
│   ├── index/              # 首页
│   ├── search/             # 搜索页
│   ├── bmi/                # BMI 计算
│   ├── bmr/                # 基础代谢率计算
│   ├── mortgage/           # 房贷计算
│   ├── salary/             # 工资计算
│   ├── compound/           # 复利/定投计算
│   ├── zodiac/             # 星座计算
│   ├── converter/          # 单位换算
│   ├── price-compare/      # 比价计算
│   ├── qrcode/             # 二维码生成
│   ├── image-compress/     # 图片压缩
│   ├── image-resize/       # 图片尺寸调整
│   ├── nine-grid/          # 九宫格切图
│   ├── relationship/       # 亲戚关系计算
│   ├── shelf-life/         # 保质期计算
│   ├── poker-ledger/       # 打牌记账
│   ├── restaurant/         # 餐饮投资计算
│   └── guide/              # 使用指南
├── utils/                  # 通用工具与数据
│   └── tool-catalog.js     # 工具目录和搜索逻辑
├── miniprogram_npm/        # 小程序 npm 构建产物
├── package.json            # npm 依赖声明
└── project.config.json     # 微信开发者工具项目配置
```

## 本地开发

1. 使用微信开发者工具导入当前目录。
2. 如依赖缺失，先执行 `npm install`。
3. 在微信开发者工具中执行“工具 -> 构建 npm”。
4. 编译预览小程序。

## 新增工具流程

1. 在 `pages/` 下新建工具目录，例如 `pages/example/`。
2. 添加对应的 `example.js`、`example.wxml`、`example.wxss`、`example.json`。
3. 在 `app.json` 的 `pages` 中注册页面路径。
4. 在 `utils/tool-catalog.js` 中补充工具名称、描述、分类、关键词和页面路径。
5. 如首页需要展示，把工具放入 `featuredTools` 或 `hotTools`；如果只希望搜索可见，放入 `moreTools`。

## 维护建议

- 计算逻辑尽量保持纯函数化，方便复用和后续测试。
- 页面文案、工具元信息优先集中维护，避免多处重复。
- 图片处理类页面注意控制临时文件、canvas 尺寸和用户授权提示。
- 涉及本地存储的页面应注意数据兼容和异常恢复。
