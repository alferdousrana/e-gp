/* দরপত্র পাঠশালা — app logic (vanilla JS, no build step) */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const view = $('#view');
  const BN = '০১২৩৪৫৬৭৮৯';
  const bn = n => String(n).replace(/\d/g, d => BN[d]);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = (d = new Date()) => d.toLocaleDateString('en-CA');
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return today(d); };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const KEYS = 'কখগঘ';

  /* ---------- course ---------- */
  const COURSE = window.COURSE;
  COURSE.weeks.sort((a, b) => a.n - b.n);
  const LESSONS = [];
  COURSE.weeks.forEach(w => w.lessons.forEach(l => { l.week = w.n; l.idx = LESSONS.length; LESSONS.push(l); }));
  const byId = id => LESSONS.find(l => l.id === id);
  const GLOSSARY = [];
  LESSONS.forEach(l => l.cards.forEach(c => { if (c.t === 'terms') c.items.forEach(([k, v]) => { if (!GLOSSARY.some(g => g.k === k)) GLOSSARY.push({ k, v, lesson: l.id }); }); }));

  /* ---------- state (local-first; ক্লাউড সিঙ্ক js/sync.js-এ) ---------- */
  const KEY = 'darpotro-pathshala-v1';
  const DEV_KEY = 'darpotro-device-id';
  const DEV = (() => { try { let d = localStorage.getItem(DEV_KEY); if (!d) { d = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); localStorage.setItem(DEV_KEY, d); } return d; } catch (e) { return 'd-local'; } })();
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const fresh = () => ({
    name: '', xp: 0, xpDev: {}, done: {}, streak: { count: 0, last: '' }, best: 0, badges: [], wrong: [],
    sheets: [], deleted: {}, checklist: {}, bid: { rows: {}, notes: {}, title: '' }, daily: '', dailyCount: 0,
    perfect: 0, fixed: 0, known: [], matchBest: null, finalScore: null, finalDate: '', log: {},
    track: { role: '', tasks: {} }, labs: [],
    stats: { lab: 0, labBest: 0, convo: {}, seqWins: 0, sprintBest: 0, boqWins: 0, calc: {}, mockBest: null, mockCount: 0 },
    epoch: 0, _u: 0, ver: 2,
    settings: { sound: true, theme: 'auto', unlockAll: false }
  });
  function normalize(o) {
    const f = fresh();
    const S2 = Object.assign(f, o || {}, {
      settings: Object.assign(f.settings, (o && o.settings) || {}),
      stats: Object.assign(f.stats, (o && o.stats) || {}),
      track: Object.assign(f.track, (o && o.track) || {})
    });
    // v1 → v2 মাইগ্রেশন: XP ডিভাইসভিত্তিক কাউন্টারে, শিটে আইডি
    if (!S2.xpDev || !Object.keys(S2.xpDev).length) S2.xpDev = S2.xp ? { [DEV]: S2.xp } : {};
    S2.xp = Object.values(S2.xpDev).reduce((a, b) => a + b, 0);
    S2.sheets = (S2.sheets || []).map(sh => sh.id ? sh : Object.assign({ id: uid(), u: Date.now() }, sh));
    S2.ver = 2;
    return S2;
  }
  let S = load();
  function load() {
    try { const r = localStorage.getItem(KEY); if (r) return normalize(JSON.parse(r)); } catch (e) { /* storage unavailable */ }
    return normalize(null);
  }
  const stable = o => JSON.stringify(o, (k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).sort().reduce((r, x) => (r[x] = v[x], r), {}) : v);
  const same = (a, b) => stable(a) === stable(b);
  const listeners = { save: [], remote: [] };
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
  function save() { S._u = Date.now(); persist(); listeners.save.forEach(f => { try { f(S); } catch (e) { } }); }

  /* ---------- levels & badges ---------- */
  const LEVELS = [
    [0, 'নবিশ দরদাতা'], [150, 'কৌতূহলী শিক্ষার্থী'], [400, 'পোর্টাল চালক'], [800, 'দলিল পাঠক'],
    [1300, 'বিড প্রস্তুতকারী'], [1900, 'সাবমিশন বিশেষজ্ঞ'], [2600, 'টেন্ডার কনসালট্যান্ট'], [3400, 'e-GP প্রো']
  ];
  function levelOf(xp) {
    let i = 0; while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++;
    const cur = LEVELS[i][0], next = LEVELS[i + 1] ? LEVELS[i + 1][0] : null;
    return { i, name: LEVELS[i][1], cur, next, pct: next ? Math.round((xp - cur) / (next - cur) * 100) : 100 };
  }
  const doneCount = () => Object.keys(S.done).length;
  const weekDone = n => { const w = COURSE.weeks.find(x => x.n === n); return w && w.lessons.every(l => S.done[l.id]); };
  const BADGES = [
    { id: 'first', i: '📂', n: 'প্রথম ফাইল', d: 'প্রথম পাঠ শেষ', t: () => doneCount() >= 1 },
    { id: 'w1', i: '🧱', n: 'ভিত মজবুত', d: 'সপ্তাহ ১ শেষ', t: () => weekDone(1) },
    { id: 'w2', i: '🖥️', n: 'পোর্টাল চালক', d: 'সপ্তাহ ২ শেষ', t: () => weekDone(2) },
    { id: 'w3', i: '🔎', n: 'দলিল গোয়েন্দা', d: 'সপ্তাহ ৩ শেষ', t: () => weekDone(3) },
    { id: 'w4', i: '🧮', n: 'বিড কারিগর', d: 'সপ্তাহ ৪ শেষ', t: () => weekDone(4) },
    { id: 'w5', i: '📤', n: 'নিখুঁত জমা', d: 'সপ্তাহ ৫ শেষ', t: () => weekDone(5) },
    { id: 'w6', i: '💼', n: 'পরামর্শক', d: 'সপ্তাহ ৬ শেষ', t: () => weekDone(6) },
    { id: 'w7', i: '🏗️', n: 'মাঠের খেলোয়াড়', d: 'সপ্তাহ ৭ শেষ', t: () => weekDone(7) },
    { id: 'perfect', i: '🎯', n: 'নির্ভুল', d: 'কোনো পাঠে সব কুইজ সঠিক', t: () => S.perfect >= 1 },
    { id: 'perfect5', i: '💎', n: 'হীরার চোখ', d: '৫টি পাঠে শতভাগ', t: () => S.perfect >= 5 },
    { id: 'streak3', i: '🔥', n: 'টানা ৩ দিন', d: '৩ দিনের ধারা', t: () => S.best >= 3 },
    { id: 'streak7', i: '☄️', n: 'টানা ৭ দিন', d: '৭ দিনের ধারা', t: () => S.best >= 7 },
    { id: 'words', i: '📚', n: 'শব্দ সংগ্রাহক', d: '৩০টি পরিভাষা জানা', t: () => S.known.length >= 30 },
    { id: 'match', i: '⚡', n: 'দ্রুত হাত', d: 'মিলাও খেলা ৪৫ সেকেন্ডে', t: () => S.matchBest !== null && S.matchBest <= 45 },
    { id: 'daily', i: '📅', n: 'নিয়মিত যোদ্ধা', d: '৫টি দৈনিক চ্যালেঞ্জ', t: () => S.dailyCount >= 5 },
    { id: 'sheet', i: '📝', n: 'বিশ্লেষক', d: 'প্রথম Analysis Sheet', t: () => S.sheets.length >= 1 },
    { id: 'fixer', i: '🩹', n: 'ভুল থেকে শিক্ষা', d: 'ভুলের খাতা থেকে ১০টি ঠিক', t: () => (S.fixed || 0) >= 10 },
    { id: 'pro', i: '👑', n: 'e-GP প্রো', d: 'চূড়ান্ত পরীক্ষায় ৭০%+', t: () => S.finalScore !== null && S.finalScore >= 70 },
    { id: 'w8', i: '🏛️', n: 'টেবিলের ওপাশে', d: 'সপ্তাহ ৮ (PE) শেষ', t: () => weekDone(8) },
    { id: 'w9', i: '🚀', n: 'নতুন নিয়মের মাস্টার', d: 'সপ্তাহ ৯ শেষ', t: () => weekDone(9) },
    { id: 'lab1', i: '🔬', n: 'বিজ্ঞপ্তি বিশ্লেষক', d: 'প্রথম বিজ্ঞপ্তি ল্যাব সম্পন্ন', t: () => S.stats.lab >= 1 },
    { id: 'lab10', i: '🧪', n: 'ল্যাবের বিজ্ঞানী', d: '১০টি বিজ্ঞপ্তি বিশ্লেষণ', t: () => S.stats.lab >= 10 },
    { id: 'labfull', i: '🧠', n: 'পুরোপুরি বুঝেছি', d: 'বোঝার পরীক্ষায় ১০০%', t: () => S.stats.labBest >= 100 },
    { id: 'talk', i: '💬', n: 'কথায় পাকা', d: '৩টি কথোপকথনে ৮০%+', t: () => Object.values(S.stats.convo).filter(v => v >= 80).length >= 3 },
    { id: 'seq', i: '🧩', n: 'ধাপের কারিগর', d: 'ধাপ সাজাও খেলায় ৫ জয়', t: () => S.stats.seqWins >= 5 },
    { id: 'sprint', i: '⏱️', n: 'বিদ্যুৎ বিচারক', d: 'বাতিল নাকি টিকবে — ১৫+ স্কোর', t: () => S.stats.sprintBest >= 15 },
    { id: 'boq', i: '🧾', n: 'হিসাবের গোয়েন্দা', d: 'BOQ ভুল ধরো — ৫ জয়', t: () => S.stats.boqWins >= 5 },
    { id: 'mock', i: '📜', n: 'বাস্তব পরীক্ষার্থী', d: 'কেস পরীক্ষায় ৭০%+', t: () => S.stats.mockBest !== null && S.stats.mockBest >= 70 },
    { id: 'tender_pro', i: '🥇', n: 'দরদাতা প্রো', d: 'দরদাতার প্রো পথ ১০০%', t: () => (APP.trackPct ? APP.trackPct('tenderer') : 0) >= 100 },
    { id: 'pe_pro', i: '🎖️', n: 'PE প্রো', d: 'ক্রয়কারীর প্রো পথ ১০০%', t: () => (APP.trackPct ? APP.trackPct('pe') : 0) >= 100 }
  ];
  function checkBadges() {
    BADGES.forEach(b => {
      if (!S.badges.includes(b.id) && b.t()) {
        S.badges.push(b.id); save();
        setTimeout(() => { toast(`${b.i} নতুন ব্যাজ: ${b.n}`); sound('badge'); }, 700);
      }
    });
  }

  /* ---------- XP, streak ---------- */
  function touchStreak() {
    const t = today();
    if (S.streak.last === t) return;
    S.streak.count = S.streak.last === yesterday() ? S.streak.count + 1 : 1;
    S.streak.last = t;
    S.best = Math.max(S.best, S.streak.count);
    if (S.streak.count > 1) toast(`🔥 টানা ${bn(S.streak.count)} দিন! চালিয়ে যাও`);
  }
  function addXP(n, el) {
    if (!n) return;
    const before = levelOf(S.xp).i;
    S.xpDev[DEV] = (S.xpDev[DEV] || 0) + n; S.xp = Object.values(S.xpDev).reduce((a, b) => a + b, 0);
    S.log[today()] = (S.log[today()] || 0) + n;
    touchStreak();
    const after = levelOf(S.xp);
    if (after.i > before) setTimeout(() => { toast(`🎉 নতুন স্তর: ${after.name}`); sound('level'); confetti(); }, 400);
    save(); topbar(); checkBadges();
    floatXP(n, el);
  }
  function floatXP(n, el) {
    const f = document.createElement('div');
    f.className = 'xpfloat'; f.textContent = `+${bn(n)} XP`;
    const r = el ? el.getBoundingClientRect() : { left: innerWidth / 2 - 30, top: innerHeight / 3 };
    f.style.left = (r.left + 10) + 'px'; f.style.top = (r.top) + 'px';
    document.body.appendChild(f); setTimeout(() => f.remove(), 1000);
  }
  function topbar() {
    const streakAlive = S.streak.last === today() || S.streak.last === yesterday();
    $('#tb-streak').textContent = `🔥 ${bn(streakAlive ? S.streak.count : 0)}`;
    $('#tb-xp').textContent = `⭐ ${bn(S.xp)}`;
  }

  /* ---------- sound (Web Audio, no files) ---------- */
  let AC = null;
  function sound(kind) {
    if (!S.settings.sound) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const seq = { ok: [[660, .08], [880, .12]], bad: [[220, .18]], done: [[523, .1], [659, .1], [784, .1], [1047, .25]], level: [[392, .1], [523, .1], [659, .1], [784, .3]], badge: [[880, .08], [1175, .16]], tap: [[500, .03]] }[kind] || [];
      let t = AC.currentTime;
      seq.forEach(([f, d]) => {
        const o = AC.createOscillator(), g = AC.createGain();
        o.type = kind === 'bad' ? 'sawtooth' : 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.18, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + d);
        o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + .02); t += d * .9;
      });
    } catch (e) { /* audio unavailable */ }
  }
  function vibrate(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } }

  /* ---------- confetti ---------- */
  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = $('#confetti'), x = c.getContext('2d');
    c.width = innerWidth; c.height = innerHeight;
    const cs = getComputedStyle(document.documentElement);
    const cols = ['--green', '--gold', '--seal'].map(v => cs.getPropertyValue(v).trim());
    const P = Array.from({ length: 120 }, () => ({ x: c.width / 2, y: c.height / 3, vx: (Math.random() - .5) * 12, vy: Math.random() * -12 - 3, s: 4 + Math.random() * 6, r: Math.random() * 6, c: cols[Math.floor(Math.random() * 3)] }));
    let f = 0;
    (function tick() {
      x.clearRect(0, 0, c.width, c.height);
      P.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; p.r += .1; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); });
      if (++f < 120) requestAnimationFrame(tick); else x.clearRect(0, 0, c.width, c.height);
    })();
  }

  /* ---------- toast & modal ---------- */
  let tT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(tT); tT = setTimeout(() => t.classList.remove('show'), 2600); }
  function modal(html, onMount) {
    const m = $('#modal'); m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`; m.hidden = false;
    m.onclick = e => { if (e.target === m) closeModal(); };
    onMount && onMount(m);
  }
  function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }

  /* ---------- theme ---------- */
  function applyTheme() {
    const t = S.settings.theme;
    if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
  }

  /* ---------- unlocking ---------- */
  // মূল কোর্স সপ্তাহ ১–৭; সপ্তাহ ৮ (PE) ও ৯ (প্রো) — প্রতিটির প্রথম পাঠ সবসময় খোলা
  const CORE_MAX = 7;
  const CORE = () => LESSONS.filter(l => l.week <= CORE_MAX);
  const firstOfWeek = l => { const w = COURSE.weeks.find(x => x.n === l.week); return w && w.lessons[0] === l; };
  const unlocked = l => S.settings.unlockAll || l.idx === 0 || (l.week > CORE_MAX && firstOfWeek(l)) || !!S.done[LESSONS[l.idx - 1].id] || !!S.done[l.id];
  const coreDone = () => CORE().every(l => S.done[l.id]);
  const coreLeft = () => CORE().filter(l => !S.done[l.id]).length;
  const nextLesson = () => LESSONS.find(l => !S.done[l.id] && unlocked(l)) || LESSONS.find(l => !S.done[l.id]);
  const allDone = () => LESSONS.every(l => S.done[l.id]);

  /* ---------- router (v2: মডিউলগুলো APP.page() দিয়ে নিজের পাতা যোগ করে) ---------- */
  const PAGES = {}, TABFOR = {}, IMMERSIVE = new Set(['lesson']);
  function page(name, fn, tab, immersive) { PAGES[name] = fn; if (tab) TABFOR[name] = tab; if (immersive) IMMERSIVE.add(name); }
  let current = 'home';
  function route() {
    const parts = (location.hash.replace(/^#\/?/, '') || 'home').split('/');
    const p = parts[0], a = parts[1], b = parts[2];
    current = PAGES[p] ? p : 'home';
    document.body.classList.toggle('immersive', IMMERSIVE.has(current));
    $$('#tabbar a').forEach(x => x.classList.toggle('active', x.dataset.tab === TABFOR[current]));
    (PAGES[current])(a, b);
    window.scrollTo(0, 0);
    view.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', route);

  /* =========================================================
     HOME — পাঠপথ
     ========================================================= */
  function pHome() {
    const lv = levelOf(S.xp), nx = nextLesson();
    const goal = 50, todayXP = S.log[today()] || 0, gp = Math.min(100, Math.round(todayXP / goal * 100));
    const hello = S.name ? `${esc(S.name)}, স্বাগতম` : 'স্বাগতম';
    let h = `<section class="desk">
      <h1>${hello}</h1>
      <div class="lvl">স্তর ${bn(lv.i + 1)}: ${lv.name}</div>
      <div class="bar"><i style="width:${lv.pct}%"></i></div>
      <div class="meta"><span>${bn(S.xp)} XP</span><span>${lv.next ? `পরের স্তর ${bn(lv.next)} XP-এ` : 'সর্বোচ্চ স্তর'}</span></div>
      <div class="goal"><div class="ring" style="--p:${gp}"><span>${bn(gp)}%</span></div>
        <div><b>আজকের লক্ষ্য: ${bn(goal)} XP</b><div class="small" style="opacity:.9">আজ পেয়েছ ${bn(todayXP)} XP · ${bn(doneCount())}/${bn(LESSONS.length)} পাঠ শেষ</div></div></div>
      ${nx ? `<a class="btn block" href="#/lesson/${nx.id}">${doneCount() ? 'চালিয়ে যাও' : 'প্রথম পাঠ শুরু করো'}: ${esc(nx.title)}</a>`
        : `<a class="btn block" href="#/final">চূড়ান্ত পরীক্ষা দাও</a>`}
    </section>`;
    APP.hooks.homeTop.forEach(f => { h += f(); });
    COURSE.weeks.forEach(w => {
      h += `<section class="week ${weekDone(w.n) ? 'done' : ''}">
        <div class="week-head"><div class="week-num"><small>সপ্তাহ</small><b>${bn(w.n)}</b></div>
        <div><h2>${esc(w.title)}</h2><p>${esc(w.goal)}</p></div></div><div class="thread">`;
      w.lessons.forEach(l => {
        const d = S.done[l.id], u = unlocked(l), cur = nx && nx.id === l.id;
        const cls = d ? 'done' : cur ? 'current' : u ? '' : 'locked';
        const right = d ? `<span class="mini-seal" title="সম্পন্ন">সম্পন্ন</span>` : u ? `<span class="ns">▶️</span>` : `<span class="ns">🔒</span>`;
        const sub = d ? `স্কোর ${bn(Math.round(d.score * 100))}% · আবার পড়তে চাপো` : `${bn(l.min)} মিনিট · ${bn(l.quiz.length)}টি প্রশ্ন`;
        h += u ? `<a class="node ${cls}" href="#/lesson/${l.id}"><div class="nt"><b>${esc(l.title)}</b><span>${sub}</span></div>${right}</a>`
          : `<div class="node ${cls}" aria-disabled="true"><div class="nt"><b>${esc(l.title)}</b><span>আগের পাঠ শেষ করলে খুলবে</span></div>${right}</div>`;
      });
      if (w.n === CORE_MAX) {
        const fu = coreDone() || S.settings.unlockAll;
        h += `<a class="node final ${fu ? '' : 'locked'}" href="${fu ? '#/final' : '#/home'}"><div class="nt"><b>চূড়ান্ত ব্যবহারিক পরীক্ষা</b><span>${S.finalScore !== null ? `সর্বোচ্চ স্কোর ${bn(S.finalScore)}%` : fu ? 'অদেখা দরপত্র বিশ্লেষণ' : 'সপ্তাহ ১–৭ শেষে খুলবে'}</span></div><span class="ns">${fu ? '🏆' : '🔒'}</span></a>`;
      }
      h += `</div></section>`;
    });
    h += `<p class="small muted" style="text-align:center">আইন ও বিধি সময়ের সাথে বদলায়। বাস্তব দরপত্রে সবসময় সংশ্লিষ্ট দরপত্র দলিল, সর্বশেষ PPR ও BPPA-এর পরিপত্র যাচাই করে নাও।</p>`;
    view.innerHTML = h;
    bindInstall();
  }

  /* =========================================================
     LESSON PLAYER
     ========================================================= */
  let P = null;
  function pLesson(id) {
    const l = byId(id);
    if (!l) { location.hash = '#/home'; return; }
    if (!unlocked(l)) { toast('🔒 আগের পাঠ শেষ করো'); location.hash = '#/home'; return; }
    P = { l, step: 0, review: !!S.done[id], correct: 0, earned: 0, total: l.cards.length + l.quiz.length + (l.short ? l.short.length : 0) };
    drawPlayer();
  }
  function phaseOf(step) {
    const l = P.l, c = l.cards.length, q = l.quiz.length, s = l.short ? l.short.length : 0;
    if (step < c) return ['card', step];
    if (step < c + q) return ['quiz', step - c];
    if (step < c + q + s) return ['short', step - c - q];
    return ['result', 0];
  }
  function drawPlayer() {
    const [ph, i] = phaseOf(P.step), l = P.l;
    if (ph === 'result') return drawResult();
    const c = l.cards.length;
    let segs = '';
    for (let k = 0; k < P.total; k++) segs += `<i class="${k >= c ? 'q' : ''} ${k <= P.step ? 'on' : ''}"></i>`;
    let body = '', foot = '';
    if (ph === 'card') {
      body = renderCard(l.cards[i]);
      foot = `<button class="btn block" id="next">${i === c - 1 ? 'এবার পরীক্ষা দাও' : 'পরের ধাপ'}</button>`;
    } else if (ph === 'quiz') {
      const q = l.quiz[i];
      body = `<div class="kicker">প্রশ্ন ${bn(i + 1)}/${bn(l.quiz.length)}</div><div class="q-text">${q.q}</div>
        <div class="opts">${q.o.map((o, k) => `<button class="opt" data-k="${k}"><span class="k">${KEYS[k]}</span><span>${o}</span></button>`).join('')}</div>`;
      foot = `<button class="btn block" id="next" disabled>একটি উত্তর বেছে নাও</button>`;
    } else {
      const s = l.short[i];
      body = `<div class="kicker">সংক্ষিপ্ত প্রশ্ন · নিজের ভাষায় লেখো</div><div class="q-text">${s.q}</div>
        <textarea id="ans" placeholder="এখানে উত্তর লেখো… অন্তত ২–৩ বাক্য"></textarea>
        <p class="small muted">উত্তরে মূল ধারণাগুলো আছে কিনা মিলিয়ে দেখা হবে, তারপর আদর্শ উত্তর দেখাবে।</p>
        <div id="sres"></div>`;
      foot = `<button class="btn block" id="next">উত্তর যাচাই করো</button>`;
    }
    view.innerHTML = `<div class="player">
      <div class="player-top"><button class="x" id="quit" aria-label="পাঠ বন্ধ করো">✕</button><div class="segs">${segs}</div><div class="earned">+${bn(P.earned)}</div></div>
      <div class="stage">${ph === 'card' && i === 0 ? `<div class="kicker">সপ্তাহ ${bn(l.week)} · ${esc(l.title)}${P.review ? ' · পুনরাবৃত্তি' : ''}</div>` : ''}${body}</div>
      <div class="player-foot" id="foot"><div class="inner">${foot}</div></div></div>`;
    $('#quit').onclick = () => { if (P.step === 0 || confirm('পাঠ ছেড়ে যাবে? এই পাঠের অগ্রগতি সংরক্ষণ হবে না।')) location.hash = '#/home'; };
    $$('.reveal-btn').forEach(b => b.onclick = () => { b.parentElement.classList.add('open'); sound('tap'); });
    if (ph === 'card') {
      $('#next').onclick = e => { if (!P.review) { P.earned += 5; addXP(5, e.currentTarget); } P.step++; drawPlayer(); };
    } else if (ph === 'quiz') bindQuiz(l.quiz[i], i);
    else bindShort(l.short[i]);
  }
  function renderCard(c) {
    switch (c.t) {
      case 'ex': return `<div class="card ex"><div class="ex-tag">📍 বাস্তব উদাহরণ</div>${c.h ? `<h2>${c.h}</h2>` : ''}${c.b}</div>`;
      case 'tip': return `<div class="card tip"><div class="ex-tag">💡 প্রো টিপস</div>${c.h ? `<h2>${c.h}</h2>` : ''}${c.b}</div>`;
      case 'warn': return `<div class="card warn"><div class="ex-tag">⚠️ সাবধান</div>${c.h ? `<h2>${c.h}</h2>` : ''}${c.b}</div>`;
      case 'terms': return `<div class="card"><h2>${c.h || 'পরিভাষা'}</h2><dl class="terms">${c.items.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></div>`;
      case 'flow': return `<div class="card"><h2>${c.h}</h2>${c.b || ''}<ol class="flow">${c.steps.map(s => `<li>${s}</li>`).join('')}</ol>${c.after || ''}</div>`;
      case 'think': return `<div class="card"><div class="ex-tag" style="color:var(--green)">🤔 একটু ভাবো</div><h2>${c.q}</h2>${c.b || ''}<div class="reveal"><button class="reveal-btn">ভেবে নিয়েছি, উত্তর দেখাও</button><div class="reveal-body">${c.a}</div></div></div>`;
      default: return `<div class="card">${c.h ? `<h2>${c.h}</h2>` : ''}${c.b}</div>`;
    }
  }
  function bindQuiz(q, qi) {
    const foot = $('#foot');
    $$('.opt').forEach(b => b.onclick = () => {
      const k = +b.dataset.k, ok = k === q.a;
      $$('.opt').forEach(x => { x.disabled = true; if (+x.dataset.k === q.a) x.classList.add('right'); });
      if (!ok) b.classList.add('wrong');
      const key = P.l.id + ':' + qi;
      if (ok) {
        P.correct++; const pts = P.review ? 2 : 10; P.earned += pts; addXP(pts, b); sound('ok'); vibrate(20);
      } else {
        sound('bad'); vibrate([40, 40, 40]);
        if (!S.wrong.includes(key)) { S.wrong.push(key); save(); }
      }
      foot.className = 'player-foot ' + (ok ? 'ok' : 'bad');
      foot.innerHTML = `<div class="inner"><div class="fb">${ok ? pick(['দারুণ! সঠিক', 'একদম ঠিক!', 'চমৎকার!', 'বাহ, ঠিক ধরেছ']) : 'ঠিক হয়নি — শিখে নাও'}</div><div class="fb-ex">${q.e}</div><button class="btn block" id="next">এগিয়ে যাও</button></div>`;
      $('#next').onclick = () => { P.step++; drawPlayer(); };
      $('.earned').textContent = '+' + bn(P.earned);
    });
  }
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function gradeShort(text, s) {
    const t = text.toLowerCase().replace(/\s+/g, ' ');
    const hits = s.k.map(group => group.some(w => t.includes(w.toLowerCase())));
    return { hits, n: hits.filter(Boolean).length };
  }
  function bindShort(s) {
    let checked = false;
    $('#next').onclick = e => {
      if (checked) { P.step++; drawPlayer(); return; }
      const txt = $('#ans').value.trim();
      if (txt.length < 15) { toast('আরেকটু বিস্তারিত লেখো — অন্তত এক-দুই বাক্য'); return; }
      checked = true;
      const g = gradeShort(txt, s), need = s.p || Math.ceil(s.k.length * .6);
      const ratio = g.n / s.k.length;
      const pts = P.review ? 3 : Math.max(4, Math.round(20 * ratio));
      P.earned += pts; addXP(pts, e.currentTarget);
      if (g.n >= need) { P.correct++; sound('ok'); } else sound('tap');
      $('#ans').readOnly = true;
      $('#sres').innerHTML = `<div class="concepts">${s.k.map((grp, i) => `<span class="chip ${g.hits[i] ? 'ok' : ''}">${g.hits[i] ? '✓' : '○'} ${grp[0]}</span>`).join('')}</div>
        <div class="model"><b>আদর্শ উত্তর:</b><br>${s.m}</div>`;
      const foot = $('#foot');
      foot.className = 'player-foot ' + (g.n >= need ? 'ok' : 'bad');
      foot.innerHTML = `<div class="inner"><div class="fb">${g.n >= need ? `ভালো উত্তর! ${bn(s.k.length)}টির মধ্যে ${bn(g.n)}টি মূল ধারণা এসেছে` : `${bn(s.k.length)}টির মধ্যে ${bn(g.n)}টি ধারণা এসেছে — আদর্শ উত্তরটা মিলিয়ে নাও`}</div><button class="btn block" id="next">এগিয়ে যাও</button></div>`;
      $('#next').onclick = () => { P.step++; drawPlayer(); };
      $('.earned').textContent = '+' + bn(P.earned);
      $('#sres').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  }
  function drawResult() {
    const l = P.l, totalQ = l.quiz.length + (l.short ? l.short.length : 0);
    const score = totalQ ? P.correct / totalQ : 1;
    const bonus = P.review ? 10 : 50 + (score === 1 ? 25 : 0);
    const first = !S.done[l.id];
    const prevBest = S.done[l.id] ? S.done[l.id].score : 0;
    S.done[l.id] = { score: Math.max(score, prevBest), date: today() };
    if (score === 1 && (first || prevBest < 1)) S.perfect++;
    save();
    P.earned += bonus;
    const nx = LESSONS[l.idx + 1];
    view.innerHTML = `<div class="player"><div class="result">
      <div class="stamp" role="img" aria-label="পাঠ সম্পন্ন"><div><b>সম্পন্ন</b><small>সপ্তাহ ${bn(l.week)} · পাঠ ${bn(l.idx + 1)}</small></div></div>
      <h1>${score === 1 ? 'শতভাগ নির্ভুল!' : score >= .7 ? 'দারুণ কাজ!' : 'পাঠ শেষ — আরেকবার ঝালাই করলে আরও পাকা হবে'}</h1>
      <p class="muted">${esc(l.title)}</p>
      <div class="tally"><div><b>${bn(P.correct)}/${bn(totalQ)}</b><span>সঠিক</span></div><div><b>+${bn(P.earned)}</b><span>XP</span></div><div><b>🔥${bn(S.streak.count)}</b><span>টানা দিন</span></div></div>
      ${score === 1 && !P.review ? `<p class="chip gold">🎯 নির্ভুল বোনাস +২৫ XP</p>` : ''}
      ${l.takeaway ? `<div class="panel" style="text-align:left"><b>আজকের মূল কথা</b><p style="margin:.4em 0 0">${l.takeaway}</p></div>` : ''}
      </div>
      <div class="player-foot"><div class="inner stack">
        ${l.week === CORE_MAX && coreDone() && (S.finalScore === null || S.finalScore < 70) ? `<a class="btn block gold" href="#/final">চূড়ান্ত পরীক্ষায় যাও</a>` : ''}
        ${nx ? `<a class="btn ${l.week === CORE_MAX && coreDone() ? 'ghost' : ''} block" href="#/lesson/${nx.id}">পরের পাঠ: ${esc(nx.title)}</a>` : `<a class="btn block gold" href="#/path">প্রো পথে যাও</a>`}
        <a class="btn ghost block" href="#/home">পাঠপথে ফিরে যাও</a></div></div></div>`;
    addXP(bonus);
    sound('done'); vibrate([30, 60, 30]); confetti();
  }

  /* =========================================================
     PRACTICE
     ========================================================= */
  function pPractice() {
    const dailyDone = S.daily === today();
    view.innerHTML = `<h1>অনুশীলন</h1><p class="muted">যা শিখেছ, খেলার ছলে পাকা করো।</p>
      <div class="tiles">
        <a class="tile wide feature" href="#/daily"><span class="ic">📅</span><div><b>দৈনিক চ্যালেঞ্জ</b><br><span>${dailyDone ? 'আজকেরটা শেষ! কাল আবার এসো' : 'শেখা পাঠ থেকে ৫টি প্রশ্ন · বোনাস +৩০ XP'}</span></div></a>
        <a class="tile" href="#/flash"><span class="ic">🃏</span><b>ফ্ল্যাশকার্ড</b><span>${bn(GLOSSARY.length)}টি পরিভাষা · জানা ${bn(S.known.length)}টি</span></a>
        <a class="tile" href="#/match"><span class="ic">⚡</span><b>মিলাও খেলা</b><span>পরিভাষা আর অর্থ মিলাও, সময়ের সাথে পাল্লা${S.matchBest ? ` · সেরা ${bn(S.matchBest)} সে.` : ''}</span></a>
        <a class="tile" href="#/wrong"><span class="ic">🩹</span><b>ভুলের খাতা</b><span>${S.wrong.length ? `${bn(S.wrong.length)}টি প্রশ্ন আবার চেষ্টা করো` : 'এখন খালি — দারুণ!'}</span></a>
        <a class="tile" href="#/glossary"><span class="ic">📖</span><b>পরিভাষা অভিধান</b><span>যেকোনো শব্দ খুঁজে নাও</span></a>
        ${APP.hooks.practiceTiles.map(f => f()).join('')}
      </div>`;
  }

  // reusable single-question runner for daily / wrong-book
  function runQuestions(list, opts) {
    let i = 0, right = 0;
    function draw() {
      if (i >= list.length) return opts.end(right, list.length);
      const { q, l } = list[i];
      view.innerHTML = `<a class="back" href="#/practice">← অনুশীলন</a><h2>${opts.title}</h2>
        <div class="kicker">${bn(i + 1)}/${bn(list.length)} · ${esc(l.title)}</div>
        <div class="panel"><div class="q-text">${q.q}</div><div class="opts">${q.o.map((o, k) => `<button class="opt" data-k="${k}"><span class="k">${KEYS[k]}</span><span>${o}</span></button>`).join('')}</div>
        <div id="fx"></div></div>`;
      $$('.opt').forEach(b => b.onclick = () => {
        const k = +b.dataset.k, ok = k === q.a;
        $$('.opt').forEach(x => { x.disabled = true; if (+x.dataset.k === q.a) x.classList.add('right'); });
        if (!ok) b.classList.add('wrong');
        if (ok) { right++; sound('ok'); } else sound('bad');
        opts.each && opts.each(list[i], ok, b);
        $('#fx').innerHTML = `<div class="model" style="margin-top:14px"><b>${ok ? '✓ সঠিক' : '✗ ভুল'}</b> — ${q.e}</div><button class="btn block" style="margin-top:12px" id="nq">পরেরটা</button>`;
        $('#nq').onclick = () => { i++; draw(); };
      });
    }
    draw();
  }
  function seededPick(arr, n, seed) {
    let s = 0; for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, n);
  }
  function pDaily() {
    let pool = [];
    LESSONS.filter(l => S.done[l.id]).forEach(l => l.quiz.forEach((q, qi) => pool.push({ q, l, qi })));
    if (pool.length < 5) LESSONS.slice(0, 2).forEach(l => l.quiz.forEach((q, qi) => pool.push({ q, l, qi })));
    const list = seededPick(pool, 5, today());
    const already = S.daily === today();
    runQuestions(list, {
      title: 'দৈনিক চ্যালেঞ্জ',
      each: (it, ok, el) => { if (ok && !already) addXP(4, el); },
      end: (r, n) => {
        if (!already) { S.daily = today(); S.dailyCount++; save(); addXP(30); confetti(); sound('done'); checkBadges(); }
        view.innerHTML = `<div class="result"><div class="stamp"><div><b>${bn(r)}/${bn(n)}</b><small>দৈনিক চ্যালেঞ্জ</small></div></div>
          <h1>${already ? 'অনুশীলন শেষ' : 'আজকের চ্যালেঞ্জ শেষ!'}</h1><p class="muted">${already ? 'আজকের বোনাস আগেই নেওয়া হয়েছে।' : 'বোনাস +৩০ XP যোগ হয়েছে। কাল নতুন প্রশ্ন আসবে।'}</p>
          <a class="btn block" href="#/practice">অনুশীলনে ফিরে যাও</a></div>`;
      }
    });
  }
  function pWrong() {
    if (!S.wrong.length) { view.innerHTML = `<a class="back" href="#/practice">← অনুশীলন</a><h1>ভুলের খাতা</h1><div class="panel empty">🎉 কোনো ভুল জমা নেই। পাঠে কোনো প্রশ্ন ভুল হলে সেটা এখানে আসবে, যাতে আবার চেষ্টা করতে পারো।</div>`; return; }
    const list = S.wrong.map(k => { const [id, qi] = k.split(':'); const l = byId(id); return l && l.quiz[+qi] ? { q: l.quiz[+qi], l, key: k } : null; }).filter(Boolean);
    runQuestions(shuffle(list), {
      title: 'ভুলের খাতা',
      each: (it, ok, el) => { if (ok) { S.wrong = S.wrong.filter(k => k !== it.key); S.fixed = (S.fixed || 0) + 1; save(); addXP(5, el); } },
      end: (r, n) => {
        view.innerHTML = `<div class="result"><div class="stamp"><div><b>${bn(r)}/${bn(n)}</b><small>সংশোধিত</small></div></div>
          <h1>${S.wrong.length ? `এখনো বাকি ${bn(S.wrong.length)}টি` : 'খাতা পরিষ্কার!'}</h1><p class="muted">ঠিক করা প্রশ্ন খাতা থেকে মুছে গেছে।</p>
          <a class="btn block" href="#/practice">অনুশীলনে ফিরে যাও</a></div>`;
        checkBadges();
      }
    });
  }
  function pFlash() {
    let deck = shuffle(GLOSSARY), i = 0;
    function draw() {
      const g = deck[i], known = S.known.includes(g.k);
      view.innerHTML = `<a class="back" href="#/practice">← অনুশীলন</a><h2>ফ্ল্যাশকার্ড</h2>
        <div class="kicker">${bn(i + 1)}/${bn(deck.length)} · কার্ডে চাপ দিলে উল্টে যাবে ${known ? '· <span class="chip ok">জানা</span>' : ''}</div>
        <div class="flash" id="fc"><div class="flash-in"><div class="flash-face"><div class="term">${g.k}</div><p class="muted small" style="margin-top:12px">অর্থটা মনে মনে বলো, তারপর উল্টাও</p></div><div class="flash-face back">${g.v}</div></div></div>
        <div class="row"><button class="btn ghost grow" id="again">আবার দেখব</button><button class="btn grow" id="know">জানি ✓</button></div>
        <div class="row" style="margin-top:10px;justify-content:space-between"><button class="btn ghost" id="prev" ${i ? '' : 'disabled'}>← আগের</button><button class="btn ghost" id="skip">পরের →</button></div>`;
      $('#fc').onclick = () => { $('#fc').classList.toggle('flip'); sound('tap'); };
      $('#know').onclick = e => { if (!S.known.includes(g.k)) { S.known.push(g.k); save(); addXP(2, e.currentTarget); } nextC(); };
      $('#again').onclick = () => { S.known = S.known.filter(k => k !== g.k); save(); deck.push(g); nextC(); };
      $('#skip').onclick = nextC;
      $('#prev').onclick = () => { i = Math.max(0, i - 1); draw(); };
    }
    function nextC() { i++; if (i >= deck.length) { toast('🃏 সব কার্ড দেখা শেষ! আবার শাফল করা হলো'); deck = shuffle(GLOSSARY); i = 0; } draw(); }
    draw();
  }
  function pMatch() {
    const set = shuffle(GLOSSARY).slice(0, 5);
    const left = shuffle(set.map((g, i) => ({ i, t: g.k }))), right = shuffle(set.map((g, i) => ({ i, t: g.v.replace(/<[^>]+>/g, '').slice(0, 90) + (g.v.length > 90 ? '…' : '') })));
    let sel = null, matched = 0, t0 = Date.now(), timer;
    view.innerHTML = `<a class="back" href="#/practice">← অনুশীলন</a><h2>মিলাও খেলা</h2>
      <div class="row" style="justify-content:space-between;margin-bottom:10px"><span class="muted small">বাঁয়ে পরিভাষা, ডানে অর্থ — জোড়া মিলাও</span><span class="pill" id="clock">⏱ ০ সে.</span></div>
      <div class="match">${left.map((x, k) => `<button class="mcell term" data-side="L" data-i="${x.i}" style="grid-column:1;grid-row:${k + 1}">${x.t}</button>`).join('')}
      ${right.map((x, k) => `<button class="mcell" data-side="R" data-i="${x.i}" style="grid-column:2;grid-row:${k + 1}">${esc(x.t)}</button>`).join('')}</div>`;
    timer = setInterval(() => { const c = $('#clock'); if (!c) return clearInterval(timer); c.textContent = `⏱ ${bn(Math.round((Date.now() - t0) / 1000))} সে.`; }, 500);
    $$('.mcell').forEach(b => b.onclick = () => {
      if (!sel || sel.dataset.side === b.dataset.side) { $$('.mcell.sel').forEach(x => x.classList.remove('sel')); sel = b; b.classList.add('sel'); sound('tap'); return; }
      if (sel.dataset.i === b.dataset.i) {
        [sel, b].forEach(x => { x.classList.remove('sel'); x.classList.add('gone'); }); sound('ok'); matched++; sel = null;
        if (matched === set.length) {
          clearInterval(timer);
          const secs = Math.round((Date.now() - t0) / 1000);
          const best = S.matchBest === null || secs < S.matchBest;
          if (best) S.matchBest = secs; save(); addXP(10); checkBadges(); confetti(); sound('done');
          view.insertAdjacentHTML('beforeend', `<div class="panel" style="text-align:center;margin-top:14px"><h2>${bn(secs)} সেকেন্ডে শেষ!</h2><p class="muted">${best ? '🏆 নতুন ব্যক্তিগত রেকর্ড' : `সেরা: ${bn(S.matchBest)} সেকেন্ড`} · +১০ XP</p><button class="btn block" id="again">আবার খেলো</button></div>`);
          $('#again').onclick = pMatch;
        }
      } else { b.classList.add('wrong'); sel.classList.add('wrong'); sound('bad'); const a = sel; setTimeout(() => { a.classList.remove('wrong', 'sel'); b.classList.remove('wrong'); }, 400); sel = null; }
    });
  }
  function pGlossary() {
    view.innerHTML = `<a class="back" href="#/practice">← অনুশীলন</a><h1>পরিভাষা অভিধান</h1>
      <input class="searchbox" id="q" type="search" placeholder="খোঁজো: TDS, Tender Security, যোগ্যতা…" aria-label="পরিভাষা খোঁজো"><div id="gl"></div>`;
    const draw = q => {
      q = (q || '').toLowerCase();
      const items = GLOSSARY.filter(g => !q || g.k.toLowerCase().includes(q) || g.v.toLowerCase().includes(q)).sort((a, b) => a.k.localeCompare(b.k));
      $('#gl').innerHTML = items.length ? `<div class="panel"><dl class="terms" style="margin:0">${items.map(g => `<dt>${g.k}</dt><dd>${g.v} <a class="small" href="#/lesson/${g.lesson}">পাঠে যাও</a></dd>`).join('')}</dl></div>` : `<div class="panel empty">“${esc(q)}” পাওয়া যায়নি। অন্য বানানে খুঁজে দেখো।</div>`;
    };
    $('#q').oninput = e => draw(e.target.value); draw('');
  }

  /* =========================================================
     TOOLS
     ========================================================= */
  function pTools() {
    view.innerHTML = `<h1>টুলস</h1><p class="muted">বাস্তব দরপত্রে কাজে লাগানোর জন্য — শেখা শেষেও কাজে আসবে।</p>
      <div class="tiles">
        <a class="tile wide" href="#/sheet"><span class="ic">📝</span><div><b>Tender Analysis Sheet</b><br><span>যেকোনো দরপত্রের মূল তথ্য এক পাতায় সাজাও ও সংরক্ষণ করো · ${bn(S.sheets.length)}টি সংরক্ষিত</span></div></a>
        <a class="tile wide" href="#/bid"><span class="ic">⚖️</span><div><b>Bid / No-Bid বিশ্লেষক</b><br><span>অংশ নেবে কি নেবে না — ৯টি বিষয়ে যাচাই করে সুপারিশ</span></div></a>
        <a class="tile wide" href="#/checklist"><span class="ic">✅</span><div><b>সাবমিশন চেকলিস্ট</b><br><span>জমা দেওয়ার আগে শেষ মুহূর্তের বাতিল-প্রতিরোধ তালিকা</span></div></a>
        ${APP.hooks.toolsTiles.map(f => f()).join('')}
        <a class="tile wide feature" href="#/final"><span class="ic">🏆</span><div><b>চূড়ান্ত ব্যবহারিক পরীক্ষা</b><br><span>${coreDone() || S.settings.unlockAll ? 'অদেখা দরপত্রের পূর্ণ বিশ্লেষণ' : `সপ্তাহ ১–৭ শেষে খুলবে · বাকি ${bn(coreLeft())}টি`}</span></div></a>
      </div>`;
  }

  const SHEET_FIELDS = [
    ['title', 'দরপত্রের নাম / প্যাকেজ বিবরণ', 'text', 'যেমন: অফিস অটোমেশন সফটওয়্যার উন্নয়ন'],
    ['tid', 'Tender ID', 'text', 'e-GP-তে দেওয়া নম্বর'],
    ['pkg', 'Package No.', 'text', ''],
    ['pe', 'Procuring Entity (PE)', 'text', 'কোন দপ্তর কিনছে'],
    ['cat', 'ক্রয়ের ধরন', 'select', ['পণ্য (Goods)', 'কার্য (Works)', 'ভৌত সেবা (Physical Services)', 'বুদ্ধিবৃত্তিক ও পেশাগত সেবা (Consultancy)']],
    ['method', 'ক্রয় পদ্ধতি', 'text', 'OTM / LTM / RFQM / QCBS ইত্যাদি'],
    ['what', 'কী কিনছে? (সংক্ষেপে)', 'area', 'পরিমাণ, প্রধান স্পেসিফিকেশন, ডেলিভারি স্থান'],
    ['close', 'Closing (জমার শেষ সময়)', 'datetime-local', ''],
    ['open', 'Opening (খোলার সময়)', 'datetime-local', ''],
    ['fee', 'দরপত্র দলিলের মূল্য', 'text', ''],
    ['sec', 'Tender Security (পরিমাণ, ধরন, মেয়াদ)', 'text', ''],
    ['validity', 'Tender Validity', 'text', 'যেমন: ৯০ দিন'],
    ['elig', 'Eligibility (কারা অংশ নিতে পারবে)', 'area', 'ট্রেড লাইসেন্স, TIN, VAT, নিবন্ধন…'],
    ['exp', 'অভিজ্ঞতা (সাধারণ ও নির্দিষ্ট)', 'area', ''],
    ['fin', 'আর্থিক সক্ষমতা', 'area', 'Turnover, Liquid Asset, Line of Credit'],
    ['tech', 'কারিগরি সক্ষমতা / জনবল / যন্ত্রপাতি', 'area', ''],
    ['docs', 'প্রয়োজনীয় দলিলের তালিকা', 'area', ''],
    ['eval', 'মূল্যায়ন পদ্ধতি', 'text', 'Lowest evaluated responsive / QCBS ইত্যাদি'],
    ['risk', 'প্রধান ঝুঁকি ও প্রশ্ন', 'area', 'কোন বিষয়ে Clarification চাইতে হবে'],
    ['decision', 'সিদ্ধান্ত', 'select', ['এখনো ঠিক হয়নি', 'অংশ নেব (Proceed)', 'সতর্কতার সাথে অংশ নেব', 'অংশ নেব না (Don\'t Proceed)']]
  ];
  function pSheet(id) {
    if (id === undefined) {
      view.innerHTML = `<a class="back" href="#/tools">← টুলস</a><h1>Tender Analysis Sheet</h1>
        <p class="muted">৫০–১০০ পাতার দলিল থেকে যা দরকার, শুধু তা-ই এক জায়গায়। প্রতিটি দরপত্রের জন্য একটি করে শিট বানাও।</p>
        <a class="btn block" href="#/sheet/new">নতুন শিট বানাও</a><div style="height:14px"></div>
        ${S.sheets.length ? S.sheets.map((s, i) => `<a class="node" href="#/sheet/${i}"><div class="nt"><b>${esc(s.title || 'নামহীন শিট')}</b><span>${esc(s.pe || '')} ${s.close ? '· শেষ সময় ' + esc(s.close.replace('T', ' ')) : ''}</span></div><span class="chip">${esc((s.decision || '').split(' (')[0] || '—')}</span></a>`).join('') : '<div class="panel empty">এখনো কোনো শিট নেই। ই-জিপি থেকে যেকোনো একটা IT দরপত্র নিয়ে প্রথম শিট বানিয়ে ফেলো!</div>'}`;
      return;
    }
    const isNew = id === 'new', idx = isNew ? -1 : +id, data = isNew ? (APP.sheetDraft || {}) : (S.sheets[idx] || {});
    APP.sheetDraft = null;
    view.innerHTML = `<a class="back" href="#/sheet">← সব শিট</a><h1>${isNew ? 'নতুন শিট' : 'শিট সম্পাদনা'}</h1>
      <div class="panel" id="sf">${SHEET_FIELDS.map(([k, label, type, ph]) => `<div class="field"><label for="f-${k}">${label}</label>${type === 'area' ? `<textarea id="f-${k}" placeholder="${esc(ph)}">${esc(data[k] || '')}</textarea>`
      : type === 'select' ? `<select id="f-${k}">${ph.map(o => `<option ${data[k] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`
        : `<input id="f-${k}" type="${type}" placeholder="${esc(ph)}" value="${esc(data[k] || '')}">`}</div>`).join('')}</div>
      <div class="stack no-print"><button class="btn block" id="sv">শিট সংরক্ষণ করো</button>
      <div class="row"><button class="btn ghost grow" id="cp">টেক্সট কপি করো</button><button class="btn ghost grow" id="pr">প্রিন্ট / PDF</button></div>
      ${isNew ? '' : '<button class="btn danger block" id="dl">শিট মুছে ফেলো</button>'}</div>`;
    const collect = () => { const o = {}; SHEET_FIELDS.forEach(([k]) => o[k] = $('#f-' + k).value.trim()); return o; };
    $('#sv').onclick = e => {
      const o = collect(); o.saved = today(); o.u = Date.now();
      if (isNew) { o.id = uid(); S.sheets.unshift(o); addXP(15, e.currentTarget); } else { o.id = S.sheets[idx].id || uid(); S.sheets[idx] = o; }
      save(); checkBadges(); toast('📝 শিট সংরক্ষণ হয়েছে'); location.hash = '#/sheet';
    };
    $('#cp').onclick = () => {
      const o = collect();
      const txt = 'TENDER ANALYSIS SHEET\n' + SHEET_FIELDS.map(([k, l]) => `${l}: ${o[k] || '-'}`).join('\n');
      copy(txt);
    };
    $('#pr').onclick = () => window.print();
    if (!isNew) $('#dl').onclick = () => { if (confirm('এই শিট মুছে ফেলবে?')) { const gone = S.sheets.splice(idx, 1)[0]; if (gone && gone.id) S.deleted[gone.id] = Date.now(); save(); location.hash = '#/sheet'; } };
  }
  function copy(txt) {
    const done = () => toast('📋 কপি হয়েছে — ইমেইল বা নোটে পেস্ট করো');
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, () => fallbackCopy(txt, done)); else fallbackCopy(txt, done);
  }
  function fallbackCopy(txt, done) { const t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('কপি করা যায়নি'); } t.remove(); }

  const BID_ROWS = [
    ['elig', 'Eligibility', 'প্রতিষ্ঠান আইনগতভাবে অংশ নিতে পারবে? নিবন্ধন, লাইসেন্স, ডিবার্ড নয়', true],
    ['exp', 'Experience', 'সাধারণ ও নির্দিষ্ট অভিজ্ঞতার শর্ত পূরণ হয়? প্রমাণপত্র আছে?', true],
    ['fin', 'Financial capacity', 'Turnover, Liquid Asset / Line of Credit শর্ত পূরণ হয়?', true],
    ['tech', 'Technical requirement', 'স্পেসিফিকেশন, জনবল, যন্ত্রপাতি মেলে?', true],
    ['docs', 'Required documents', 'সব দলিল হাতে আছে বা সময়ের মধ্যে জোগাড় সম্ভব?', false],
    ['sec', 'Tender security', 'নির্ধারিত অঙ্ক ও মেয়াদে ব্যাংক থেকে করা যাবে?', true],
    ['time', 'Deadline', 'প্রস্তুতির জন্য যথেষ্ট সময় আছে?', true],
    ['price', 'Price competitiveness', 'বাজারদরে লাভজনক দর দেওয়া সম্ভব?', false],
    ['risk', 'Major risk', 'জরিমানা (LD), পেমেন্ট শর্ত, অস্পষ্ট শর্ত — ঝুঁকি সামলানো যাবে?', false]
  ];
  function pBid() {
    const B = S.bid;
    const draw = () => {
      const vals = BID_ROWS.map(r => B.rows[r[0]] || '');
      const critNo = BID_ROWS.some((r, i) => r[3] && vals[i] === 'no');
      const anyNo = vals.includes('no'), warn = vals.filter(v => v === 'warn').length, filled = vals.filter(Boolean).length;
      let v = { c: 'maybe', t: 'সব বিষয় যাচাই করো, তারপর সুপারিশ দেখাবে' };
      if (filled === BID_ROWS.length) {
        if (critNo) v = { c: 'no', t: "❌ Don't Proceed — অপরিহার্য শর্ত পূরণ হচ্ছে না" };
        else if (anyNo || warn >= 3) v = { c: 'maybe', t: '⚠️ সতর্কতার সাথে — ঝুঁকি কমানোর পরিকল্পনা ছাড়া এগিয়ো না' };
        else v = { c: 'go', t: '✅ Proceed — অংশ নেওয়ার মতো অবস্থা' };
      }
      view.innerHTML = `<a class="back" href="#/tools">← টুলস</a><h1>Bid / No-Bid বিশ্লেষক</h1>
        <p class="muted">ক্লায়েন্ট জিজ্ঞেস করল, “এই টেন্ডারে আমরা পারব?” — প্রতিটি বিষয়ে ✅ পূরণ হয়, ❌ হয় না, ⚠️ ঝুঁকি আছে।</p>
        <div class="field"><label for="bt">দরপত্র / ক্লায়েন্টের নাম</label><input id="bt" type="text" value="${esc(B.title || '')}" placeholder="যেমন: ক-প্রতিষ্ঠানের জন্য সার্ভার সরবরাহ দরপত্র"></div>
        <div class="panel">${BID_ROWS.map(([k, n, d, crit]) => `<div class="bid-row"><div class="row"><div><b>${n}</b>${crit ? ' <span class="chip">অপরিহার্য</span>' : ''}<div class="small muted">${d}</div></div>
          <div class="tri" data-k="${k}">${[['ok', '✅'], ['no', '❌'], ['warn', '⚠️']].map(([val, ic]) => `<button data-v="${val}" class="${B.rows[k] === val ? 'on' : ''}" aria-label="${n}: ${ic}">${ic}</button>`).join('')}</div></div>
          <input type="text" data-note="${k}" value="${esc(B.notes[k] || '')}" placeholder="মন্তব্য / প্রমাণ"></div>`).join('')}</div>
        <div class="verdict ${v.c}">${v.t}</div>
        <div class="row no-print" style="margin-top:12px"><button class="btn grow" id="rep">ক্লায়েন্ট রিপোর্ট কপি করো</button><button class="btn ghost" id="rs">রিসেট</button></div>`;
      $('#bt').onchange = e => { B.title = e.target.value; save(); };
      $$('.tri').forEach(t => t.onclick = e => { const b = e.target.closest('button'); if (!b) return; B.rows[t.dataset.k] = b.dataset.v; save(); sound('tap'); draw(); });
      $$('[data-note]').forEach(i => i.onchange = () => { B.notes[i.dataset.note] = i.value; save(); });
      $('#rs').onclick = () => { if (confirm('সব উত্তর মুছে নতুন করে শুরু করবে?')) { S.bid = { rows: {}, notes: {}, title: '' }; save(); pBid(); } };
      $('#rep').onclick = () => {
        const sym = { ok: '✅', no: '❌', warn: '⚠️' };
        copy(`দরপত্র অংশগ্রহণ সক্ষমতা বিশ্লেষণ\n${B.title || ''}\nতারিখ: ${today()}\n\n` + BID_ROWS.map(([k, n]) => `${n}: ${sym[B.rows[k]] || '—'} ${B.notes[k] || ''}`).join('\n') + `\n\nসুপারিশ: ${v.t}`);
      };
    };
    draw();
  }

  const CHECK = [
    ['জমার অন্তত ৩ দিন আগে', ['দরপত্র দলিল, TDS ও সব Amendment/Corrigendum আবার পড়েছি', 'Clarification-এর উত্তর ও Pre-tender meeting-এর কার্যবিবরণী দেখেছি', 'যোগ্যতার প্রতিটি শর্তের পাশে প্রমাণপত্র মিলিয়েছি', 'Tender Security-র অঙ্ক, ধরন, মেয়াদ ও কার নামে — TDS অনুযায়ী মিলিয়েছি', 'e-GP অ্যাকাউন্ট ও নিবন্ধনের মেয়াদ চালু আছে কিনা দেখেছি']],
    ['দলিল ও ফর্ম', ['সব দলিল স্পষ্ট স্ক্যান, পড়া যায়, নির্ধারিত ফরম্যাটে', 'প্রয়োজনীয় দলিল সঠিক ঘরে map/attach করেছি', 'Tender Submission Letter, Tenderer Information ইত্যাদি সব ফর্ম পূরণ হয়েছে', 'মেয়াদোত্তীর্ণ কোনো সনদ (ট্রেড লাইসেন্স, ট্যাক্স সনদ) নেই', 'অভিজ্ঞতা সনদে কাজের মূল্য, সময় ও প্রকৃতি স্পষ্ট']],
    ['আর্থিক অংশ', ['BOQ/Price Schedule-এর প্রতিটি ঘর পূরণ করেছি, কোনো আইটেম বাদ নেই', 'একক দর × পরিমাণ = মোট — নিজে আবার হিসাব করেছি', 'দর VAT/Tax সহ কিনা TDS অনুযায়ী নিশ্চিত হয়েছি', 'কথায় ও অঙ্কে লেখা দর মিলেছে (যেখানে লাগে)', 'অস্বাভাবিক কম বা বেশি দর নেই']],
    ['জমার দিন', ['Tender Security / দলিল মূল্য পরিশোধ সম্পন্ন ও সিস্টেমে দেখাচ্ছে', 'Final Submission সম্পন্ন — শুধু upload করে থেমে যাইনি', 'Submission receipt / acknowledgement সংরক্ষণ করেছি', 'Closing time-এর অন্তত কয়েক ঘণ্টা আগে জমা দিয়েছি', 'জমার পর ইমেইল/নোটিফিকেশন চেক করেছি']]
  ];
  function pChecklist() {
    const total = CHECK.reduce((a, g) => a + g[1].length, 0);
    const draw = () => {
      const on = Object.values(S.checklist).filter(Boolean).length;
      view.innerHTML = `<a class="back" href="#/tools">← টুলস</a><h1>সাবমিশন চেকলিস্ট</h1>
        <p class="muted">শেষ মুহূর্তে বাতিল হওয়া ঠেকানোর তালিকা। প্রতিটি দরপত্রের আগে রিসেট করে নতুন করে মিলিয়ে নাও।</p>
        <div class="bar" style="margin-bottom:6px"><i style="width:${Math.round(on / total * 100)}%"></i></div><p class="small muted">${bn(on)}/${bn(total)} সম্পন্ন</p>
        ${CHECK.map(([g, items], gi) => `<div class="panel"><h3>${g}</h3><div class="checks">${items.map((it, ii) => { const k = gi + '-' + ii; return `<label class="${S.checklist[k] ? 'on' : ''}"><input type="checkbox" data-k="${k}" ${S.checklist[k] ? 'checked' : ''}><span>${it}</span></label>`; }).join('')}</div></div>`).join('')}
        ${on === total ? '<div class="verdict go">🚀 সব ঠিক আছে — এখন নিশ্চিন্তে জমা দাও!</div>' : ''}
        <button class="btn ghost block no-print" id="rs" style="margin-top:12px">নতুন দরপত্রের জন্য রিসেট করো</button>`;
      $$('.checks input').forEach(c => c.onchange = () => { S.checklist[c.dataset.k] = c.checked; save(); sound('tap'); if (Object.values(S.checklist).filter(Boolean).length === total) { confetti(); sound('done'); } draw(); });
      $('#rs').onclick = () => { S.checklist = {}; save(); draw(); };
    };
    draw();
  }

  /* =========================================================
     FINAL EXAM
     ========================================================= */
  function pFinal() {
    const F = COURSE.final;
    if (!F) { location.hash = '#/home'; return; }
    if (!(coreDone() || S.settings.unlockAll)) {
      view.innerHTML = `<a class="back" href="#/home">← পাঠপথ</a><h1>চূড়ান্ত ব্যবহারিক পরীক্ষা</h1><div class="panel empty">🔒 মূল কোর্সের (সপ্তাহ ১–৭) ${bn(CORE().length)}টি পাঠ শেষ হলে এই পরীক্ষা খুলবে। এখন বাকি ${bn(coreLeft())}টি।</div>`;
      return;
    }
    view.innerHTML = `<a class="back" href="#/home">← পাঠপথ</a><h1>চূড়ান্ত ব্যবহারিক পরীক্ষা</h1>
      <p>নিচের দরপত্র বিজ্ঞপ্তিটি তুমি আগে দেখোনি। মনোযোগ দিয়ে পড়ো, চাইলে Analysis Sheet-এ নোট নাও। তারপর ${bn(F.quiz.length)}টি বহুনির্বাচনি ও ${bn(F.short.length)}টি বিশ্লেষণধর্মী প্রশ্নের উত্তর দাও। ৭০% বা তার বেশি পেলে সনদ ও “e-GP প্রো” ব্যাজ।</p>
      <div class="notice">${F.notice}</div>
      <div style="height:14px"></div><button class="btn block gold" id="go">পরীক্ষা শুরু করো</button>`;
    $('#go').onclick = () => runFinal(F);
  }
  function runFinal(F) {
    let i = 0, pts = 0, max = F.quiz.length + F.short.length * 2;
    const noticeBtn = `<details class="panel"><summary><b>দরপত্র বিজ্ঞপ্তি আবার দেখো</b></summary><div class="notice" style="margin-top:10px">${F.notice}</div></details>`;
    function draw() {
      if (i < F.quiz.length) {
        const q = F.quiz[i];
        view.innerHTML = `<div class="kicker">প্রশ্ন ${bn(i + 1)}/${bn(F.quiz.length + F.short.length)}</div>${noticeBtn}<div class="panel"><div class="q-text">${q.q}</div><div class="opts">${q.o.map((o, k) => `<button class="opt" data-k="${k}"><span class="k">${KEYS[k]}</span><span>${o}</span></button>`).join('')}</div><div id="fx"></div></div>`;
        $$('.opt').forEach(b => b.onclick = () => {
          const ok = +b.dataset.k === q.a;
          $$('.opt').forEach(x => { x.disabled = true; if (+x.dataset.k === q.a) x.classList.add('right'); });
          if (!ok) b.classList.add('wrong'); else pts++;
          sound(ok ? 'ok' : 'bad');
          $('#fx').innerHTML = `<div class="model" style="margin-top:12px">${q.e}</div><button class="btn block" style="margin-top:12px" id="nq">পরেরটা</button>`;
          $('#nq').onclick = () => { i++; draw(); };
        });
      } else if (i < F.quiz.length + F.short.length) {
        const s = F.short[i - F.quiz.length];
        view.innerHTML = `<div class="kicker">প্রশ্ন ${bn(i + 1)}/${bn(F.quiz.length + F.short.length)} · বিশ্লেষণ</div>${noticeBtn}<div class="panel"><div class="q-text">${s.q}</div><textarea id="ans" placeholder="বিশদে লেখো…"></textarea><div id="sres"></div><button class="btn block" style="margin-top:12px" id="ck">উত্তর যাচাই করো</button></div>`;
        let checked = false;
        $('#ck').onclick = () => {
          if (checked) { i++; draw(); return; }
          const txt = $('#ans').value.trim(); if (txt.length < 20) { toast('আরেকটু বিস্তারিত লেখো'); return; }
          checked = true; const g = gradeShort(txt, s); const got = Math.round(g.n / s.k.length * 2 * 10) / 10; pts += got;
          $('#sres').innerHTML = `<div class="concepts">${s.k.map((grp, j) => `<span class="chip ${g.hits[j] ? 'ok' : ''}">${g.hits[j] ? '✓' : '○'} ${grp[0]}</span>`).join('')}</div><div class="model"><b>পরীক্ষকের আদর্শ উত্তর:</b><br>${s.m}</div>`;
          $('#ck').textContent = 'পরেরটা'; $('#ans').readOnly = true;
        };
      } else {
        const pct = Math.round(pts / max * 100);
        const firstPass = pct >= 70 && (S.finalScore === null || S.finalScore < 70);
        S.finalScore = Math.max(S.finalScore ?? 0, pct); if (pct >= 70) S.finalDate = S.finalDate || today(); save();
        addXP(firstPass ? 300 : 20); checkBadges(); confetti(); sound('done');
        view.innerHTML = `<div class="result"><div class="stamp"><div><b>${bn(pct)}%</b><small>চূড়ান্ত পরীক্ষা</small></div></div>
          <h1>${pct >= 70 ? 'অভিনন্দন! তুমি এখন e-GP প্রো' : 'প্রায় পৌঁছে গেছ'}</h1>
          <p class="muted">${pct >= 70 ? 'তোমার বিশ্লেষণ পেশাদার মানের। সনদ সংগ্রহ করো, আর বাস্তব দরপত্রে নামো।' : '৭০% লাগবে। দুর্বল জায়গাগুলো ঝালাই করে আবার চেষ্টা করো — ভুলের খাতা কাজে দেবে।'}</p>
          <div class="stack">${pct >= 70 ? '<a class="btn block gold" href="#/cert">সনদ দেখো</a>' : '<a class="btn block" href="#/final">আবার চেষ্টা করো</a>'}<a class="btn ghost block" href="#/home">পাঠপথে ফিরে যাও</a></div></div>`;
      }
    }
    draw();
  }
  function pCert() {
    if (S.finalScore === null || S.finalScore < 70) { location.hash = '#/final'; return; }
    view.innerHTML = `<a class="back no-print" href="#/me">← অর্জন</a><div class="cert">
      <div class="small muted">দরপত্র পাঠশালা</div><h2>সমাপনী সনদ</h2><p>এই মর্মে প্রত্যয়ন করা যাচ্ছে যে</p>
      <div class="nm">${esc(S.name || 'শিক্ষার্থী')}</div>
      <p>“e-GP ও সরকারি দরপত্র পেশাদার শিক্ষাক্রম”-এর মূল ${bn(CORE().length)}টি পাঠ এবং চূড়ান্ত ব্যবহারিক পরীক্ষা ${bn(S.finalScore)}% নম্বরসহ সফলভাবে সম্পন্ন করেছেন।</p>
      <p class="small muted">তারিখ: ${bn(S.finalDate || today())}</p>
      <div class="stamp"><div><b>e-GP প্রো</b><small>উত্তীর্ণ</small></div></div></div>
      <p class="small muted" style="text-align:center;margin-top:10px">এটি ব্যক্তিগত শেখার অগ্রগতির স্মারক, কোনো সরকারি সনদ নয়।</p>
      <button class="btn block no-print" onclick="window.print()">প্রিন্ট / PDF হিসেবে সংরক্ষণ করো</button>`;
  }

  /* =========================================================
     ME — অর্জন ও সেটিংস
     ========================================================= */
  function pMe() {
    const lv = levelOf(S.xp);
    const days = Array.from({ length: 7 }, (_, k) => { const d = new Date(); d.setDate(d.getDate() - (6 - k)); return { d: today(d), w: d.toLocaleDateString('bn-BD', { weekday: 'short' }) }; });
    const mx = Math.max(50, ...days.map(x => S.log[x.d] || 0));
    const qTotal = Object.keys(S.done).length;
    const avg = qTotal ? Math.round(Object.values(S.done).reduce((a, d) => a + d.score, 0) / qTotal * 100) : 0;
    view.innerHTML = `<h1>অর্জন</h1>
      <div class="panel"><div class="row"><div class="brand-seal" style="width:52px;height:52px;font-size:1.5rem">${esc((S.name || 'দ').slice(0, 1))}</div>
        <div class="grow"><b style="font-family:var(--f-head);font-size:1.15rem">${esc(S.name || 'নাম দাওনি')}</b><div class="small muted">স্তর ${bn(lv.i + 1)}: ${lv.name}</div></div>
        <button class="btn ghost" id="nm" style="min-height:40px;padding:6px 12px">নাম বদলাও</button></div>
        <div class="bar" style="margin-top:12px"><i style="width:${lv.pct}%"></i></div>
        <p class="small muted" style="margin:.4em 0 0">${lv.next ? `পরের স্তরে যেতে আরও ${bn(lv.next - S.xp)} XP` : 'সর্বোচ্চ স্তরে পৌঁছে গেছ!'}</p></div>
      <div class="panel"><div class="statgrid">
        <div><b>${bn(S.xp)}</b><span>মোট XP</span></div><div><b>${bn(doneCount())}/${bn(LESSONS.length)}</b><span>পাঠ শেষ</span></div>
        <div><b>${bn(avg)}%</b><span>গড় স্কোর</span></div><div><b>${bn(S.best)} দিন</b><span>সেরা ধারা</span></div></div>
        <h3 style="margin-top:14px">গত ৭ দিনের XP</h3>
        <div class="week-bars">${days.map(x => `<div><i style="height:${Math.round((S.log[x.d] || 0) / mx * 80)}%" title="${bn(S.log[x.d] || 0)} XP"></i><small>${x.w}</small></div>`).join('')}</div></div>
      <h2>ব্যাজ <span class="chip">${bn(S.badges.length)}/${bn(BADGES.length)}</span></h2>
      <div class="badges">${BADGES.map(b => `<div class="badge ${S.badges.includes(b.id) ? '' : 'off'}"><div class="bi">${b.i}</div><b>${b.n}</b><span>${b.d}</span></div>`).join('')}</div>
      ${S.finalScore !== null && S.finalScore >= 70 ? '<a class="btn gold block" style="margin-top:14px" href="#/cert">আমার সনদ দেখো</a>' : ''}
      <h2 style="margin-top:22px">অ্যাপ ও সিঙ্ক</h2>
      ${installCard()}
      ${APP.hooks.meTop.map(f => f()).join('')}
      <h2 style="margin-top:22px">সেটিংস</h2>
      <div class="panel">
        <div class="setting"><div><b>শব্দ</b><div class="small muted">সঠিক/ভুল উত্তরে ছোট শব্দ</div></div><label class="switch"><input type="checkbox" id="snd" ${S.settings.sound ? 'checked' : ''}><i></i></label></div>
        <div class="setting"><div><b>থিম</b></div><select id="thm" style="width:auto;min-height:40px">${[['auto', 'ফোনের মতো'], ['light', 'আলো'], ['dark', 'অন্ধকার']].map(([v, n]) => `<option value="${v}" ${S.settings.theme === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="setting"><div><b>সব পাঠ খুলে দাও</b><div class="small muted">ক্রম ভেঙে যেকোনো পাঠ পড়তে চাইলে</div></div><label class="switch"><input type="checkbox" id="ula" ${S.settings.unlockAll ? 'checked' : ''}><i></i></label></div>
        <div class="setting"><div><b>অগ্রগতির ব্যাকআপ</b><div class="small muted">ফোন বদলালে বা ব্রাউজার ডেটা মুছলে কাজে লাগবে</div></div></div>
        <div class="row" style="padding-top:10px"><button class="btn ghost grow" id="ex">ব্যাকআপ নামাও</button><label class="btn ghost grow" for="im" style="cursor:pointer">ব্যাকআপ ফেরাও</label><input type="file" id="im" accept="application/json" hidden></div>
        <button class="btn danger block" id="rst" style="margin-top:14px">সব অগ্রগতি মুছে ফেলো</button>
      </div>`;
    $('#nm').onclick = askName;
    bindInstall(); APP.hooks.meBind && APP.hooks.meBind();
    $('#snd').onchange = e => { S.settings.sound = e.target.checked; save(); };
    $('#thm').onchange = e => { S.settings.theme = e.target.value; save(); applyTheme(); };
    $('#ula').onchange = e => { S.settings.unlockAll = e.target.checked; save(); toast(e.target.checked ? 'সব পাঠ খোলা হলো' : 'ক্রমানুসারে খুলবে'); };
    $('#ex').onclick = () => {
      const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `darpotro-pathshala-backup-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
    $('#im').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { try { const o = JSON.parse(r.result); if (typeof o.xp !== 'number') throw 0; const ep = S.epoch; S = normalize(o); S.epoch = Math.max(ep, o.epoch || 0) + 1; save(); applyTheme(); topbar(); toast('✅ ব্যাকআপ ফেরানো হয়েছে'); pMe(); } catch (err) { toast('ফাইলটি সঠিক ব্যাকআপ নয়'); } };
      r.readAsText(f);
    };
    $('#rst').onclick = () => { if (confirm('সব XP, পাঠ, ব্যাজ ও শিট মুছে যাবে — সিঙ্ক চালু থাকলে অন্য ডিভাইস থেকেও। নিশ্চিত?')) { const ep = S.epoch; S = normalize(null); S.epoch = ep + 1; save(); topbar(); location.hash = '#/home'; setTimeout(askName, 300); } };
  }
  function askName() {
    modal(`<h2>তোমার নাম কী?</h2><p class="muted">সনদ ও শুভেচ্ছায় এই নাম দেখাবে।</p>
      <input type="text" id="nmi" value="${esc(S.name)}" placeholder="যেমন: রাফসান" maxlength="40" style="margin-bottom:12px">
      <button class="btn block" id="nms">শুরু করি</button>`, () => {
      const i = $('#nmi'); setTimeout(() => i.focus(), 100);
      const go = () => { S.name = i.value.trim(); save(); closeModal(); route(); };
      $('#nms').onclick = go; i.onkeydown = e => { if (e.key === 'Enter') go(); };
    });
  }

  /* ---------- পাতা নিবন্ধন ---------- */
  page('home', pHome, 'home'); page('lesson', pLesson, null, true); page('final', pFinal, 'home');
  page('practice', pPractice, 'practice'); page('flash', pFlash, 'practice'); page('match', pMatch, 'practice');
  page('wrong', pWrong, 'practice'); page('daily', pDaily, 'practice'); page('glossary', pGlossary, 'practice');
  page('tools', pTools, 'tools'); page('sheet', pSheet, 'tools'); page('bid', pBid, 'tools'); page('checklist', pChecklist, 'tools');
  page('me', pMe, 'me'); page('cert', pCert, 'me');

  /* =========================================================
     ইনস্টল (মোবাইল ও ডেস্কটপ) — PWA
     ========================================================= */
  let deferredPrompt = null;
  const isStandalone = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: window-controls-overlay)').matches || navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installState = () => isStandalone() ? 'installed' : deferredPrompt ? 'ready' : isIOS() ? 'ios' : 'manual';
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; installUI(); });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; installUI(); toast('📲 অ্যাপ ইনস্টল হয়েছে! এখন হোম স্ক্রিন বা ডেস্কটপ থেকে খোলো'); });
  function installUI() {
    const b = $('#tb-install'); if (!b) return;
    b.hidden = installState() === 'installed';
    if ((current === 'me' || current === 'home') && $('#install-box')) route();
  }
  function installCard() {
    const st = installState();
    if (st === 'installed') return `<div class="panel install-card done" id="install-box"><div class="row"><span class="ic">✅</span><div><b>অ্যাপ হিসেবে চলছে</b><div class="small muted">এই ডিভাইসে দরপত্র পাঠশালা ইনস্টল করা আছে। ইন্টারনেট ছাড়াও খুলবে।</div></div></div></div>`;
    return `<div class="panel install-card" id="install-box"><div class="row"><span class="ic">📲</span><div class="grow"><b>মোবাইল ও কম্পিউটারে ইনস্টল করো</b><div class="small muted">আলাদা অ্যাপের মতো খুলবে, ইন্টারনেট ছাড়াও চলবে, ব্রাউজারের ঝামেলা থাকবে না।</div></div></div>
      <button class="btn block" data-install style="margin-top:12px">${st === 'ready' ? 'এখনই ইনস্টল করো' : 'কীভাবে ইনস্টল করব?'}</button></div>`;
  }
  function bindInstall() { $$('[data-install]').forEach(b => b.onclick = doInstall); }
  async function doInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try { const r = await deferredPrompt.userChoice; if (r.outcome === 'accepted') toast('📲 ইনস্টল হচ্ছে…'); } catch (e) { }
      deferredPrompt = null; installUI(); return;
    }
    const ios = isIOS();
    modal(`<h2>ইনস্টল করার নিয়ম</h2>
      ${ios ? `<ol class="flow"><li>Safari-তে অ্যাপটি খোলো</li><li>নিচের <b>Share</b> বোতাম (⬆️ চিহ্নের বাক্স) চাপো</li><li><b>Add to Home Screen</b> বেছে নাও</li><li>ডান দিকের <b>Add</b> চাপো — হোম স্ক্রিনে আইকন চলে আসবে</li></ol>`
      : `<h3>📱 অ্যান্ড্রয়েড ফোন</h3><ol class="flow"><li>Chrome-এ অ্যাপটি খোলো</li><li>ওপরে ডানে ⋮ মেনু চাপো</li><li><b>Install app</b> বা <b>Add to Home screen</b> চাপো</li></ol>
        <h3>💻 কম্পিউটার (Windows / Mac / Linux)</h3><ol class="flow"><li>Chrome বা Microsoft Edge-এ অ্যাপটি খোলো</li><li>ঠিকানা বারের ডান পাশে ইনস্টল চিহ্ন (🖥️⬇) চাপো, অথবা মেনু → <b>Install দরপত্র পাঠশালা</b></li><li>এরপর ডেস্কটপ/স্টার্ট মেনু থেকে আলাদা উইন্ডোতে খুলবে</li></ol>
        <p class="small muted">Firefox-এ এই সুবিধা নেই — Chrome বা Edge ব্যবহার করো।</p>`}
      <button class="btn block" id="mclose">বুঝেছি</button>`, () => { $('#mclose').onclick = closeModal; });
  }

  /* ---------- অনলাইন / অফলাইন ---------- */
  function netUI() {
    document.body.classList.toggle('offline', !navigator.onLine);
    const n = $('#net'); if (n) n.hidden = navigator.onLine;
  }
  window.addEventListener('online', () => { netUI(); toast('🌐 আবার অনলাইন — জমে থাকা আপডেট সিঙ্ক হচ্ছে'); });
  window.addEventListener('offline', () => { netUI(); toast('📴 অফলাইন — চিন্তা নেই, সব কাজ এই ডিভাইসে জমা থাকবে'); });

  /* ---------- Service Worker ও নতুন সংস্করণ ---------- */
  function registerSW() {
    if (!('serviceWorker' in navigator) || !(location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) return;
    navigator.serviceWorker.register('sw.js').then(reg => {
      const offer = w => {
        const bar = $('#update-bar'); if (!bar) return;
        bar.hidden = false;
        $('#update-go').onclick = () => { w.postMessage('SKIP_WAITING'); bar.hidden = true; };
      };
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing; if (!nw) return;
        nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) offer(nw); });
      });
      setInterval(() => reg.update().catch(() => { }), 60 * 60 * 1000);
    }).catch(() => { });
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloaded) return; reloaded = true; location.reload(); });
  }

  /* ---------- রিমোট (অন্য ডিভাইস) থেকে আসা অবস্থা ---------- */
  function replaceState(next, why) {
    const nx = normalize(next);
    if (same(nx, S)) return false;
    S = nx;
    persist(); applyTheme(); topbar();
    // পড়া বা খেলার মাঝখানে পাতা বদলাব না
    const busy = IMMERSIVE.has(current) || ['lab', 'convo', 'game', 'mock', 'calc', 'sheet', 'bid', 'checklist'].includes(current);
    if (!busy) route();
    if (why) toast(why);
    return true;
  }

  /* ---------- অন্য মডিউলের জন্য API ---------- */
  window.APP = {
    $, $$, view, bn, esc, today, shuffle, pick, KEYS, uid, DEV, COURSE, LESSONS, GLOSSARY, byId, LEVELS, levelOf, BADGES,
    get S() { return S; }, save, persist, normalize, same, replaceState, on: (ev, f) => listeners[ev].push(f),
    addXP, toast, modal, closeModal, sound, vibrate, confetti, checkBadges, copy, gradeShort, runQuestions, topbar,
    page, route, go: h => { location.hash = h; }, get current() { return current; },
    installCard, bindInstall, doInstall, installState, sheetDraft: null, doneCount, allDone, weekDone,
    hooks: { meTop: [], homeTop: [], practiceTiles: [], toolsTiles: [] }
  };

  /* ---------- boot: সব মডিউল লোড হওয়ার পর ---------- */
  function boot() {
    applyTheme(); topbar(); netUI(); route(); installUI();
    $('#tb-install').onclick = doInstall;
    if (!S.name && !S.xp) setTimeout(askName, 400);
    registerSW();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else setTimeout(boot, 0);
})();
