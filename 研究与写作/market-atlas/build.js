#!/usr/bin/env node
// 构建：data/parts/*.js + data/roles.js + data/models.js + data/constants.js
//        → 单文件 index.html
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
const OUT = path.join(ROOT, 'index.html');

function read(p) { return fs.readFileSync(p, 'utf8'); }

// 1. 常量
const constantsSrc = read(path.join(DATA, 'constants.js'));

// 2. 行业分片，按文件名排序合并
const partFiles = fs.readdirSync(path.join(DATA, 'parts'))
  .filter(f => f.endsWith('.js') && f !== '00-fixmap.js')
  .sort();
const industriesSrc = partFiles.map(f => read(path.join(DATA, 'parts', f))).join('\n');

const rolesSrc = read(path.join(DATA, 'roles.js'));
const modelsSrc = read(path.join(DATA, 'models.js'));

// 3. 统计信息（构建期算好，运行时零计算）
const sandbox = { window: {} };
const vm = require('vm');
vm.createContext(sandbox);
vm.runInContext(constantsSrc + '\n' + industriesSrc + '\n' + rolesSrc + '\n' + modelsSrc, sandbox);

const IND = sandbox.window.ATLAS_INDUSTRIES;
const ROLES = sandbox.window.ATLAS_ROLES;
const MODELS = sandbox.window.ATLAS_MODELS;
const SECTORS = sandbox.window.ATLAS_SECTORS;

if (!IND || !ROLES || !MODELS) throw new Error('数据未定义');

// 3.1 修正悬空引用
const fixSrc = read(path.join(DATA, 'parts', '00-fixmap.js'));
vm.runInContext(fixSrc, sandbox);
sandbox.window.ATLAS_FIX_DANGLING(IND, ROLES, MODELS);

// 校验：不允许再有悬空 id
const mid = {}, rid = {};
MODELS.forEach(m => mid[m.id] = 1);
ROLES.forEach(r => rid[r.id] = 1);
const dangling = [];
IND.forEach(i => {
  i.models.forEach(m => { if (!mid[m]) dangling.push(`model ${i.id}/${m}`); });
  i.roles.forEach(r => { if (!rid[r]) dangling.push(`role ${i.id}/${r}`); });
});
if (dangling.length) throw new Error('悬空引用 ' + dangling.length + ' 处: ' + dangling.slice(0, 5).join(', '));

// 3.2 叠加 2026 时效性补丁
const patchSrc = read(path.join(DATA, 'patch-2026.js'));
vm.runInContext(patchSrc, sandbox);
const P = sandbox.window.ATLAS_PATCH_2026;
const OVERWRITE = ['note', 'kpi', 'risk', 'trend', 'cases', 'live', 'growth', 'margin', 'competition', 'recurring', 'regulation', 'capital', 'chain', 'revenue', 'cost', 'entry', 'skills'];
const applyPatch = (arr, patch) => {
  let n = 0;
  arr.forEach(it => {
    const p = patch[it.id];
    if (!p) return;
    OVERWRITE.forEach(k => { if (p[k] !== undefined) it[k] = p[k]; });
    // pay 是嵌套对象，整体替换
    if (p.pay) it.pay = p.pay;
    // 其余标量字段（core/skills/ai 等）也允许覆盖
    Object.keys(p).forEach(k => {
      if (k === 'pay' || k === 'trend2026') return;
      if (OVERWRITE.indexOf(k) === -1 && p[k] !== undefined) it[k] = p[k];
    });
    n++;
  });
  return n;
};
const nInd = applyPatch(IND, P.industries);
const nRole = applyPatch(ROLES, P.roles);
const nModel = applyPatch(MODELS, P.models);
console.log(`  补丁应用: 行业 ${nInd}、岗位 ${nRole}、盈利模式 ${nModel}`);

// 3.3 叠加小白讲解层（让新手能读懂）
const guideSrc = read(path.join(DATA, 'guide.js'));
const glossarySrc = read(path.join(DATA, 'glossary.js'));
const indPlainSrc = read(path.join(DATA, 'industry-plain.js'));
const rolePlainSrc = read(path.join(DATA, 'role-plain.js'));
const modelPlainSrc = read(path.join(DATA, 'model-plain.js'));
vm.runInContext(guideSrc + '\n' + glossarySrc + '\n' + indPlainSrc + '\n' + rolePlainSrc + '\n' + modelPlainSrc, sandbox);

const GUIDE = sandbox.window.ATLAS_GUIDE;
const GLOSSARY = sandbox.window.ATLAS_GLOSSARY;
const mergePlain = (arr, plain, fields) => {
  let n = 0;
  arr.forEach(it => {
    const p = plain[it.id];
    if (!p) return;
    fields.forEach(f => { if (p[f] !== undefined) it[f] = p[f]; });
    n++;
  });
  return n;
};
const pInd = mergePlain(IND, sandbox.window.ATLAS_INDUSTRY_PLAIN, ['plain', 'who', 'pain', 'howto']);
const pRole = mergePlain(ROLES, sandbox.window.ATLAS_ROLE_PLAIN, ['plain', 'reality', 'advice']);
const pModel = mergePlain(MODELS, sandbox.window.ATLAS_MODEL_PLAIN, ['plain', 'analogy', 'watch']);
console.log(`  小白讲解: 行业 ${pInd}、岗位 ${pRole}、盈利模式 ${pModel}、术语 ${GLOSSARY.length} 条`);

// 反填 model.industries（从行业引用推导）
const byModel = {};
IND.forEach(i => i.models.forEach(m => {
  (byModel[m] = byModel[m] || []).push(i.id);
}));
MODELS.forEach(m => {
  m.industries = (byModel[m.id] || []).slice();
});

// 岗位 → 行业 反查
const roleToInd = {};
IND.forEach(i => i.roles.forEach(r => {
  (roleToInd[r] = roleToInd[r] || []).push(i.id);
}));
ROLES.forEach(r => { r.industries = (roleToInd[r.id] || []).slice(); });

const stats = {
  industries: IND.length,
  roles: ROLES.length,
  models: MODELS.length,
  sectors: SECTORS.length,
  glossary: GLOSSARY.length,
  patched: nInd + nRole + nModel
};

// 修正 + 补丁 + 讲解后的数据整体注入，保证产物与校验一致
const fixedIndSrc = `window.ATLAS_INDUSTRIES = ${JSON.stringify(IND)};`;
const fixedRoleSrc = `window.ATLAS_ROLES = ${JSON.stringify(ROLES)};`;
const fixedModelSrc = `window.ATLAS_MODELS = ${JSON.stringify(MODELS)};`;

const DATA_JS = [
  constantsSrc,
  fixedIndSrc,
  fixedRoleSrc,
  fixedModelSrc,
  `window.ATLAS_GUIDE = ${JSON.stringify(GUIDE)};`,
  `window.ATLAS_GLOSSARY = ${JSON.stringify(GLOSSARY)};`,
  `window.ATLAS_MACRO = ${JSON.stringify(P.macro)};`,
  `window.ATLAS_STATS = ${JSON.stringify(stats)};`,
  `window.ATLAS_MODEL_TREND = ${JSON.stringify(MODELS.reduce((a, m) => { const p = P.models[m.id]; if (p && p.trend2026) a[m.id] = p.trend2026; return a; }, {}))};`
].join('\n');

const APP_CSS = read(path.join(ROOT, 'src', 'app.css'));
const APP_JS = read(path.join(ROOT, 'src', 'app.js'));
const HTML = read(path.join(ROOT, 'src', 'index.template.html'));

const out = HTML
  .replace('/*__APP_CSS__*/', () => APP_CSS)
  .replace('/*__DATA_JS__*/', () => DATA_JS)
  .replace('/*__APP_JS__*/', () => APP_JS);

fs.writeFileSync(OUT, out, 'utf8');
const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log(`build OK  index.html ${kb} KB`);
console.log(`  industries=${stats.industries} roles=${stats.roles} models=${stats.models} sectors=${stats.sectors}`);
