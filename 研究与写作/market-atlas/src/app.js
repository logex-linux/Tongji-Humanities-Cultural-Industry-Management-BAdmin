(function () {
  'use strict';

  var SECTORS = window.ATLAS_SECTORS;
  var ROLE_FAMILIES = window.ATLAS_ROLE_FAMILIES;
  var MODEL_FAMILIES = window.ATLAS_MODEL_FAMILIES;
  var IND = window.ATLAS_INDUSTRIES;
  var ROLES = window.ATLAS_ROLES;
  var MODELS = window.ATLAS_MODELS;
  var STATS = window.ATLAS_STATS;
  var MACRO = window.ATLAS_MACRO;
  var GUIDE = window.ATLAS_GUIDE;
  var GLOSSARY = window.ATLAS_GLOSSARY;
  var MODEL_TREND = window.ATLAS_MODEL_TREND || {};

  var SECTOR_BY_ID = {};
  SECTORS.forEach(function (s) { SECTOR_BY_ID[s.id] = s; });
  var IND_BY_ID = {};
  IND.forEach(function (i) { IND_BY_ID[i.id] = i; });
  var ROLE_BY_ID = {};
  ROLES.forEach(function (r) { ROLE_BY_ID[r.id] = r; });
  var MODEL_BY_ID = {};
  MODELS.forEach(function (m) { MODEL_BY_ID[m.id] = m; });

  var SECTOR_COLOR = {};
  SECTORS.forEach(function (s, i) {
    SECTOR_COLOR[s.id] = 'var(--a' + (i + 1) + ')';
  });
  var FAMILY_COLOR = {};
  ROLE_FAMILIES.concat(MODEL_FAMILIES).forEach(function (f, i) {
    FAMILY_COLOR[f.id] = 'var(--a' + ((i % 15) + 1) + ')';
  });

  var state = {
    view: 'industry',
    q: '',
    sector: 'all',
    family: 'all',
    minGrowth: 0,
    sort: 'name',
    onlyHigh: false   // 仅看高毛利或高增长
  };

  // ── 工具 ──
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) {
    return String(s || '').toLowerCase().replace(/\s+/g, '');
  }
  function meter(k, v, color) {
    return '<div class="meter"><span class="meter-k">' + k + '</span>' +
      '<span class="meter-t"><span class="meter-f" style="width:' + (v / 5 * 100) + '%;background:' + color + '"></span></span>' +
      '<span class="meter-v">' + v + '</span></div>';
  }
  function tags(list, mapper, limit) {
    var out = [];
    var shown = list.slice(0, limit || 3);
    shown.forEach(function (x) {
      var m = mapper ? mapper(x) : null;
      out.push(m
        ? '<a class="d-tag" href="#" data-goto="' + m.view + '" data-id="' + esc(x) + '">' + esc(m.label) + '</a>'
        : '<span class="d-tag">' + esc(x) + '</span>');
    });
    if (list.length > shown.length) out.push('<span class="d-tag">+' + (list.length - shown.length) + '</span>');
    return '<div class="d-tags">' + out.join('') + '</div>';
  }

  // ── 数据集合 ──
  function currentSet() {
    return state.view === 'industry' ? IND : state.view === 'role' ? ROLES : MODELS;
  }
  function itemColor(it) {
    if (state.view === 'industry') return SECTOR_COLOR[it.sector] || 'var(--accent)';
    return FAMILY_COLOR[it.family] || 'var(--accent)';
  }
  function itemSub(it) {
    if (state.view === 'industry') {
      var s = SECTOR_BY_ID[it.sector];
      return s ? s.name : '';
    }
    if (state.view === 'role') {
      var rf = ROLE_FAMILIES.filter(function (f) { return f.id === it.family; })[0];
      return rf ? rf.name : '';
    }
    var mf = MODEL_FAMILIES.filter(function (f) { return f.id === it.family; })[0];
    return mf ? mf.name : '';
  }

  function match(it) {
    var q = norm(state.q);
    if (q) {
      var arr = function (v) { return Array.isArray(v) ? v.join('') : (v || ''); };
      var hay = norm([
        it.name, it.en, it.note, it.formula, it.core,
        arr(it.revenue), arr(it.cost), arr(it.kpi),
        arr(it.skills), arr(it.chain), arr(it.trend),
        arr(it.risk), arr(it.cases), arr(it.entry),
        arr(it.lever), arr(it.tools), arr(it.path),
        // 小白讲解层字段，让新手也能用大白话搜到
        it.plain, it.who, it.pain, it.howto, it.analogy, it.watch, it.reality, it.advice
      ].join(' '));
      if (hay.indexOf(q) === -1) return false;
    }
    if (state.view === 'industry') {
      if (state.sector !== 'all' && it.sector !== state.sector) return false;
      if (state.minGrowth && it.growth < state.minGrowth) return false;
      if (state.onlyHigh && !(it.margin >= 4 || it.growth >= 4)) return false;
    } else {
      if (state.family !== 'all' && it.family !== state.family) return false;
    }
    return true;
  }

  function sorted(list) {
    var key = state.sort;
    if (state.view === 'role') key = 'name';
    var arr = list.slice();
    arr.sort(function (a, b) {
      if (key === 'name') return a.name.localeCompare(b.name, 'zh-Hans-CN');
      return (b[key] || 0) - (a[key] || 0) || a.name.localeCompare(b.name, 'zh-Hans-CN');
    });
    return arr;
  }

  // ── 渲染：侧栏 ──
  function renderFilters() {
    var box = document.getElementById('filters');
    box.innerHTML = '';

    if (state.view === 'industry') {
      var g = el('div');
      g.appendChild(el('p', 'side-h', '板块'));
      var l = el('div', 'f-list');
      var all = el('button', 'f-item' + (state.sector === 'all' ? ' is-on' : ''));
      all.innerHTML = '<span class="f-dot" style="background:var(--accent)"></span>全部板块<span class="f-num">' + IND.length + '</span>';
      all.onclick = function () { state.sector = 'all'; render(); };
      l.appendChild(all);
      SECTORS.forEach(function (s) {
        var n = IND.filter(function (i) { return i.sector === s.id; }).length;
        var b = el('button', 'f-item' + (state.sector === s.id ? ' is-on' : ''));
        b.innerHTML = '<span class="f-dot" style="background:' + SECTOR_COLOR[s.id] + '"></span>' +
          esc(s.name) + '<span class="f-num">' + n + '</span>';
        b.onclick = function () { state.sector = s.id; render(); };
        l.appendChild(b);
      });
      g.appendChild(l);
      box.appendChild(g);

      var g2 = el('div');
      g2.appendChild(el('p', 'side-h', '增长前景 ≥'));
      var r = el('div', 'range-row');
      var inp = document.createElement('input');
      inp.type = 'range'; inp.min = 0; inp.max = 5; inp.step = 1; inp.value = state.minGrowth;
      inp.setAttribute('aria-label', '最低增长前景');
      var val = el('span', 'range-val', String(state.minGrowth));
      inp.oninput = function () { state.minGrowth = +inp.value; val.textContent = inp.value; renderGrid(); };
      r.appendChild(inp); r.appendChild(val);
      g2.appendChild(r);
      box.appendChild(g2);

      var g3 = el('div');
      g3.appendChild(el('p', 'side-h', '快速筛选'));
      var t = el('div', 'toggles');
      var tg = el('button', 'tg' + (state.onlyHigh ? ' is-on' : ''));
      tg.innerHTML = '<span class="tg-box"><svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg></span>高毛利或高增长';
      tg.onclick = function () { state.onlyHigh = !state.onlyHigh; render(); };
      t.appendChild(tg);
      g3.appendChild(t);
      box.appendChild(g3);

    } else if (state.view === 'role') {
      var gr = el('div');
      gr.appendChild(el('p', 'side-h', '岗位族'));
      var lr = el('div', 'f-list');
      var allr = el('button', 'f-item' + (state.family === 'all' ? ' is-on' : ''));
      allr.innerHTML = '<span class="f-dot" style="background:var(--accent)"></span>全部<span class="f-num">' + ROLES.length + '</span>';
      allr.onclick = function () { state.family = 'all'; render(); };
      lr.appendChild(allr);
      ROLE_FAMILIES.forEach(function (f) {
        var n = ROLES.filter(function (r) { return r.family === f.id; }).length;
        if (!n) return;
        var b = el('button', 'f-item' + (state.family === f.id ? ' is-on' : ''));
        b.innerHTML = '<span class="f-dot" style="background:' + FAMILY_COLOR[f.id] + '"></span>' +
          esc(f.name) + '<span class="f-num">' + n + '</span>';
        b.onclick = function () { state.family = f.id; render(); };
        lr.appendChild(b);
      });
      gr.appendChild(lr);
      box.appendChild(gr);
    } else {
      var gm = el('div');
      gm.appendChild(el('p', 'side-h', '模式族'));
      var lm = el('div', 'f-list');
      var allm = el('button', 'f-item' + (state.family === 'all' ? ' is-on' : ''));
      allm.innerHTML = '<span class="f-dot" style="background:var(--accent)"></span>全部<span class="f-num">' + MODELS.length + '</span>';
      allm.onclick = function () { state.family = 'all'; render(); };
      lm.appendChild(allm);
      MODEL_FAMILIES.forEach(function (f) {
        var n = MODELS.filter(function (m) { return m.family === f.id; }).length;
        var b = el('button', 'f-item' + (state.family === f.id ? ' is-on' : ''));
        b.innerHTML = '<span class="f-dot" style="background:' + FAMILY_COLOR[f.id] + '"></span>' +
          esc(f.name) + '<span class="f-num">' + n + '</span>';
        b.onclick = function () { state.family = f.id; render(); };
        lm.appendChild(b);
      });
      gm.appendChild(lm);
      box.appendChild(gm);
    }
  }

  // ── 渲染：筛选条 ──
  function renderChips() {
    var box = document.getElementById('chips');
    box.innerHTML = '';
    var add = function (label, val, clear) {
      var c = el('span', 'chip');
      c.innerHTML = esc(label) + ' <b>' + esc(val) + '</b> ';
      var x = el('button', '', '✕');
      x.setAttribute('aria-label', '移除筛选 ' + label);
      x.onclick = clear;
      c.appendChild(x);
      box.appendChild(c);
    };
    var any = false;
    if (state.q) { add('搜索', state.q, function () { state.q = ''; document.getElementById('q').value = ''; render(); }); any = true; }
    if (state.view === 'industry' && state.sector !== 'all') {
      add('板块', SECTOR_BY_ID[state.sector].name, function () { state.sector = 'all'; render(); }); any = true;
    }
    if (state.view !== 'industry' && state.family !== 'all') {
      add('分类', itemSub({ family: state.family }), function () { state.family = 'all'; render(); }); any = true;
    }
    if (state.view === 'industry' && state.minGrowth) {
      add('增长 ≥', String(state.minGrowth), function () { state.minGrowth = 0; render(); }); any = true;
    }
    if (state.view === 'industry' && state.onlyHigh) {
      add('精选', '高毛利或高增长', function () { state.onlyHigh = false; render(); }); any = true;
    }
    if (any) {
      var c = el('button', 'chip clear', '清空全部');
      c.onclick = function () {
        state.q = ''; state.sector = 'all'; state.family = 'all';
        state.minGrowth = 0; state.onlyHigh = false;
        document.getElementById('q').value = '';
        render();
      };
      box.appendChild(c);
    }
    document.getElementById('sort').parentNode.style.display = state.view === 'industry' ? '' : 'none';
  }

  // ── 渲染：卡片 ──
  function renderGrid() {
    var grid = document.getElementById('grid');
    var empty = document.getElementById('empty');
    var list = sorted(currentSet().filter(match));
    grid.innerHTML = '';
    if (!list.length) { empty.hidden = false; return; }
    empty.hidden = true;

    var frag = document.createDocumentFragment();
    list.forEach(function (it) {
      var c = el('button', 'card');
      c.style.setProperty('--c', itemColor(it));
      c.setAttribute('data-id', it.id);
      var h = '';

      h += '<div class="c-head"><span class="c-name">' + esc(it.name) + '</span>' +
        (it.en ? '<span class="c-en">' + esc(it.en) + '</span>' : '') +
        '<span class="c-tag">' + esc(itemSub(it)) + '</span></div>';

      var note = state.view === 'industry' ? it.note
        : state.view === 'role' ? it.core
        : it.formula + ' — ' + it.margin;
      h += '<p class="c-note">' + esc(note) + '</p>';

      if (state.view === 'industry') {
        h += '<div class="c-meters">' +
          meter('增长', it.growth, itemColor(it)) +
          meter('毛利', it.margin, itemColor(it)) +
          meter('监管', it.regulation, itemColor(it)) +
          '</div>';
      } else if (state.view === 'role') {
        h += '<div class="c-meters">' +
          meter('薪酬带宽', it.pay.senior[1] >= 60 ? 5 : it.pay.senior[1] >= 35 ? 4 : it.pay.senior[1] >= 22 ? 3 : 2, itemColor(it)) +
          '</div>';
        h += '<div class="c-foot"><span class="pill">' + esc(it.pay.entry[0]) + '–' + esc(it.pay.entry[1]) + '万起</span>' +
          '<span class="pill">' + esc(it.barrier) + '门槛</span>' +
          (it.industries.length ? '<span class="pill more">' + it.industries.length + ' 个行业</span>' : '') +
          '</div>';
      } else {
        h += '<div class="c-foot">' +
          (it.industries.length
            ? '<span class="pill">' + esc(IND_BY_ID[it.industries[0]].name) + (it.industries.length > 1 ? ' 等 ' + it.industries.length + ' 个行业' : '') + '</span>'
            : '<span class="pill">跨行业通用</span>') +
          '</div>';
      }

      if (state.view === 'industry') {
        h += '<div class="c-foot">';
        it.models.slice(0, 2).forEach(function (m) {
          var mm = MODEL_BY_ID[m];
          if (mm) h += '<span class="pill">' + esc(mm.name) + '</span>';
        });
        if (it.models.length > 2) h += '<span class="pill more">+' + (it.models.length - 2) + '</span>';
        h += '</div>';
      }

      c.innerHTML = h;
      c.onclick = function () { openDrawer(it.id); };
      frag.appendChild(c);
    });
    grid.appendChild(frag);
  }

  // ── 抽屉 ──
  var lastFocus = null;
  function openDrawer(id) {
    var d = document.getElementById('drawer');
    var body = document.getElementById('drawer-body');
    lastFocus = document.activeElement;
    d.hidden = false;
    document.body.style.overflow = 'hidden';
    body.innerHTML = state.view === 'industry' ? industryHTML(id)
      : state.view === 'role' ? roleHTML(id)
      : modelHTML(id);
    body.scrollTop = 0;
    body.querySelectorAll('[data-goto]').forEach(function (a) {
      a.onclick = function (e) {
        e.preventDefault();
        var v = a.getAttribute('data-goto');
        var target = a.getAttribute('data-id');
        if (v === 'industry') { state.view = 'industry'; openDrawer(target); }
        else if (v === 'role') { state.view = 'role'; openDrawer(target); }
        else { state.view = 'model'; openDrawer(target); }
        render();
      };
    });
    var x = body.querySelector('.drawer-x') || d.querySelector('.drawer-x');
    if (x) x.focus();
  }
  function closeDrawer() {
    var d = document.getElementById('drawer');
    d.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function rowsHTML(pairs) {
    return '<dl class="d-rows">' + pairs.map(function (p) {
      return '<div class="d-row"><dt>' + esc(p[0]) + '</dt><dd>' + p[1] + '</dd></div>';
    }).join('') + '</dl>';
  }

  function industryHTML(id) {
    var it = IND_BY_ID[id];
    var c = SECTOR_COLOR[it.sector];
    var h = '';
    h += '<div class="d-hero" style="--c:' + c + '">';
    h += '<div class="d-kicker">' + esc(SECTOR_BY_ID[it.sector].name) + '</div>';
    h += '<h2 class="d-title" id="d-title">' + esc(it.name) + '</h2>';
    h += '<p class="d-sub">' + esc(it.en) + ' · 规模' + esc(it.size) + '</p>';
    h += '</div>';

    // 小白讲解：这行在做什么
    if (it.plain) {
      h += '<div class="d-plain"><div class="d-plain-h">这个行业在做什么</div>' + esc(it.plain) + '</div>';
    }
    h += '<p class="d-lead">' + esc(it.note) + '</p>';

    if (it.who || it.pain || it.howto) {
      h += '<div class="d-sec"><p class="d-sec-h">新手三问</p><div class="d-kv">';
      if (it.who) h += '<div class="d-kv-row"><span class="d-kv-k">谁付钱</span><span class="d-kv-v">' + esc(it.who) + '</span></div>';
      if (it.pain) h += '<div class="d-kv-row"><span class="d-kv-k">难在哪</span><span class="d-kv-v">' + esc(it.pain) + '</span></div>';
      if (it.howto) h += '<div class="d-kv-row"><span class="d-kv-k">怎么了解</span><span class="d-kv-v">' + esc(it.entry) + '</span></div>';
      h += '</div></div>';
    }

    h += '<div class="d-sec"><p class="d-sec-h">六维评分</p><div class="d-metrics">' +
      metricHTML('增长前景', it.growth, '/5') +
      metricHTML('竞争强度', it.competition, '/5') +
      metricHTML('监管强度', it.regulation, '/5') +
      metricHTML('毛利水平', it.margin, '/5') +
      metricHTML('收入经常性', it.recurring, '/5') +
      metricHTML('资本密集度', it.capital, '/5') +
      '</div></div>';

    h += '<div class="d-sec"><p class="d-sec-h">价值链</p><div class="d-chain">' +
      it.chain.map(function (s, i) {
        return (i ? '<span class="chain-arrow">→</span>' : '') + '<span class="chain-step">' + esc(s) + '</span>';
      }).join('') + '</div></div>';

    h += '<div class="d-sec"><p class="d-sec-h">钱从哪来，到哪去</p>' + rowsHTML([
      ['收入来源', tags(it.revenue)],
      ['主要成本', tags(it.cost)],
      ['核心指标', tags(it.kpi)]
    ]) + '</div>';

    h += '<div class="d-sec"><p class="d-sec-h">盈利模式</p>' +
      tags(it.models, function (m) {
        var mm = MODEL_BY_ID[m];
        return mm ? { view: 'model', label: mm.name } : null;
      }, 8) + '</div>';

    h += '<div class="d-sec"><p class="d-sec-h">关键岗位</p>' +
      tags(it.roles, function (r) {
        var rr = ROLE_BY_ID[r];
        return rr ? { view: 'role', label: rr.name } : null;
      }, 8) + '</div>';

    h += '<div class="d-sec"><p class="d-sec-h">入行与能力</p>' + rowsHTML([
      ['常见入口', tags(it.entry)],
      ['核心技能', tags(it.skills)],
      ['代表机构', tags(it.cases)]
    ]) + '</div>';

    h += '<div class="d-sec"><p class="d-sec-h">风险与趋势</p>' + rowsHTML([
      ['主要风险', tags(it.risk)],
      ['演进趋势', tags(it.trend)]
    ]) + '</div>';

    if (it.live) {
      h += '<div class="d-sec"><p class="d-sec-h">当期实况</p>' +
        '<div class="d-live" style="--c:' + c + '">' +
        '<span class="d-live-tag">' + esc(MACRO.asOf) + ' 时点</span><br>' + esc(it.live) + '</div></div>';
    }

    return h;
  }

  function metricHTML(k, v, unit) {
    return '<div class="d-metric"><div class="d-metric-k">' + esc(k) + '</div>' +
      '<div class="d-metric-v">' + v + '<small>' + unit + '</small></div></div>';
  }

  function roleHTML(id) {
    var it = ROLE_BY_ID[id];
    var c = FAMILY_COLOR[it.family];
    var fam = ROLE_FAMILIES.filter(function (f) { return f.id === it.family; })[0];
    var h = '';
    h += '<div class="d-hero" style="--c:' + c + '">';
    h += '<div class="d-kicker">' + esc(fam ? fam.name : '') + '</div>';
    h += '<h2 class="d-title" id="d-title">' + esc(it.name) + '</h2>';
    h += '<p class="d-sub">入门门槛：' + esc(it.barrier) + ' · 自由职业适配度：' + esc(it.freelance) + '</p>';
    h += '</div>';

    if (it.plain) {
      h += '<div class="d-plain"><div class="d-plain-h">这个岗位每天在干什么</div>' + esc(it.plain) + '</div>';
    }
    h += '<p class="d-lead">' + esc(it.core) + '</p>';

    if (it.reality) {
      h += '<div class="d-sec"><p class="d-sec-h">这份工作的真实状态</p>' +
        '<div class="d-plain" style="margin-top:0">' + esc(it.reality) + '</div></div>';
    }

    h += '<div class="d-sec"><p class="d-sec-h">薪酬带宽（一线城市，万元/年）</p><div class="d-pay" style="--c:' + c + '">' +
      payRow('入门', it.pay.entry) + payRow('成熟', it.pay.mid) + payRow('资深', it.pay.senior) +
      '</div></div>';

    h += '<div class="d-sec"><p class="d-sec-h">能力与工具</p>' + rowsHTML([
      ['核心技能', tags(it.skills)],
      ['常用工具', tags(it.tools)],
      ['考核指标', tags(it.kpi)],
      ['相关证书', tags(it.certs)]
    ]) + '</div>';

    h += '<div class="d-sec"><p class="d-sec-h">发展路径</p><div class="d-chain">' +
      it.path.map(function (s, i) {
        return (i ? '<span class="chain-arrow">→</span>' : '') + '<span class="chain-step">' + esc(s) + '</span>';
      }).join('') + '</div></div>';

    h += '<div class="d-sec"><p class="d-sec-h">AI 影响判断</p><div class="d-callout"><b>对岗位的冲击：</b>' + esc(it.ai) + '</div></div>';

    if (it.advice) {
      h += '<div class="d-sec"><p class="d-sec-h">最该做的一件事</p>' +
        '<div class="d-plain" style="margin-top:0">' + esc(it.advice) + '</div></div>';
    }

    if (it.industries.length) {
      h += '<div class="d-sec"><p class="d-sec-h">分布行业（' + it.industries.length + '）</p>' +
        tags(it.industries, function (i) {
          var ii = IND_BY_ID[i];
          return ii ? { view: 'industry', label: ii.name } : null;
        }, 12) + '</div>';
    }
    return h;
  }

  function payRow(k, v) {
    var max = 180;
    var left = Math.min(v[0] / max * 100, 100);
    var w = Math.max((v[1] - v[0]) / max * 100, 4);
    return '<div class="pay-row"><span class="pay-k">' + esc(k) + '</span>' +
      '<span class="pay-bar"><span class="pay-fill" style="left:' + left + '%;width:' + w + '%"></span>' +
      '<span class="pay-txt">' + v[0] + ' – ' + v[1] + '</span></span></div>';
  }

  function modelHTML(id) {
    var it = MODEL_BY_ID[id];
    var c = FAMILY_COLOR[it.family];
    var fam = MODEL_FAMILIES.filter(function (f) { return f.id === it.family; })[0];
    var h = '';
    h += '<div class="d-hero" style="--c:' + c + '">';
    h += '<div class="d-kicker">' + esc(fam ? fam.name : '') + '</div>';
    h += '<h2 class="d-title" id="d-title">' + esc(it.name) + '</h2>';
    h += '<p class="d-sub" style="font-family:var(--mono);font-size:12px">' + esc(it.formula) + '</p>';
    h += '</div>';

    if (it.plain) {
      h += '<div class="d-plain"><div class="d-plain-h">这个模式怎么赚钱</div>' + esc(it.plain) + '</div>';
    }
    h += '<p class="d-lead">' + esc(it.note) + '</p>';

    if (it.analogy) {
      h += '<div class="d-quote" style="--c:' + c + '"><b>打个比方：</b>' + esc(it.analogy) + '</div>';
    }
    if (it.watch) {
      h += '<div class="d-quote" style="--c:' + c + '"><b>最该盯住：</b>' + esc(it.watch) + '</div>';
    }

    h += '<div class="d-sec"><p class="d-sec-h">怎么赚，怎么亏</p>' + rowsHTML([
      ['毛利空间', esc(it.margin)],
      ['利润杠杆', esc(it.lever)],
      ['失效条件', esc(it.fail)],
      ['典型风险', tags(it.risk)],
      ['代表案例', tags(it.cases)]
    ]) + '</div>';

    if (MODEL_TREND[it.id]) {
      h += '<div class="d-sec"><p class="d-sec-h">' + esc(MACRO.asOf) + ' 新变化</p>' +
        '<div class="d-live" style="--c:' + c + '">' +
        '<span class="d-live-tag">本期观察</span><br>' + esc(MODEL_TREND[it.id]) + '</div></div>';
    }

    if (it.industries.length) {
      h += '<div class="d-sec"><p class="d-sec-h">适用行业（' + it.industries.length + '）</p>' +
        tags(it.industries, function (i) {
          var ii = IND_BY_ID[i];
          return ii ? { view: 'industry', label: ii.name } : null;
        }, 14) + '</div>';
    } else {
      h += '<div class="d-sec"><p class="d-sec-h">适用行业</p><div class="d-callout">跨行业通用模式，几乎所有行业都能找到它的影子。</div></div>';
    }
    return h;
  }

  // ── 总渲染 ──
  function render() {
    renderFilters();
    renderChips();
    renderGrid();
    document.querySelectorAll('.tab').forEach(function (t) {
      var on = t.getAttribute('data-view') === state.view;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  // ── 事件 ──
  document.querySelectorAll('.tab').forEach(function (t) {
    t.onclick = function () {
      state.view = t.getAttribute('data-view');
      state.family = 'all';
      state.sector = 'all';
      state.minGrowth = 0;
      state.onlyHigh = false;
      render();
    };
  });

  var q = document.getElementById('q');
  var timer = null;
  q.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { state.q = q.value.trim(); renderChips(); renderGrid(); }, 90);
  });

  document.getElementById('sort').onchange = function (e) {
    state.sort = e.target.value;
    renderGrid();
  };

  document.getElementById('reset').onclick = function () {
    state.q = ''; q.value = '';
    state.sector = 'all'; state.family = 'all'; state.minGrowth = 0; state.onlyHigh = false;
    render();
  };

  document.querySelectorAll('[data-close]').forEach(function (n) {
    n.onclick = closeDrawer;
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!document.getElementById('sheet').hidden) { closeSheet(); return; }
      if (!document.getElementById('drawer').hidden) closeDrawer();
    }
    if (e.key === '/' && document.activeElement !== q && !/input|textarea|select/i.test(document.activeElement.tagName)) {
      e.preventDefault();
      q.focus();
    }
  });

  // 主题：默认浅色。只有用户主动切换过才跟随存储值。
  // KEY 带版本号：改默认色时旧存储值自动失效，用户不用手动清。
  var themeBtn = document.getElementById('theme');
  var THEME_KEY = 'atlas-theme-v2';
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
  }
  var saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
  // 未主动选择过一律浅色；主动选过深色才用深色
  applyTheme(saved === 'dark' ? 'dark' : 'light');
  themeBtn.onclick = function () {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  };

  // ── 全屏面板：导读 / 术语表 ──
  var sheetLastFocus = null;
  function openSheet(kind) {
    var sheet = document.getElementById('sheet');
    var title = document.getElementById('sheet-title');
    var body = document.getElementById('sheet-body');
    var q = document.getElementById('sheet-q');
    sheetLastFocus = document.activeElement;
    sheet.hidden = false;
    document.body.style.overflow = 'hidden';
    q.hidden = kind !== 'glossary';
    q.value = '';
    title.textContent = kind === 'guide' ? GUIDE.intro.title : '术语表：把行话翻译成大白话';
    body.innerHTML = kind === 'guide' ? guideHTML() : glossaryHTML('');
    body.scrollTop = 0;
    if (kind === 'guide') bindFaq();
    q.oninput = function () { body.innerHTML = glossaryHTML(q.value.trim()); };
    sheet.querySelector('.drawer-x').focus();
  }
  function closeSheet() {
    document.getElementById('sheet').hidden = true;
    document.body.style.overflow = '';
    if (sheetLastFocus && sheetLastFocus.focus) sheetLastFocus.focus();
  }

  function guideHTML() {
    var h = '';
    GUIDE.intro.body.forEach(function (p) {
      // 段首的「行业」「盈利模式」「岗位」加粗
      h += '<p class="g-para">' + esc(p)
        .replace(/行业/g, '<b>行业</b>')
        .replace(/盈利模式/g, '<b>盈利模式</b>')
        .replace(/岗位/g, '<b>岗位</b>') + '</p>';
    });

    h += '<div class="g-sec"><p class="g-sec-h">四步读法</p><div class="g-steps">';
    GUIDE.steps.forEach(function (s) {
      h += '<div class="g-step"><span class="g-step-n">' + esc(s.n) + '</span>' +
        '<div><div class="g-step-t">' + esc(s.t) + '</div>' +
        '<div class="g-step-d">' + esc(s.d) + '</div></div></div>';
    });
    h += '</div></div>';

    h += '<div class="g-sec"><p class="g-sec-h">六个评分怎么看</p><div class="g-metrics">';
    GUIDE.metrics.forEach(function (m) {
      h += '<div class="g-metric"><div class="g-metric-t">' + esc(m.k) + '</div>' +
        '<div class="g-metric-v">' + esc(m.v) + '</div>' +
        '<div class="g-metric-d">' + esc(m.d) + '</div>' +
        '<div class="g-metric-x"><b>分高：</b>' + esc(m.hi) + '<br><b>分低：</b>' + esc(m.lo) + '</div></div>';
    });
    h += '</div></div>';

    h += '<div class="g-sec"><p class="g-sec-h">三个必须先懂的概念</p><div class="g-concepts">';
    GUIDE.concepts.forEach(function (c) {
      h += '<div class="g-concept"><div class="g-concept-t">' + esc(c.t) + '</div>' +
        '<div class="g-concept-d">' + esc(c.d) + '</div></div>';
    });
    h += '</div></div>';

    h += '<div class="g-sec"><p class="g-sec-h">常见困惑</p><div class="g-faq">';
    GUIDE.faq.forEach(function (f, i) {
      h += '<div class="g-faq-item" data-i="' + i + '">' +
        '<button class="g-faq-q">' + esc(f.q) + '</button>' +
        '<div class="g-faq-a">' + esc(f.a) + '</div></div>';
    });
    h += '</div></div>';
    return h;
  }

  function bindFaq() {
    document.querySelectorAll('.g-faq-item').forEach(function (item) {
      item.querySelector('.g-faq-q').onclick = function () {
        item.classList.toggle('is-open');
      };
    });
  }

  var GL_GROUPS = [
    { k: '钱的基础', keys: ['毛利', '净利', '成本收入比', '现金流', '资产', '负债', '杠杆', 'ROE（净资产收益率）', 'IRR（内部收益率）'] },
    { k: '收钱的方式', keys: ['订阅制', '按量计费', '按结果付费', '抽成 / 佣金', '剃刀刀片模式', '预付费', '版税 / 授权费', 'Carry（超额收益分成）', '价差 /  Spread'] },
    { k: '行业与市场', keys: ['价值链', '产业链上下游', '产能过剩', '价格战 / 内卷', '反内卷', '国产替代', '卡脖子', '渗透率', '存量市场', '洗牌 / 出清', '规模化量产', '良率'] },
    { k: '赚钱的底气', keys: ['护城河 / 壁垒', '网络效应', '转换成本', '定价权', '牌照 / 准入', '特许经营', '规模效应', '一站式 / 整体方案'] },
    { k: '资本与投资', keys: ['IPO', '融资轮次', '产业资本 vs 财务资本', 'BD（商务拓展）', 'License-out', '里程碑付款', 'Co-Co 模式', '估值', 'ARR（年度经常性收入）', 'NDR（净收入留存）', 'LTV / CAC'] },
    { k: '岗位与职场', keys: ['FTE（全职当量）', '人效', '降本增效', '可迁移能力', '复合型人才', '蓝领溢价'] },
    { k: '技术与生产', keys: ['制程 / 纳米', 'EUV 光刻机', 'Chiplet / 先进封装', 'Agent（智能体）', 'MCP（模型上下文协议）', 'Token', '推理成本', '具身智能', 'RAG（检索增强生成）', 'ERP / MES / WMS'] },
    { k: '金融专项', keys: ['净息差（NIM）', '不良贷款率', '财富管理', '拨备覆盖率', '两融', '综合成本率', '利差损', '数字人民币'] },
    { k: '政策与合规', keys: ['集采', 'DRG / DIP', '报行合一', '信创', '双碳', 'CCER', 'REITs', 'PPP / 特许经营'] }
  ];

  function glossaryHTML(q) {
    var h = '';
    var total = 0;
    GL_GROUPS.forEach(function (g) {
      var items = GLOSSARY.filter(function (x) {
        return g.keys.indexOf(x.t) !== -1 && (!q || norm(x.t + x.d + (x.eg || '')).indexOf(norm(q)) !== -1);
      });
      if (!items.length) return;
      total += items.length;
      h += '<div class="gl-group"><p class="gl-group-h">' + esc(g.k) + '</p>';
      items.forEach(function (x) {
        h += '<div class="gl-item"><div class="gl-t">' + esc(x.t) + '</div>' +
          '<div class="gl-d">' + esc(x.d) + '</div>' +
          (x.eg ? '<div class="gl-eg"><b>例子：</b>' + esc(x.eg) + '</div>' : '') +
          '</div>';
      });
      h += '</div>';
    });
    if (!total) h = '<div class="empty"><p>没有匹配的术语。</p></div>';
    return h;
  }

  document.querySelectorAll('[data-sheet-close]').forEach(function (n) { n.onclick = closeSheet; });
  document.getElementById('open-guide').onclick = function () { openSheet('guide'); };
  document.getElementById('open-glossary').onclick = function () { openSheet('glossary'); };

  // 统计
  document.getElementById('s-ind').textContent = STATS.industries;
  document.getElementById('s-role').textContent = STATS.roles;
  document.getElementById('s-model').textContent = STATS.models;
  document.getElementById('s-patch').textContent = STATS.patched;
  document.getElementById('s-glossary').textContent = STATS.glossary;
  document.getElementById('s-asof').textContent = MACRO.asOf.replace('-', ' 年 ') + ' 月';

  // 宏观背景
  var macroBox = document.getElementById('macro');
  var MACRO_LABEL = {
    gdp: '增长', consumption: '消费', investment: '投资',
    export: '出口', price: '价格', structure: '结构'
  };
  Object.keys(MACRO_LABEL).forEach(function (k) {
    if (!MACRO[k]) return;
    var d = el('div', 'macro-item');
    d.innerHTML = '<div class="macro-k">' + MACRO_LABEL[k] + '</div><div class="macro-v">' + esc(MACRO[k]) + '</div>';
    macroBox.appendChild(d);
  });

  render();
})();
