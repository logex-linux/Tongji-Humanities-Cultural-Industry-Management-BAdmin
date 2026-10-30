# MARKET-ATLAS 数据 schema

单文件约束：最终只有一个 `index.html`。数据以多个 JS 文件挂到 `window.ATLAS_*`，
构建时用 Node 脚本拼进 HTML。

## 行业 `data/industries.js`

```js
window.ATLAS_INDUSTRIES = [
  {
    id: "fin-banking",        // kebab-case 唯一
    sector: "金融与保险",      // 必须是 SECTORS 之一
    name: "银行业",
    en: "Banking",
    size: "大",               // 大 / 中 / 小
    growth: 3,                // 1-5 增长前景
    competition: 5,           // 1-5 竞争强度
    regulation: 5,            // 1-5 监管强度
    margin: 4,                // 1-5 毛利水平
    recurring: 5,             // 1-5 收入经常性
    capital: 5,               // 1-5 资本密集度
    chain: ["资金供给", "信贷投放", "风险管理", "清结算"],   // 4-6 个价值链环节
    roles: ["product", "engineering", "finance"],          // 引用 ROLES 的 id，4-8 个
    models: ["net-interest-margin", "interchange-fee"],     // 引用 MODELS 的 id，2-5 个
    revenue: ["净利息收入", "手续费与佣金收入", "投行业务"],
    cost: ["资金成本", "信用减值损失", "网点与人力成本"],
    kpi: ["净息差 NIM", "不良贷款率", "净资产收益率 ROE", "成本收入比"],
    entry: ["柜员", "客户经理", "管理培训生", "风控专员"],
    skills: ["财务建模", "监管合规", "客户关系", "风险识别"],
    risk: ["利差收窄", "信贷周期下行", "监管处罚"],
    trend: ["财富管理转型", "开放银行", "数字人民币", "AI 信贷风控"],
    cases: ["招商银行", "微众银行", "JPMorgan Chase"],
    note: "一句话讲清这个行业靠什么赚钱、钱从哪来到哪去。"
  }
]
```

规则：每个字段必填，不能留空字符串。中文为主，专有名词保留英文。

## 岗位 `data/roles.js`

```js
window.ATLAS_ROLES = [
  {
    id: "product",
    name: "产品经理",
    family: "产品研发",   // 见 ROLE_FAMILIES
    core: "发现需求并定义产品，对商业结果负责",
    skills: ["需求分析", "用户研究", "原型设计", "数据分析", "跨部门沟通"],
    tools: ["Figma", "SQL", "Jira", "神策/GrowingIO"],
    kpi: ["需求交付率", "功能采纳率", "留存与转化", "NPS"],
    pay: { entry: [12, 20], mid: [20, 40], senior: [40, 80] },  // 人民币万/年，一线城市
    barrier: "低",        // 低 / 中 / 高
    certs: ["PMP", "NPDP", "Google PM 证书"],
    path: ["产品助理", "产品经理", "高级产品", "产品总监", "产品VP"],
    ai: "AI 对需求文档、竞品分析替代明显；对判断与决策替代弱",
    freelance: "高"       // 低 / 中 / 高
  }
]
```

## 盈利模式 `data/models.js`

```js
window.ATLAS_MODELS = [
  {
    id: "net-interest-margin",
    family: "资产与资本",   // 见 MODEL_FAMILIES
    name: "净利息差",
    formula: "利息收入 − 资金成本",
    margin: "取决于期限结构与信用溢价，通常 1.5%–3.5% 净息差",
    lever: "规模、期限错配、信用定价能力",
    industries: ["fin-banking", "fin-consumer-finance"],
    fail: "期限错配过度遇上流动性收紧，或信用下沉导致减值吃掉息差",
    cases: ["商业银行", "微众银行"],
    risk: ["利率风险", "流动性风险", "信用风险"],
    note: "把低成本资金以更高利率放出去，赚中间的差价。"
  }
]
```

`industries` 字段允许先留空数组 `[]`，由构建脚本从 `ATLAS_INDUSTRIES` 反推填充。
