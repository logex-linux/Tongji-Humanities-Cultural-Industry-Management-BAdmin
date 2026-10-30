// 共享词表：板块、岗位族、盈利模式族。子代理与主代理共用同一套 id。
window.ATLAS_SECTORS = [
  { id: "agri",       name: "农业与食品",   en: "Agriculture & Food" },
  { id: "mining",     name: "矿产与能源",   en: "Mining & Energy" },
  { id: "chemical",   name: "化工与材料",   en: "Chemicals & Materials" },
  { id: "manufacture",name: "制造与工业",   en: "Manufacturing & Industrial" },
  { id: "construction", name: "建筑与房地产", en: "Construction & Real Estate" },
  { id: "consumer",   name: "消费与零售",   en: "Consumer & Retail" },
  { id: "health",     name: "医疗健康",     en: "Healthcare & Life Sciences" },
  { id: "education",  name: "教育与人才",   en: "Education & Talent" },
  { id: "tech",       name: "科技与通信",   en: "Technology & Telecom" },
  { id: "media",      name: "传媒与文化娱乐", en: "Media & Entertainment" },
  { id: "finance",    name: "金融与保险",   en: "Finance & Insurance" },
  { id: "logistics",  name: "物流与运输",   en: "Logistics & Transport" },
  { id: "service",    name: "专业与生活服务", en: "Professional & Consumer Services" },
  { id: "public",     name: "公共与环保",   en: "Public Sector & Environment" },
  { id: "gov",        name: "政府与国防",   en: "Government & Defense" }
]

// 岗位族：所有 role 的 family 必须取这里的 id
window.ATLAS_ROLE_FAMILIES = [
  { id: "product",     name: "产品与设计" },
  { id: "engineering", name: "技术与研发" },
  { id: "data",        name: "数据与算法" },
  { id: "growth",      name: "市场与增长" },
  { id: "sales",       name: "销售与商务" },
  { id: "operations",  name: "运营与供应链" },
  { id: "finance",     name: "财务与资金" },
  { id: "risk",        name: "风控与合规" },
  { id: "hr",          name: "人力与组织" },
  { id: "legal",       name: "法务与知识产权" },
  { id: "service",     name: "客服与实施" },
  { id: "clinical",    name: "临床与实验室" },
  { id: "care",        name: "护理与康复" },
  { id: "education",   name: "教研与教学" },
  { id: "production",  name: "生产与工程实施" },
  { id: "trades",      name: "技能与服务工种" },
  { id: "field",       name: "外勤与现场" },
  { id: "admin",       name: "行政与综合" },
  { id: "creative",    name: "内容与创意" },
  { id: "public",      name: "公共与政策" }
]

// 盈利模式族：所有 model 的 family 必须取这里的 id
window.ATLAS_MODEL_FAMILIES = [
  { id: "transaction", name: "交易与价差", en: "Spread & Transaction" },
  { id: "asset",       name: "资产与资本", en: "Asset & Capital" },
  { id: "recurring",   name: "订阅与经常性", en: "Recurring" },
  { id: "usage",       name: "用量与按需", en: "Usage-based" },
  { id: "attention",   name: "注意力与流量", en: "Attention" },
  { id: "platform",    name: "平台与撮合", en: "Platform" },
  { id: "service",     name: "人力与专业服务", en: "Professional Service" },
  { id: "labor",       name: "加工与制造", en: "Conversion & Labor" },
  { id: "license",     name: "授权与许可", en: "License & Royalty" },
  { id: "gambit",      name: "押注与风险承担", en: "Risk-taking" }
]
