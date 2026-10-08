/* v2 পাতা: প্রো পথ, কথোপকথন, খেলা, বাস্তব কেস পরীক্ষা, ক্যালকুলেটর */
(function () {
  'use strict';
  const A = window.APP, V2 = window.V2;
  const { $, $$, esc, bn, shuffle, KEYS } = A;
  const S = () => A.S;
  const BN = '০১২৩৪৫৬৭৮৯';
  const toEn = s => String(s ?? '').replace(/[০-৯]/g, d => BN.indexOf(d));
  const num = v => { const n = parseFloat(toEn(v).replace(/[, ]/g, '')); return isNaN(n) ? null : n; };
  const tk = v => v === null || v === undefined || isNaN(v) ? '—' : '৳ ' + bn(Math.round(v).toLocaleString('en-IN'));
  const fx = (v, d = 2) => bn((+v).toFixed(d));
  const MON_BN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  const dBn = d => `${bn(d.getDate())} ${MON_BN[d.getMonth()]} ${bn(d.getFullYear())}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  /* =========================================================
     প্রো পথ
     ========================================================= */
  function itemDone(it) {
    const s = S();
    switch (it.k) {
      case 'lessons': return it.ids.every(id => s.done[id]);
      case 'stat': return (s.stats[it.key] || 0) >= it.min;
      case 'convo': return (s.stats.convo[it.id] || 0) >= 70;
      case 'calc': return (s.stats.calc[it.id] || 0) > 0;
      case 'sheets': return s.sheets.length >= it.min;
      case 'final': return s.finalScore !== null && s.finalScore >= it.min;
      case 'mock': return s.stats.mockBest !== null && s.stats.mockBest >= it.min;
      case 'task': return (s.track.tasks[it.id] || 0) > 0;
    }
    return false;
  }
  function trackPct(role) {
    const T = V2.TRACKS[role]; if (!T) return 0;
    const all = T.levels.flatMap(l => l.items);
    return Math.round(all.filter(itemDone).length / all.length * 100);
  }
  A.trackPct = trackPct;
  function levelInfo(role) {
    const T = V2.TRACKS[role];
    let cur = T.levels.findIndex(l => !l.items.every(itemDone));
    if (cur < 0) cur = T.levels.length;
    const next = cur < T.levels.length ? T.levels[cur].items.find(it => !itemDone(it)) : null;
    return { cur, next };
  }
  function itemHref(it) {
    if (it.go) return it.go;
    if (it.k === 'lessons') { const id = it.ids.find(x => !S().done[x]) || it.ids[0]; return '#/lesson/' + id; }
    return null;
  }
  function pPath(arg) {
    const s = S();
    if (arg === 'choose' || !s.track.role) {
      A.view.innerHTML = `<h1>প্রো পথ</h1>
        <p class="muted">বাংলাদেশের সরকারি ক্রয়ে তুমি কোন পক্ষ থেকে প্রো হতে চাও? দুটো পথেই পাঠ, খেলা, কথোপকথন, টুল আর বাস্তব কাজ ধাপে ধাপে সাজানো। পরে যেকোনো সময় বদলাতে পারবে — অগ্রগতি দুটোরই থাকবে।</p>
        <div class="role-pick">${Object.entries(V2.TRACKS).map(([k, T]) => `<button class="role-card" data-r="${k}"><span class="ri">${T.icon}</span><b>${T.name}</b><span class="small muted">${T.who}</span><span class="small">${T.pro}</span><span class="chip">${bn(trackPct(k))}% সম্পন্ন</span></button>`).join('')}</div>`;
      $$('[data-r]').forEach(b => b.onclick = () => { s.track.role = b.dataset.r; A.save(); A.sound('tap'); location.hash = '#/path'; if (A.current === 'path') pPath(); });
      return;
    }
    const role = s.track.role, T = V2.TRACKS[role], pct = trackPct(role), L = levelInfo(role);
    const other = role === 'tenderer' ? 'pe' : 'tenderer';
    let h = `<section class="path-hero">
      <div class="row"><span class="ri">${T.icon}</span><div class="grow"><div class="small" style="opacity:.85">তোমার পথ</div><h1>${T.name}</h1></div>
      <a class="pill" href="#/path/choose" style="color:inherit;text-decoration:none">বদলাও</a></div>
      <div class="ladder" aria-label="স্তর">${T.levels.map((l, i) => `<div class="rung ${i < L.cur ? 'done' : i === L.cur ? 'cur' : ''}"><i></i><small>${bn(i + 1)}</small></div>`).join('')}</div>
      <div class="meta"><span>${L.cur >= T.levels.length ? '🏆 প্রো স্তর সম্পন্ন!' : `স্তর ${bn(L.cur + 1)}: ${T.levels[L.cur].n}`}</span><span>${bn(pct)}%</span></div>
      ${L.next ? `<div class="next-up"><div class="small" style="opacity:.85">পরের কাজ</div><b>${esc(L.next.t)}</b>${itemHref(L.next) ? `<a class="btn block" href="${itemHref(L.next)}">শুরু করো</a>` : ''}</div>` : `<p style="margin:.6em 0 0">${T.pro}</p>`}
    </section>`;
    T.levels.forEach((lv, i) => {
      const dn = lv.items.filter(itemDone).length;
      h += `<details class="level ${i < L.cur ? 'done' : ''}" ${i === L.cur ? 'open' : ''}><summary><span class="lvn">${bn(i + 1)}</span><div class="grow"><b>${lv.n}</b><div class="small muted">${lv.g}</div></div><span class="chip ${dn === lv.items.length ? 'ok' : ''}">${bn(dn)}/${bn(lv.items.length)}</span></summary>
        <div class="items">${lv.items.map(it => {
          const d = itemDone(it), href = itemHref(it);
          if (it.k === 'task') return `<label class="item task ${d ? 'on' : ''}"><input type="checkbox" data-task="${it.id}" ${d ? 'checked' : ''}><span><b>${esc(it.t)}</b>${it.tip ? `<small>${esc(it.tip)}</small>` : ''}</span></label>`;
          return `<a class="item ${d ? 'on' : ''}" ${href ? `href="${href}"` : ''}><span class="tick">${d ? '✅' : '○'}</span><span><b>${esc(it.t)}</b></span></a>`;
        }).join('')}</div></details>`;
    });
    const tools = role === 'tenderer'
      ? [['#/lab', '🔬', 'বিজ্ঞপ্তি ল্যাব'], ['#/sheet', '📝', 'Analysis Sheet'], ['#/bid', '⚖️', 'Bid/No-Bid'], ['#/calc/elig', '🧮', 'যোগ্যতা যাচাই'], ['#/calc/boq', '🧾', 'দর ও VAT'], ['#/calc/sec', '🛡️', 'জামানতের মেয়াদ'], ['#/calc/ld', '⏳', 'LD হিসাব'], ['#/checklist', '✅', 'জমার চেকলিস্ট']]
      : [['#/calc/timeline', '🗓️', 'সময়রেখা'], ['#/calc/eval', '📊', 'দর তুলনা'], ['#/calc/qcbs', '🎯', 'QCBS স্কোর'], ['#/calc/ld', '⏳', 'LD হিসাব'], ['#/lab', '🔬', 'বিজ্ঞপ্তির মান যাচাই'], ['#/convo/tec', '💬', 'TEC অনুশীলন']];
    h += `<h2 style="margin-top:22px">${role === 'tenderer' ? 'দরদাতার' : 'PE-র'} টুলবক্স</h2><div class="toolgrid">${tools.map(([u, i, n]) => `<a href="${u}"><span>${i}</span>${n}</a>`).join('')}</div>
      <p class="small muted" style="margin-top:16px">অন্য পক্ষের পথ: <a href="#/path/choose">${V2.TRACKS[other].icon} ${V2.TRACKS[other].name} — ${bn(trackPct(other))}%</a>। দুই পক্ষ বুঝলে তুমি দুই দিকেই বেশি কার্যকর।</p>`;
    A.view.innerHTML = h;
    $$('[data-task]').forEach(c => c.onchange = () => {
      s.track.tasks[c.dataset.task] = (c.checked ? 1 : -1) * Date.now();
      if (c.checked) A.addXP(15, c);
      A.save(); A.checkBadges(); A.sound(c.checked ? 'ok' : 'tap');
      const before = pct; pPath();
      if (trackPct(role) === 100 && before < 100) { A.confetti(); A.toast('🏆 অভিনন্দন! ' + T.name + ' পথ সম্পন্ন'); }
    });
  }

  /* =========================================================
     কথোপকথন
     ========================================================= */
  function pConvo(id) {
    if (!id) {
      A.view.innerHTML = `<a class="back" href="#/practice">← অনুশীলন</a><h1>কথোপকথন</h1>
        <p class="muted">বাস্তব অফিসের পরিস্থিতি — ক্লায়েন্ট, ব্যাংক, PE অফিস, মূল্যায়ন কমিটি। প্রতিটি মোড়ে তুমি কী বলবে বেছে নাও; কোচ সাথে সাথে বলবেন কেন।</p>
        ${V2.CONVOS.map(c => { const best = S().stats.convo[c.id]; return `<a class="node" href="#/convo/${c.id}"><span class="ns" style="font-size:1.6rem">${c.icon}</span><div class="nt"><b>${esc(c.title)}</b><span>${esc(c.role)} · ${esc(c.desc)}</span></div>${best !== undefined ? `<span class="chip ${best >= 70 ? 'ok' : ''}">${bn(best)}%</span>` : '<span class="ns">▶️</span>'}</a>`; }).join('')}`;
      return;
    }
    const C = V2.CONVOS.find(c => c.id === id);
    if (!C) { location.hash = '#/convo'; return; }
    let node = 'start', got = 0, max = 0;
    const log = [];
    A.view.innerHTML = `<a class="back" href="#/convo">← সব কথোপকথন</a><div class="kicker">${C.icon} ${esc(C.role)}</div><h1>${esc(C.title)}</h1><p class="muted">${esc(C.desc)}</p>
      <div class="chat convo-log" id="clog"></div><div id="cchoices"></div>`;
    const logEl = $('#clog'), ch = $('#cchoices');
    const bubble = (who, txt, me) => { const d = document.createElement('div'); d.className = 'say' + (me ? ' me' : ''); d.innerHTML = `<b class="who">${esc(who)}</b>${esc(txt)}`; logEl.appendChild(d); };
    function step() {
      const N = C.nodes[node];
      if (N.end) return finish(N.end);
      N.lines.forEach(([w, t]) => bubble(w, t, w.startsWith('তুমি')));
      ch.innerHTML = `<div class="kicker" style="margin-top:12px">তুমি কী বলবে/করবে?</div><div class="opts">${shuffle(N.choices.map((c, i) => ({ c, i }))).map(({ c, i }, k) => `<button class="opt" data-i="${i}"><span class="k">${KEYS[k]}</span><span>${esc(c.t)}</span></button>`).join('')}</div>`;
      ch.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      $$('#cchoices .opt').forEach(b => b.onclick = () => {
        const c = N.choices[+b.dataset.i];
        max += 2; got += c.s; log.push(c.s);
        bubble('তুমি', c.t, true);
        const coach = document.createElement('div');
        coach.className = 'coach s' + c.s;
        coach.innerHTML = `<b>${c.s === 2 ? '🌟 পেশাদার সিদ্ধান্ত' : c.s === 1 ? '🙂 চলনসই' : '⚠️ ঝুঁকিপূর্ণ'}</b> ${esc(c.fb)}`;
        logEl.appendChild(coach);
        A.sound(c.s === 2 ? 'ok' : c.s === 1 ? 'tap' : 'bad');
        if (c.s === 2) A.addXP(6, b);
        node = c.next;
        ch.innerHTML = `<button class="btn block" id="cnext" style="margin-top:12px">${C.nodes[node].end ? 'ফলাফল দেখো' : 'চালিয়ে যাও'}</button>`;
        $('#cnext').onclick = step;
        coach.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
    function finish(lesson) {
      const pct = max ? Math.round(got / max * 100) : 0;
      const prev = S().stats.convo[C.id];
      S().stats.convo[C.id] = Math.max(prev || 0, pct); A.save();
      A.addXP(prev === undefined ? 20 : 5); A.checkBadges();
      if (pct >= 80) { A.confetti(); A.sound('done'); }
      ch.innerHTML = `<div class="panel" style="margin-top:14px;text-align:center"><div class="stamp" style="width:130px;height:130px;margin:6px auto 12px"><div><b>${bn(pct)}%</b><small>পেশাদারিত্ব</small></div></div>
        <p><b>মূল শিক্ষা:</b> ${esc(lesson)}</p>
        <div class="row"><button class="btn ghost grow" id="again">আবার খেলো</button><a class="btn grow" href="#/convo">অন্য কথোপকথন</a></div></div>`;
      $('#again').onclick = () => pConvo(C.id);
    }
    step();
  }

  /* =========================================================
     খেলা
     ========================================================= */
  function pGame(kind) {
    if (kind === 'seq') return gSeq();
    if (kind === 'sprint') return gSprint();
    if (kind === 'boq') return gBoq();
    location.hash = '#/practice';
  }
  // ১) ধাপ সাজাও
  function gSeq(setId) {
    const set = V2.SEQ.find(x => x.id === setId) || V2.SEQ[Math.floor(Math.random() * V2.SEQ.length)];
    let pool = shuffle(set.steps.map((t, i) => ({ t, i })));
    while (pool.every((x, k) => x.i === k)) pool = shuffle(pool);
    let picked = [];
    function draw(checked) {
      A.view.innerHTML = `<a class="back" href="#/practice">← অনুশীলন</a><h2>🧩 ধাপ সাজাও</h2>
        <div class="row wrap" style="gap:6px;margin-bottom:10px">${V2.SEQ.map(x => `<button class="chip-btn ${x.id === set.id ? 'on' : ''}" data-set="${x.id}">${esc(x.t)}</button>`).join('')}</div>
        <p class="muted"><b>${esc(set.t)}</b> (${esc(set.who)}) — ধাপগুলো সঠিক ক্রমে চাপো। ভুল চাপলে নিচের তালিকা থেকে চাপ দিয়ে ফেরত আনো।</p>
        <ol class="seq-picked">${picked.map((x, k) => `<li><button data-un="${k}" class="${checked ? (x.i === k ? 'ok' : 'bad') : ''}">${esc(x.t)}</button></li>`).join('')}${Array.from({ length: set.steps.length - picked.length }, () => '<li class="empty-slot"><span>…</span></li>').join('')}</ol>
        <div class="seq-pool">${pool.filter(x => !picked.includes(x)).map(x => `<button data-pick="${x.i}">${esc(x.t)}</button>`).join('')}</div>
        ${checked ? '' : `<button class="btn block" id="chk" ${picked.length === set.steps.length ? '' : 'disabled'}>যাচাই করো</button>`}
        <div id="res"></div>`;
      $$('[data-set]').forEach(b => b.onclick = () => gSeq(b.dataset.set));
      if (!checked) {
        $$('[data-pick]').forEach(b => b.onclick = () => { picked.push(pool.find(x => x.i === +b.dataset.pick)); A.sound('tap'); draw(); });
        $$('[data-un]').forEach(b => b.onclick = () => { picked.splice(+b.dataset.un, 1); draw(); });
        const c = $('#chk'); if (c) c.onclick = () => {
          const right = picked.filter((x, k) => x.i === k).length, win = right === set.steps.length;
          draw(true);
          if (win) { S().stats.seqWins = (S().stats.seqWins || 0) + 1; A.save(); A.addXP(15); A.checkBadges(); A.confetti(); A.sound('done'); }
          else A.sound('bad');
          $('#res').innerHTML = `<div class="verdict ${win ? 'go' : 'maybe'}" style="margin-top:12px">${win ? '🎉 নিখুঁত ক্রম! +১৫ XP' : `${bn(right)}/${bn(set.steps.length)} ধাপ ঠিক জায়গায়`}</div>
            ${win ? '' : `<div class="panel" style="margin-top:10px"><b>সঠিক ক্রম:</b><ol class="flow" style="margin-top:8px">${set.steps.map(t => `<li>${esc(t)}</li>`).join('')}</ol></div>`}
            <div class="row" style="margin-top:10px"><button class="btn ghost grow" id="re">আবার এটাই</button><button class="btn grow" id="nx">নতুন সেট</button></div>`;
          $('#re').onclick = () => gSeq(set.id);
          $('#nx').onclick = () => gSeq(shuffle(V2.SEQ.filter(x => x.id !== set.id))[0].id);
        };
      }
    }
    draw();
  }
  // ২) টিকবে নাকি বাতিল — ৬০ সেকেন্ড
  function gSprint() {
    A.view.innerHTML = `<a class="back" href="#/practice">← অনুশীলন</a><h2>⏱️ টিকবে নাকি বাতিল?</h2>
      <p class="muted">মূল্যায়ন কমিটির সদস্য হয়ে ৬০ সেকেন্ডে যত বেশি সম্ভব সিদ্ধান্ত দাও: এই ত্রুটিতে দরপত্র <b>টিকে থাকবে</b> (সংশোধনযোগ্য/গ্রহণযোগ্য), নাকি <b>বাতিল</b> (non-responsive)? কীবোর্ডে ← বাতিল, → টিকবে।</p>
      <div class="panel" style="text-align:center"><div class="small muted">সেরা স্কোর</div><b style="font-size:2rem;font-family:var(--f-head)">${bn(S().stats.sprintBest || 0)}</b></div>
      <button class="btn block gold" id="go">শুরু করো</button>`;
    $('#go').onclick = play;
    function play() {
      const deck = shuffle(V2.SPRINT); let i = 0, score = 0, t0 = Date.now(), over = false; const miss = [];
      A.view.innerHTML = `<div class="row" style="justify-content:space-between"><a class="back" href="#/practice" style="margin:0">← থামাও</a><span class="pill" id="clk">⏱ ৬০</span><span class="pill xp" id="sc">✔ ০</span></div>
        <div class="sprint-card" id="card"></div>
        <div class="row sprint-btns"><button class="btn danger grow" data-v="0">❌ বাতিল</button><button class="btn grow" data-v="1">✅ টিকবে</button></div>
        <div id="flash" class="small" style="min-height:3em;margin-top:10px"></div>`;
      const tick = setInterval(() => {
        const left = 60 - Math.floor((Date.now() - t0) / 1000);
        const c = $('#clk'); if (!c) { clearInterval(tick); return; }
        c.textContent = '⏱ ' + bn(Math.max(0, left));
        if (left <= 0) end();
      }, 250);
      const show = () => { if (i >= deck.length) { deck.push(...shuffle(V2.SPRINT)); } $('#card').innerHTML = `<span>${esc(deck[i].s)}</span>`; };
      const answer = v => {
        if (over) return;
        const it = deck[i], ok = (v === 1) === it.ok;
        if (ok) { score++; A.sound('ok'); } else { miss.push(it); A.sound('bad'); A.vibrate(30); }
        $('#sc').textContent = '✔ ' + bn(score);
        $('#flash').innerHTML = ok ? `<span style="color:var(--ok)">✓ ঠিক</span>` : `<span style="color:var(--bad)">✗ ${it.ok ? 'টিকবে' : 'বাতিল'}</span> — ${esc(it.e)}`;
        const card = $('#card'); card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
        i++; show();
      };
      $$('.sprint-btns [data-v]').forEach(b => b.onclick = () => answer(+b.dataset.v));
      const key = e => { if (e.key === 'ArrowLeft') answer(0); if (e.key === 'ArrowRight') answer(1); };
      document.addEventListener('keydown', key);
      window.addEventListener('hashchange', () => { over = true; clearInterval(tick); document.removeEventListener('keydown', key); }, { once: true });
      show();
      function end() {
        if (over) return; over = true; clearInterval(tick); document.removeEventListener('keydown', key);
        const best = score > (S().stats.sprintBest || 0);
        if (best) S().stats.sprintBest = score;
        A.save(); A.addXP(Math.min(30, score * 2)); A.checkBadges();
        if (best) { A.confetti(); A.sound('done'); }
        const uniq = [...new Map(miss.map(m => [m.s, m])).values()];
        A.view.innerHTML = `<div class="result" style="padding-bottom:20px"><div class="stamp"><div><b>${bn(score)}</b><small>সঠিক সিদ্ধান্ত</small></div></div>
          <h1>${best ? '🏆 নতুন রেকর্ড!' : 'সময় শেষ!'}</h1><p class="muted">সেরা: ${bn(S().stats.sprintBest)}</p></div>
          ${uniq.length ? `<div class="panel"><h3>যেগুলোতে ভুল হয়েছে</h3><ul class="flags">${uniq.map(m => `<li class="w"><b>${esc(m.s)}</b><br>সঠিক: ${m.ok ? '✅ টিকবে' : '❌ বাতিল'} — ${esc(m.e)}</li>`).join('')}</ul></div>` : ''}
          <div class="row"><button class="btn grow" id="ag">আবার খেলো</button><a class="btn ghost grow" href="#/practice">অনুশীলন</a></div>`;
        $('#ag').onclick = play;
      }
    }
  }
  // ৩) BOQ-এর ভুল ধরো
  const BOQ_ITEMS = {
    goods: [['ডেস্কটপ কম্পিউটার', 'টি', 70000, 98000], ['ল্যাপটপ', 'টি', 85000, 125000], ['লেজার প্রিন্টার', 'টি', 22000, 38000], ['UPS ১২০০VA', 'টি', 7500, 12500], ['নেটওয়ার্ক সুইচ ২৪ পোর্ট', 'টি', 18000, 42000], ['মাল্টিমিডিয়া প্রজেক্টর', 'টি', 45000, 72000], ['অফিস চেয়ার', 'টি', 6500, 14500], ['ফাইল কেবিনেট', 'টি', 15000, 26000]],
    works: [['মাটির কাজ', 'ঘনমিটার', 280, 420], ['বালুর বিছানা', 'ঘনমিটার', 1350, 1850], ['ইটের সলিং', 'বর্গমিটার', 520, 760], ['WBM বেস', 'বর্গমিটার', 690, 980], ['৪০ মিমি কার্পেটিং', 'বর্গমিটার', 760, 940], ['RCC কাজ', 'ঘনমিটার', 14500, 19500], ['রড (৬০ গ্রেড)', 'মে.টন', 92000, 108000], ['গাইড পোস্ট', 'টি', 1800, 2800]]
  };
  function gBoq() {
    const kind = Math.random() < 0.5 ? 'goods' : 'works';
    const rows = shuffle(BOQ_ITEMS[kind]).slice(0, 5).map(([n, u, lo, hi]) => {
      const rate = Math.round((lo + Math.random() * (hi - lo)) / 50) * 50;
      const qty = kind === 'goods' ? 2 + Math.floor(Math.random() * 25) : 10 * (5 + Math.floor(Math.random() * 120));
      return { n, u, qty, rate, amt: qty * rate };
    });
    const bad = Math.floor(Math.random() * rows.length);
    const realAmt = rows[bad].amt;
    const errs = [() => realAmt + rows[bad].rate, () => realAmt - rows[bad].rate * 2, () => +String(realAmt).replace(/(\d)(\d)/, '$2$1'), () => realAmt + 10000];
    let wrong = realAmt; for (let t = 0; t < 8 && (wrong === realAmt || wrong <= 0); t++) wrong = errs[Math.floor(Math.random() * errs.length)]();
    rows[bad].shown = wrong;
    const shownTotal = rows.reduce((s, r) => s + (r.shown ?? r.amt), 0), realTotal = rows.reduce((s, r) => s + r.amt, 0);
    let stage = 0, tries = 0;
    function draw(msg) {
      A.view.innerHTML = `<a class="back" href="#/practice">← অনুশীলন</a><h2>🧾 BOQ-এর ভুল ধরো</h2>
        <p class="muted">${kind === 'goods' ? 'একটি সরবরাহ দরপত্রের' : 'একটি সড়ক কাজের'} মূল্য তফসিল। TEC সদস্য হিসেবে গাণিতিক ভুল খুঁজে সংশোধন করো (নিয়ম: একক দর × পরিমাণ; একক দর প্রাধান্য পায়)।</p>
        <div class="tbl"><table class="boq"><tr><th>আইটেম</th><th>পরিমাণ</th><th>একক দর</th><th>মোট (লেখা)</th></tr>
        ${rows.map((r, i) => `<tr class="${stage === 0 ? 'tap' : i === bad ? 'hl' : ''}" data-row="${i}"><td>${esc(r.n)}</td><td>${bn(r.qty)} ${esc(r.u)}</td><td>${tk(r.rate)}</td><td>${tk(r.shown ?? r.amt)}</td></tr>`).join('')}
        <tr class="tot"><td colspan="3"><b>সর্বমোট (লেখা)</b></td><td><b>${tk(shownTotal)}</b></td></tr></table></div>
        <div id="boq-q">${stage === 0 ? '<div class="model">১) কোন সারিতে গুণফল ভুল? সারিতে চাপ দাও।</div>'
          : stage === 1 ? `<div class="field"><label for="b1">২) “${esc(rows[bad].n)}”-এর সঠিক মোট কত?</label><input id="b1" type="text" inputmode="numeric" placeholder="শুধু সংখ্যা"></div><button class="btn block" id="bk">যাচাই</button>`
          : stage === 2 ? `<div class="field"><label for="b2">৩) সংশোধিত সর্বমোট (মূল্যায়িত দর) কত?</label><input id="b2" type="text" inputmode="numeric" placeholder="শুধু সংখ্যা"></div><button class="btn block" id="bk">যাচাই</button>` : ''}</div>
        <div id="bmsg">${msg || ''}</div>`;
      if (stage === 0) $$('tr.tap').forEach(tr => tr.onclick = () => {
        if (+tr.dataset.row === bad) { stage = 1; A.sound('ok'); draw('<div class="model" style="margin-top:10px">✓ ঠিক ধরেছ! ' + bn(rows[bad].qty) + ' × ' + tk(rows[bad].rate) + ' ≠ ' + tk(wrong) + '</div>'); }
        else { tries++; A.sound('bad'); tr.classList.add('wrongrow'); setTimeout(() => tr.classList.remove('wrongrow'), 400); }
      });
      const bk = $('#bk');
      if (bk) bk.onclick = () => {
        const v = num($(stage === 1 ? '#b1' : '#b2').value);
        const want = stage === 1 ? realAmt : realTotal;
        if (v === want) {
          A.sound('ok');
          if (stage === 1) { stage = 2; draw(`<div class="model" style="margin-top:10px">✓ ${tk(realAmt)} — লেখা ছিল ${tk(wrong)}, পার্থক্য ${tk(realAmt - wrong)}</div>`); }
          else {
            stage = 3; const win = tries <= 1;
            if (win) { S().stats.boqWins = (S().stats.boqWins || 0) + 1; A.addXP(15); A.confetti(); A.sound('done'); } else A.addXP(5);
            A.save(); A.checkBadges();
            draw(`<div class="verdict ${win ? 'go' : 'maybe'}" style="margin-top:12px">${win ? '🎉 নির্ভুল সংশোধন!' : 'সংশোধন ঠিক, তবে ভুল সারি খুঁজতে কয়েকবার লাগল'}</div>
              <div class="model" style="margin-top:10px">লেখা সর্বমোট ${tk(shownTotal)} → মূল্যায়িত দর <b>${tk(realTotal)}</b> (${realTotal > shownTotal ? 'বেড়েছে' : 'কমেছে'} ${tk(Math.abs(realTotal - shownTotal))})। দরের ক্রম এই সংশোধিত অঙ্কে ঠিক হয়।</div>
              <button class="btn block" id="nb" style="margin-top:12px">নতুন BOQ</button>`);
            $('#nb').onclick = gBoq;
          }
        } else { tries++; A.sound('bad'); A.toast('মেলেনি — আবার হিসাব করো'); }
      };
    }
    draw();
  }

  /* =========================================================
     বাস্তব কেস পরীক্ষা
     ========================================================= */
  let mockTimer = null;
  function pMock() {
    clearInterval(mockTimer);
    const s = S();
    A.view.innerHTML = `<a class="back" href="#/practice">← অনুশীলন</a><h1>বাস্তব কেস পরীক্ষা</h1>
      <p>প্রতিটি প্রশ্ন একটি বাস্তবধর্মী পরিস্থিতি — বিজ্ঞপ্তির অংশ, হিসাব বা সিদ্ধান্ত। ১২টি প্রশ্ন, ১৫ মিনিট। ৭০% পেলে উত্তীর্ণ।</p>
      <div class="panel"><div class="statgrid"><div><b>${s.stats.mockBest === null ? '—' : bn(s.stats.mockBest) + '%'}</b><span>সেরা স্কোর</span></div><div><b>${bn(s.stats.mockCount || 0)}</b><span>বার দিয়েছ</span></div></div></div>
      <div class="field"><label>কোন পক্ষের প্রশ্ন?</label><div class="seg"><button data-f="all" class="on">মিশ্র</button><button data-f="দরদাতা">🏢 দরদাতা</button><button data-f="PE">🏛️ PE</button></div></div>
      <button class="btn block gold" id="go">পরীক্ষা শুরু করো</button>`;
    let filt = 'all';
    $$('[data-f]').forEach(b => b.onclick = () => { filt = b.dataset.f; $$('[data-f]').forEach(x => x.classList.toggle('on', x === b)); });
    $('#go').onclick = () => run(filt);
  }
  function run(filt) {
    const pool = V2.MOCK.filter(q => filt === 'all' || q.r === filt);
    const Q = shuffle(pool).slice(0, 12), ans = [];
    let i = 0; const t0 = Date.now(), LIM = 15 * 60;
    function draw() {
      if (i >= Q.length) return end();
      const q = Q[i];
      A.view.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="kicker" style="margin:0">প্রশ্ন ${bn(i + 1)}/${bn(Q.length)} · ${esc(q.r)}</span><span class="pill" id="mclk">⏱</span></div>
        <div class="case">${esc(q.c)}</div>
        <div class="panel"><div class="q-text">${esc(q.q)}</div><div class="opts">${q.o.map((o, k) => `<button class="opt" data-k="${k}"><span class="k">${KEYS[k]}</span><span>${esc(o)}</span></button>`).join('')}</div></div>`;
      $$('.opt').forEach(b => b.onclick = () => { ans[i] = +b.dataset.k; A.sound('tap'); i++; draw(); });
    }
    clearInterval(mockTimer);
    mockTimer = setInterval(() => {
      const left = LIM - Math.floor((Date.now() - t0) / 1000), c = $('#mclk');
      if (!c) { clearInterval(mockTimer); return; }
      c.textContent = `⏱ ${bn(Math.floor(left / 60))}:${bn(String(Math.max(0, left % 60)).padStart(2, '0'))}`;
      if (left <= 0) { clearInterval(mockTimer); A.toast('⏰ সময় শেষ'); i = Q.length; draw(); }
    }, 500);
    function end() {
      clearInterval(mockTimer);
      const right = Q.filter((q, k) => ans[k] === q.a).length, pct = Math.round(right / Q.length * 100);
      const s = S(); s.stats.mockCount = (s.stats.mockCount || 0) + 1;
      const first = s.stats.mockBest === null || s.stats.mockBest < 70;
      s.stats.mockBest = Math.max(s.stats.mockBest ?? 0, pct); A.save();
      A.addXP(pct >= 70 && first ? 100 : right * 3); A.checkBadges();
      if (pct >= 70) { A.confetti(); A.sound('done'); }
      A.view.innerHTML = `<div class="result" style="padding-bottom:16px"><div class="stamp"><div><b>${bn(pct)}%</b><small>কেস পরীক্ষা</small></div></div>
        <h1>${pct >= 70 ? 'উত্তীর্ণ! মাঠের জন্য প্রস্তুত' : 'আরেকটু ঝালাই দরকার'}</h1><p class="muted">${bn(right)}/${bn(Q.length)} সঠিক</p></div>
        <h2>উত্তর পর্যালোচনা</h2>
        ${Q.map((q, k) => `<details class="panel review ${ans[k] === q.a ? 'ok' : 'bad'}"><summary>${ans[k] === q.a ? '✅' : '❌'} ${esc(q.q)}</summary>
          <div class="case small">${esc(q.c)}</div>
          <p class="small">${ans[k] === undefined ? 'উত্তর দাওনি' : `তোমার উত্তর: ${esc(q.o[ans[k]])}`}<br><b>সঠিক: ${esc(q.o[q.a])}</b></p><div class="model">${esc(q.e)}</div></details>`).join('')}
        <div class="row"><button class="btn grow" id="ag">আবার দাও</button><a class="btn ghost grow" href="#/practice">অনুশীলন</a></div>`;
      $('#ag').onclick = pMock;
    }
    draw();
  }

  /* =========================================================
     ক্যালকুলেটর
     ========================================================= */
  const CALCS = [
    { id: 'elig', i: '🧮', n: 'যোগ্যতা যাচাই', d: 'Turnover, অভিজ্ঞতা ও Liquid Asset — শর্ত পূরণ হয় কিনা', who: 'দরদাতা' },
    { id: 'boq', i: '🧾', n: 'দর ও VAT হিসাব', d: 'আইটেম × একক দর, VAT/কর যোগ, মোট দর', who: 'দরদাতা' },
    { id: 'sec', i: '🛡️', n: 'জামানতের মেয়াদ', d: 'Closing + validity + অতিরিক্ত দিন = জামানতের শেষ তারিখ', who: 'দরদাতা' },
    { id: 'ld', i: '⏳', n: 'LD হিসাব', d: 'দেরির জরিমানা — দৈনিক হার ও সর্বোচ্চ সীমা', who: 'দুই পক্ষ' },
    { id: 'eval', i: '📊', n: 'দর তুলনা ও অস্বাভাবিক কম দর', d: 'প্রাক্কলনের সাথে তুলনা, ক্রম ও সতর্কতা', who: 'PE' },
    { id: 'qcbs', i: '🎯', n: 'QCBS স্কোর', d: 'কারিগরি ও আর্থিক মিলিত স্কোর ও র‍্যাঙ্ক', who: 'দুই পক্ষ' },
    { id: 'timeline', i: '🗓️', n: 'দরপত্রের সময়রেখা', d: 'প্রকাশ থেকে চুক্তি পর্যন্ত তারিখ পরিকল্পনা', who: 'PE' }
  ];
  function used(id) { const s = S(); if (!s.stats.calc[id]) { s.stats.calc[id] = 1; A.save(); A.addXP(5); A.checkBadges(); } else { s.stats.calc[id]++; A.persist(); } }
  const inp = (id, label, val, ph, type) => `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type || 'text'}" ${type ? '' : 'inputmode="decimal"'} value="${esc(val ?? '')}" placeholder="${esc(ph || '')}"></div>`;
  function pCalc(id) {
    if (!id) {
      A.view.innerHTML = `<a class="back" href="#/tools">← টুলস</a><h1>ক্যালকুলেটর</h1><p class="muted">দরদাতা ও PE — দুই পক্ষের রোজকার হিসাব। সব অফলাইনে চলে।</p>
        <div class="tiles">${CALCS.map(c => `<a class="tile" href="#/calc/${c.id}"><span class="ic">${c.i}</span><b>${c.n}</b><span>${c.d}</span><span class="chip" style="align-self:flex-start;margin-top:4px">${c.who}</span></a>`).join('')}</div>`;
      return;
    }
    const C = CALCS.find(c => c.id === id); if (!C) { location.hash = '#/calc'; return; }
    A.view.innerHTML = `<a class="back" href="#/calc">← ক্যালকুলেটর</a><h1>${C.i} ${C.n}</h1><p class="muted">${C.d}</p><div id="cb"></div><div id="cr" aria-live="polite"></div>
      <p class="small muted" style="margin-top:14px">হিসাব শেখা ও প্রস্তুতির সহায়ক; চূড়ান্ত সংখ্যা সবসময় দরপত্র দলিল ও প্রযোজ্য বিধি অনুযায়ী।</p>`;
    ({ elig: cElig, boq: cBoq, sec: cSec, ld: cLd, eval: cEval, qcbs: cQcbs, timeline: cTime })[id]($('#cb'), $('#cr'));
  }
  function live(box, fn, id) { let marked = false; box.addEventListener('input', () => { const ok = fn(); if (ok && !marked) { marked = true; used(id); } }); fn(); }
  function cElig(b, r) {
    b.innerHTML = `<div class="panel"><h3>দলিলের শর্ত</h3>${inp('rt', 'গড় বার্ষিক Turnover ন্যূনতম (টাকা)', '', 'যেমন: 42000000')}${inp('rs', 'নির্দিষ্ট অভিজ্ঞতা: প্রতিটি চুক্তির ন্যূনতম মূল্য (টাকা)', '', 'যেমন: 19500000')}${inp('rn', 'কতটি এমন চুক্তি লাগবে', '1')}${inp('rl', 'Liquid Asset / ঋণসীমা ন্যূনতম (টাকা)', '', 'যেমন: 4500000')}</div>
      <div class="panel"><h3>তোমার প্রতিষ্ঠান</h3>${inp('ft', 'শেষ বছরগুলোর Turnover — কমা দিয়ে (যেমন ৫ বছর)', '', '31000000, 45000000, 52000000, 39000000, 48000000')}${inp('fc', 'যোগ্য সময়ের মধ্যে অনুরূপ চুক্তির মূল্য — কমা দিয়ে', '', '21000000, 9000000')}${inp('fl', 'নগদ/Liquid Asset (টাকা)', '', '2000000')}${inp('fo', 'ব্যাংকের ঋণসীমা পত্র (টাকা, দলিল গ্রহণ করলে)', '', '3000000')}</div>`;
    const list = id => toEn($(id).value).split(/[,;\n]+/).map(x => num(x)).filter(x => x !== null);
    live(b, () => {
      const rt = num($('#rt').value), rs = num($('#rs').value), rn = num($('#rn').value) || 1, rl = num($('#rl').value);
      const ft = list('#ft'), fc = list('#fc'), fl = num($('#fl').value) || 0, fo = num($('#fo').value) || 0;
      const rows = [];
      if (rt !== null && ft.length) { const avg = ft.reduce((a, c) => a + c, 0) / ft.length; rows.push(['গড় Turnover', tk(rt), `${tk(avg)} (${bn(ft.length)} বছরের গড়)`, avg >= rt ? 'ok' : 'no']); }
      if (rs !== null && fc.length) { const q = fc.filter(x => x >= rs).length; rows.push(['নির্দিষ্ট অভিজ্ঞতা', `${bn(rn)}টি ≥ ${tk(rs)}`, `${bn(q)}টি যোগ্য চুক্তি`, q >= rn ? 'ok' : 'no']); }
      if (rl !== null) { const tot = fl + fo; rows.push(['Liquid Asset', tk(rl), `${tk(fl)} + ঋণসীমা ${tk(fo)} = ${tk(tot)}`, tot >= rl ? (fo && fl < rl ? 'warn' : 'ok') : 'no']); }
      if (!rows.length) { r.innerHTML = '<div class="panel empty">শর্ত ও তোমার সংখ্যা লিখলে ফল এখানে দেখাবে।</div>'; return false; }
      const anyNo = rows.some(x => x[3] === 'no'), anyW = rows.some(x => x[3] === 'warn');
      r.innerHTML = `<div class="panel"><div class="tbl"><table><tr><th>শর্ত</th><th>চাওয়া</th><th>তোমার</th><th></th></tr>${rows.map(x => `<tr><td>${x[0]}</td><td>${x[1]}</td><td>${x[2]}</td><td>${x[3] === 'ok' ? '✅' : x[3] === 'warn' ? '⚠️' : '❌'}</td></tr>`).join('')}</table></div>
        ${anyW ? '<p class="small">⚠️ ঋণসীমা যোগ করে শর্ত পূরণ হচ্ছে — দলিল এটা গ্রহণ করে কিনা আর পত্রটি নির্ধারিত ফরম্যাটে Closing-এর আগে আছে কিনা নিশ্চিত হও।</p>' : ''}</div>
        <div class="verdict ${anyNo ? 'no' : anyW ? 'maybe' : 'go'}">${anyNo ? '❌ অন্তত একটি অপরিহার্য শর্ত পূরণ হচ্ছে না' : anyW ? '⚠️ শর্তসাপেক্ষে পূরণ' : '✅ এই শর্তগুলো পূরণ হচ্ছে'}</div>`;
      return true;
    }, 'elig');
  }
  function cBoq(b, r) {
    let rows = [{ n: '', q: '', p: '' }, { n: '', q: '', p: '' }, { n: '', q: '', p: '' }];
    const draw = () => {
      b.innerHTML = `<div class="panel"><div class="boq-rows">${rows.map((x, i) => `<div class="boq-row"><input data-i="${i}" data-f="n" type="text" placeholder="আইটেম" value="${esc(x.n)}"><input data-i="${i}" data-f="q" type="text" inputmode="decimal" placeholder="পরিমাণ" value="${esc(x.q)}"><input data-i="${i}" data-f="p" type="text" inputmode="decimal" placeholder="একক দর" value="${esc(x.p)}"></div>`).join('')}</div>
        <button class="btn ghost block" id="add">+ আইটেম যোগ করো</button></div>
        <div class="panel">${inp('vat', 'VAT (%) — দলিল অনুযায়ী দরের ভেতরে ধরতে হলে', '15')}${inp('ait', 'আয়কর/AIT (%) — দলিল অনুযায়ী', '5')}
        <div class="setting"><div><b>একক দরে কর আগেই ধরা আছে?</b><div class="small muted">চালু থাকলে নিচে কর আলাদা যোগ হবে না, শুধু ভেতরের অংশ দেখাবে</div></div><label class="switch"><input type="checkbox" id="inc"><i></i></label></div></div>`;
      $('#add').onclick = () => { rows.push({ n: '', q: '', p: '' }); draw(); calc(); };
      $$('.boq-row input').forEach(x => x.oninput = () => { rows[+x.dataset.i][x.dataset.f] = x.value; });
      b.oninput = calc; calc();
    };
    let marked = false;
    function calc() {
      const items = rows.map(x => ({ n: x.n || 'আইটেম', a: (num(x.q) || 0) * (num(x.p) || 0) })).filter(x => x.a > 0);
      const sub = items.reduce((s, x) => s + x.a, 0), vat = num($('#vat').value) || 0, ait = num($('#ait').value) || 0, inc = $('#inc').checked;
      if (!sub) { r.innerHTML = '<div class="panel empty">পরিমাণ ও একক দর লিখলে মোট দেখাবে।</div>'; return; }
      if (!marked) { marked = true; used('boq'); }
      const taxPct = vat + ait;
      const base = inc ? sub / (1 + taxPct / 100) : sub, tax = inc ? sub - base : sub * taxPct / 100, total = inc ? sub : sub + tax;
      r.innerHTML = `<div class="panel"><div class="tbl"><table>${items.map(x => `<tr><td>${esc(x.n)}</td><td style="text-align:right">${tk(x.a)}</td></tr>`).join('')}
        <tr><td><b>উপমোট</b></td><td style="text-align:right"><b>${tk(sub)}</b></td></tr>
        <tr><td>${inc ? 'এর ভেতরে কর' : 'কর যোগ'} (${bn(taxPct)}%)</td><td style="text-align:right">${tk(tax)}</td></tr>
        <tr><td>${inc ? 'কর বাদে মূল দর' : ''}</td><td style="text-align:right">${inc ? tk(base) : ''}</td></tr>
        <tr class="tot"><td><b>উদ্ধৃত মোট দর</b></td><td style="text-align:right"><b>${tk(total)}</b></td></tr></table></div>
        <p class="small muted">কর দরের ভেতরে নাকি আলাদা — TDS/BOQ-এর নির্দেশনাই চূড়ান্ত। কথায় ও অঙ্কে লেখা দর মিলিয়ে নিও।</p></div>`;
    }
    draw();
  }
  function cSec(b, r) {
    const d0 = new Date(); d0.setDate(d0.getDate() + 14);
    b.innerHTML = `<div class="panel">${inp('cd', 'Closing-এর তারিখ', d0.toLocaleDateString('en-CA'), '', 'date')}${inp('vd', 'Tender validity (দিন, TDS থেকে)', '120')}${inp('xd', 'জামানতের অতিরিক্ত মেয়াদ (দিন, TDS থেকে — প্রায়ই ২৮)', '28')}${inp('am', 'জামানতের অঙ্ক (টাকা)', '', 'যেমন: 120000')}</div>`;
    live(b, () => {
      const cd = new Date($('#cd').value), vd = num($('#vd').value), xd = num($('#xd').value) || 0, am = num($('#am').value);
      if (isNaN(cd) || vd === null) { r.innerHTML = ''; return false; }
      const ve = addDays(cd, vd), se = addDays(cd, vd + xd);
      r.innerHTML = `<div class="panel"><div class="kv"><span>Tender validity শেষ</span><b>${dBn(ve)}</b></div><div class="kv"><span>জামানতের মেয়াদ অন্তত</span><b>${dBn(se)} (Closing থেকে ${bn(vd + xd)} দিন)</b></div>${am ? `<div class="kv"><span>অঙ্ক</span><b>${tk(am)}</b></div>` : ''}</div>
        <div class="panel"><h3>ব্যাংককে যা লিখিত দেবে</h3><ul><li>Beneficiary: TDS-এ লেখা PE-র নাম ও পদবি — হুবহু</li><li>অঙ্ক: ${am ? tk(am) : 'TDS অনুযায়ী'} (অঙ্কে ও কথায়)</li><li>মেয়াদ: অন্তত ${dBn(se)} পর্যন্ত</li><li>দরপত্রের নাম, Tender ID ও প্যাকেজ নম্বর</li></ul>
        <button class="btn ghost block" id="cpb">ব্যাংকের জন্য কপি করো</button></div>`;
      $('#cpb').onclick = () => A.copy(`Tender Security তথ্য\nঅঙ্ক: ${am ? tk(am) : '-'}\nমেয়াদ অন্তত: ${se.toLocaleDateString('en-GB')} (Closing থেকে ${vd + xd} দিন)\nBeneficiary: [TDS-এ লেখা PE-র নাম হুবহু]\nTender ID / Package: [ ]`);
      return true;
    }, 'sec');
  }
  function cLd(b, r) {
    b.innerHTML = `<div class="panel">${inp('cv', 'চুক্তিমূল্য (টাকা)', '', 'যেমন: 5000000')}${inp('rate', 'LD হার — প্রতিদিন চুক্তিমূল্যের কত % (PCC থেকে)', '0.10')}${inp('cap', 'সর্বোচ্চ সীমা (% , PCC থেকে)', '10')}${inp('dd', 'দেরি (দিন)', '', 'যেমন: 25')}${inp('part', 'দেরি অংশের মূল্য (ঐচ্ছিক — PCC-তে শুধু দেরি অংশের ওপর LD হলে)', '', 'খালি রাখলে পুরো চুক্তিমূল্য')}</div>`;
    live(b, () => {
      const cv = num($('#cv').value), rate = num($('#rate').value), cap = num($('#cap').value), dd = num($('#dd').value), part = num($('#part').value);
      if (!cv || rate === null || !dd) { r.innerHTML = ''; return false; }
      const base = part || cv, raw = base * rate / 100 * dd, mx = cap !== null ? cv * cap / 100 : Infinity, ld = Math.min(raw, mx);
      const capDays = cap !== null ? Math.ceil(mx / (base * rate / 100)) : null;
      r.innerHTML = `<div class="panel"><div class="kv"><span>হিসাব</span><b>${tk(base)} × ${bn(rate)}% × ${bn(dd)} দিন</b></div><div class="kv"><span>LD</span><b>${tk(ld)}${raw > mx ? ' (সর্বোচ্চ সীমায় আটকে গেছে)' : ''}</b></div>
        ${capDays ? `<div class="kv"><span>সর্বোচ্চ সীমায় পৌঁছাবে</span><b>${bn(capDays)} দিন দেরিতে</b></div>` : ''}</div>
        <div class="verdict ${raw > mx ? 'no' : ld > cv * 0.05 ? 'maybe' : 'go'}">${raw > mx ? 'সীমা ছুঁয়েছে — PE চুক্তি বাতিলের কথাও বিবেচনা করতে পারে (শর্ত অনুযায়ী)' : `লাভ থেকে কাটবে চুক্তিমূল্যের ${fx(ld / cv * 100)}%`}</div>`;
      return true;
    }, 'ld');
  }
  function cEval(b, r) {
    let rows = [{ n: 'ক', p: '', c: '', ok: true }, { n: 'খ', p: '', c: '', ok: true }, { n: 'গ', p: '', c: '', ok: true }];
    const draw = () => {
      b.innerHTML = `<div class="panel">${inp('est', 'প্রাক্কলিত ব্যয় (টাকা)', '', 'যেমন: 2175000')}${inp('thr', 'কত % কম হলে “অস্বাভাবিক কম” সন্দেহ? (নিজস্ব সতর্কসীমা)', '25')}</div>
        <div class="panel"><div class="small muted" style="margin-bottom:6px">দরদাতা · উদ্ধৃত দর · সংশোধিত দর (গাণিতিক ভুল থাকলে) · responsive?</div>
        ${rows.map((x, i) => `<div class="eval-row"><input data-i="${i}" data-f="n" type="text" value="${esc(x.n)}" aria-label="নাম"><input data-i="${i}" data-f="p" type="text" inputmode="decimal" placeholder="উদ্ধৃত" value="${esc(x.p)}"><input data-i="${i}" data-f="c" type="text" inputmode="decimal" placeholder="সংশোধিত" value="${esc(x.c)}"><label class="switch" title="responsive"><input type="checkbox" data-i="${i}" data-f="ok" ${x.ok ? 'checked' : ''}><i></i></label></div>`).join('')}
        <button class="btn ghost block" id="add">+ দরদাতা যোগ করো</button></div>`;
      $('#add').onclick = () => { rows.push({ n: String.fromCharCode(2453 + rows.length), p: '', c: '', ok: true }); draw(); calc(); };
      $$('.eval-row input').forEach(x => x.oninput = x.onchange = () => { const k = x.dataset.f; rows[+x.dataset.i][k] = k === 'ok' ? x.checked : x.value; calc(); });
      $('#est').oninput = $('#thr').oninput = calc; calc();
    };
    let marked = false;
    function calc() {
      const est = num($('#est').value), thr = num($('#thr').value) || 25;
      const L = rows.map(x => ({ n: x.n || '?', p: num(x.p), c: num(x.c), ok: x.ok })).filter(x => x.p);
      if (!L.length) { r.innerHTML = '<div class="panel empty">দর লিখলে তুলনা দেখাবে।</div>'; return; }
      if (!marked) { marked = true; used('eval'); }
      L.forEach(x => { x.e = x.c || x.p; x.dev = est ? (x.e - est) / est * 100 : null; x.low = x.dev !== null && x.dev <= -thr; });
      const resp = L.filter(x => x.ok).sort((a, b) => a.e - b.e), non = L.filter(x => !x.ok);
      r.innerHTML = `<div class="panel"><div class="tbl"><table><tr><th>ক্রম</th><th>দরদাতা</th><th>মূল্যায়িত দর</th><th>প্রাক্কলন থেকে</th></tr>
        ${resp.map((x, k) => `<tr class="${x.low ? 'warnrow' : ''}"><td>${bn(k + 1)}</td><td>${esc(x.n)}${x.c && x.c !== x.p ? ' <span class="chip">সংশোধিত</span>' : ''}</td><td>${tk(x.e)}</td><td>${x.dev === null ? '—' : (x.dev >= 0 ? '+' : '') + fx(x.dev, 1) + '%'}${x.low ? ' ⚠️' : ''}</td></tr>`).join('')}
        ${non.map(x => `<tr class="muted"><td>—</td><td>${esc(x.n)}</td><td>${tk(x.e)}</td><td>non-responsive</td></tr>`).join('')}</table></div></div>
        ${resp.length ? `<div class="verdict ${resp[0].low ? 'maybe' : 'go'}">${resp[0].low ? `⚠️ সর্বনিম্ন দরদাতা “${esc(resp[0].n)}” প্রাক্কলনের ${fx(-resp[0].dev, 1)}% নিচে — লিখিত দর বিশ্লেষণ ও প্রমাণ চাও, তারপর দলিল অনুযায়ী সিদ্ধান্ত` : `সর্বনিম্ন মূল্যায়িত responsive দরদাতা: “${esc(resp[0].n)}” — এবার পোস্ট-কোয়ালিফিকেশন`}</div>` : '<div class="verdict no">কোনো responsive দরপত্র নেই</div>'}`;
    }
    draw();
  }
  function cQcbs(b, r) {
    let rows = [{ n: 'ক', t: '86', p: '6000000' }, { n: 'খ', t: '74', p: '5000000' }, { n: 'গ', t: '80', p: '5500000' }, { n: 'ঘ', t: '66', p: '4000000' }];
    const draw = () => {
      b.innerHTML = `<div class="panel"><div class="row">${inp('tw', 'কারিগরি ওজন (%)', '80')}${inp('pm', 'কারিগরি পাস নম্বর', '70')}</div></div>
        <div class="panel"><div class="small muted" style="margin-bottom:6px">প্রতিষ্ঠান · কারিগরি নম্বর (১০০-এ) · আর্থিক প্রস্তাব (টাকা)</div>
        ${rows.map((x, i) => `<div class="boq-row"><input data-i="${i}" data-f="n" type="text" value="${esc(x.n)}"><input data-i="${i}" data-f="t" type="text" inputmode="decimal" value="${esc(x.t)}"><input data-i="${i}" data-f="p" type="text" inputmode="decimal" value="${esc(x.p)}"></div>`).join('')}
        <button class="btn ghost block" id="add">+ প্রতিষ্ঠান যোগ করো</button></div>`;
      $('#add').onclick = () => { rows.push({ n: '', t: '', p: '' }); draw(); };
      $$('.boq-row input').forEach(x => x.oninput = () => { rows[+x.dataset.i][x.dataset.f] = x.value; calc(); });
      $('#tw').oninput = $('#pm').oninput = calc; calc();
    };
    let marked = false;
    function calc() {
      const tw = (num($('#tw').value) ?? 80) / 100, pm = num($('#pm').value) ?? 70;
      const L = rows.map(x => ({ n: x.n || '?', t: num(x.t), p: num(x.p) })).filter(x => x.t !== null && x.p);
      if (!L.length) { r.innerHTML = ''; return; }
      if (!marked) { marked = true; used('qcbs'); }
      const pass = L.filter(x => x.t >= pm), fail = L.filter(x => x.t < pm);
      const low = Math.min(...pass.map(x => x.p));
      pass.forEach(x => { x.f = low / x.p * 100; x.s = x.t * tw + x.f * (1 - tw); });
      pass.sort((a, b) => b.s - a.s);
      r.innerHTML = `<div class="panel"><div class="tbl"><table><tr><th>ক্রম</th><th>প্রতিষ্ঠান</th><th>কারিগরি</th><th>আর্থিক স্কোর</th><th>মিলিত</th></tr>
        ${pass.map((x, k) => `<tr class="${k === 0 ? 'winrow' : ''}"><td>${bn(k + 1)}</td><td>${esc(x.n)}</td><td>${fx(x.t, 0)} × ${fx(tw, 2)} = ${fx(x.t * tw)}</td><td>${fx(x.f)} × ${fx(1 - tw, 2)} = ${fx(x.f * (1 - tw))}</td><td><b>${fx(x.s)}</b></td></tr>`).join('')}
        ${fail.map(x => `<tr class="muted"><td>—</td><td>${esc(x.n)}</td><td>${fx(x.t, 0)} (পাস নম্বরের নিচে)</td><td colspan="2">আর্থিক প্রস্তাব খোলা হয় না</td></tr>`).join('')}</table></div>
        <p class="small muted">আর্থিক স্কোর = সর্বনিম্ন দর (শুধু উত্তীর্ণদের মধ্যে) ÷ ওই প্রতিষ্ঠানের দর × ১০০। RFP-তে ভিন্ন সূত্র থাকলে সেটিই প্রযোজ্য।</p></div>
        ${pass.length ? `<div class="verdict go">🏆 শীর্ষ: “${esc(pass[0].n)}” — মিলিত স্কোর ${fx(pass[0].s)}</div>` : '<div class="verdict no">কেউ কারিগরিতে উত্তীর্ণ হয়নি</div>'}`;
    }
    draw();
  }
  function cTime(b, r) {
    const STEPS = [['pub', 'বিজ্ঞপ্তি প্রকাশ', 0], ['pre', 'Pre-tender meeting (প্রকাশের পর)', 7], ['cl', 'Closing / Opening (প্রকাশের পর)', 21], ['ev', 'মূল্যায়ন সম্পন্ন (Opening-এর পর)', 14], ['ap', 'অনুমোদন (মূল্যায়নের পর)', 7], ['noa', 'NOA জারি (অনুমোদনের পর)', 2], ['ct', 'চুক্তি স্বাক্ষর (NOA-র পর)', 21], ['done', 'সরবরাহ/কাজ শেষ (চুক্তির পর)', 60]];
    b.innerHTML = `<div class="panel">${inp('t0', 'বিজ্ঞপ্তি প্রকাশের তারিখ', new Date().toLocaleDateString('en-CA'), '', 'date')}
      ${STEPS.slice(1).map(([k, n, d]) => inp('t-' + k, n + ' — দিন', String(d))).join('')}
      <p class="small muted">দিনগুলো উদাহরণ মাত্র। ন্যূনতম বিজ্ঞপ্তিকাল, মূল্যায়ন ও অনুমোদনের সময়সীমা পদ্ধতি ও মূল্যভেদে বিধিতে নির্ধারিত — সর্বশেষ PPR অনুযায়ী বসাও।</p></div>`;
    live(b, () => {
      let d = new Date($('#t0').value); if (isNaN(d)) { r.innerHTML = ''; return false; }
      const out = [[STEPS[0][1], new Date(d)]];
      STEPS.slice(1).forEach(([k, n]) => { d = addDays(d, num($('#t-' + k).value) || 0); out.push([n.split(' (')[0], new Date(d)]); });
      const total = Math.round((out[out.length - 1][1] - out[0][1]) / 864e5);
      const ctDays = Math.round((out[6][1] - out[0][1]) / 864e5);
      r.innerHTML = `<div class="panel"><ol class="flow">${out.map(([n, dt]) => `<li><b>${n}</b><br><span class="small muted">${dBn(dt)}</span></li>`).join('')}</ol>
        <div class="kv"><span>প্রকাশ থেকে চুক্তি</span><b>${bn(ctDays)} দিন</b></div><div class="kv"><span>প্রকাশ থেকে কাজ শেষ</span><b>${bn(total)} দিন</b></div></div>
        ${out[out.length - 1][1].getMonth() === 5 ? '<div class="verdict maybe">⚠️ কাজ শেষ হচ্ছে জুনে — অর্থবছরের শেষ; বিল পরিশোধে চাপ থাকে, আগে শুরু করার কথা ভাবো</div>' : ''}`;
      return true;
    }, 'timeline');
  }

  /* =========================================================
     হুক: হোম, অনুশীলন, টুলস
     ========================================================= */
  A.hooks.homeTop.push(() => {
    const s = S(), st = A.installState();
    const role = s.track.role, pct = role ? trackPct(role) : 0;
    const inst = st !== 'installed' && !s.settings.hideInstall ? `<div class="panel install-card" id="install-box"><div class="row"><span class="ic">📲</span><div class="grow"><b>মোবাইল ও কম্পিউটারে ইনস্টল করো</b><div class="small muted">আলাদা অ্যাপের মতো খুলবে, ইন্টারনেট ছাড়াও চলবে।</div></div></div>
      <div class="row" style="margin-top:12px"><button class="btn ghost" id="hide-install">পরে</button><button class="btn grow" data-install>${st === 'ready' ? 'এখনই ইনস্টল করো' : 'কীভাবে ইনস্টল করব?'}</button></div></div>` : '';
    return `${inst}
      <section class="v2-strip">
        <a href="#/path" class="v2c path"><span class="ic">🧭</span><b>প্রো পথ</b><span>${role ? `${V2.TRACKS[role].name.split(' (')[0]} · ${bn(pct)}%` : 'দরদাতা নাকি PE — বেছে নাও'}</span>${role ? `<i class="mini-bar"><i style="width:${pct}%"></i></i>` : ''}</a>
        <a href="#/lab" class="v2c"><span class="ic">🔬</span><b>বিজ্ঞপ্তি ল্যাব</b><span>যেকোনো বিজ্ঞপ্তি পেস্ট করে বোঝার পরীক্ষা</span></a>
        <a href="#/convo" class="v2c"><span class="ic">💬</span><b>কথোপকথন</b><span>বাস্তব পরিস্থিতিতে সিদ্ধান্ত</span></a>
        <a href="#/mock" class="v2c"><span class="ic">📜</span><b>কেস পরীক্ষা</b><span>${s.stats.mockBest !== null ? `সেরা ${bn(s.stats.mockBest)}%` : 'বাস্তব হিসাব ও সিদ্ধান্ত'}</span></a>
      </section>`;
  });
  // হোমের "পরে" বোতাম
  document.addEventListener('click', e => { if (e.target && e.target.id === 'hide-install') { S().settings.hideInstall = true; A.save(); A.route(); } });
  A.hooks.practiceTiles.push(() => `
    <a class="tile wide feature" href="#/convo"><span class="ic">💬</span><div><b>কথোপকথন সিমুলেটর</b><br><span>ক্লায়েন্ট, ব্যাংক, PE অফিস, TEC সভা — ${bn(V2.CONVOS.length)}টি বাস্তব পরিস্থিতি</span></div></a>
    <a class="tile" href="#/game/seq"><span class="ic">🧩</span><b>ধাপ সাজাও</b><span>প্রক্রিয়ার ধাপ সঠিক ক্রমে · জয় ${bn(S().stats.seqWins || 0)}</span></a>
    <a class="tile" href="#/game/sprint"><span class="ic">⏱️</span><b>টিকবে নাকি বাতিল?</b><span>৬০ সেকেন্ডের মূল্যায়ন দৌড় · সেরা ${bn(S().stats.sprintBest || 0)}</span></a>
    <a class="tile" href="#/game/boq"><span class="ic">🧾</span><b>BOQ-এর ভুল ধরো</b><span>গাণিতিক সংশোধনের খেলা · জয় ${bn(S().stats.boqWins || 0)}</span></a>
    <a class="tile" href="#/mock"><span class="ic">📜</span><b>বাস্তব কেস পরীক্ষা</b><span>১২ প্রশ্ন, ১৫ মিনিট${S().stats.mockBest !== null ? ` · সেরা ${bn(S().stats.mockBest)}%` : ''}</span></a>`);
  A.hooks.toolsTiles.push(() => `
    <a class="tile wide feature" href="#/lab"><span class="ic">🔬</span><div><b>বিজ্ঞপ্তি ল্যাব</b><br><span>যেকোনো দরপত্র বিজ্ঞপ্তি পেস্ট করো → বোঝার পরীক্ষা → লাইন ধরে বাংলা বিশ্লেষণ · ${bn(S().stats.lab || 0)}টি সম্পন্ন</span></div></a>
    <a class="tile wide" href="#/calc"><span class="ic">🧮</span><div><b>ক্যালকুলেটর</b><br><span>যোগ্যতা, দর ও VAT, জামানতের মেয়াদ, LD, দর তুলনা, QCBS, সময়রেখা</span></div></a>`);

  A.page('path', pPath, 'path');
  A.page('convo', pConvo, 'practice');
  A.page('game', pGame, 'practice');
  A.page('mock', pMock, 'practice');
  A.page('calc', pCalc, 'tools');
})();
