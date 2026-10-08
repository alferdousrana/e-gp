/* বিজ্ঞপ্তি ল্যাব — যেকোনো দরপত্র বিজ্ঞপ্তি পেস্ট করো → বোঝার পরীক্ষা → পূর্ণ বিশ্লেষণ
   সম্পূর্ণ অফলাইনে চলে (নিয়মভিত্তিক পার্সার, কোনো সার্ভার লাগে না)। */
(function () {
  'use strict';
  const A = window.APP, V2 = window.V2;
  const { $, $$, esc, bn, shuffle, KEYS } = A;
  const BN = '০১২৩৪৫৬৭৮৯';
  const toEn = s => String(s || '').replace(/[০-৯]/g, d => BN.indexOf(d));
  const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const MON_BN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  const MON_BN_RE = { 'জানুয়ারি': 0, 'জানুয়ারী': 0, 'ফেব্রুয়ারি': 1, 'ফেব্রুয়ারী': 1, 'মার্চ': 2, 'এপ্রিল': 3, 'মে': 4, 'জুন': 5, 'জুলাই': 6, 'আগস্ট': 7, 'সেপ্টেম্বর': 8, 'অক্টোবর': 9, 'নভেম্বর': 10, 'ডিসেম্বর': 11 };

  /* ---------------- পার্সার ---------------- */
  const FIELDS = [
    { k: 'ministry', l: 'মন্ত্রণালয় / বিভাগ', en: 'Ministry, Division', re: [/^ministry/i, /মন্ত্রণালয়/] },
    { k: 'org', l: 'সংস্থা / অধিদপ্তর', en: 'Organization / Agency', re: [/^organi[sz]ation/i, /^agency/i, /^অধিদপ্তর/, /^সংস্থা/] },
    { k: 'pe', l: 'ক্রয়কারী (PE)', en: 'Procuring Entity Name', re: [/procuring entity name/i, /^procuring entity$/i, /ক্রয়কারী\s*(সংস্থা|কার্যালয়|প্রতিষ্ঠান)?\s*(র)?\s*(নাম)?$/] },
    { k: 'district', l: 'জেলা', en: 'Procuring Entity District', re: [/procuring entity district/i, /^district/i, /^জেলা/] },
    { k: 'nature', l: 'ক্রয়ের ধরন', en: 'Invitation for / Procurement Nature', re: [/^invitation for/i, /procurement nature/i, /ক্রয়ের\s*(ধরন|প্রকৃতি)/] },
    { k: 'type', l: 'জাতীয় / আন্তর্জাতিক', en: 'Procurement Type', re: [/procurement type/i] },
    { k: 'method', l: 'ক্রয় পদ্ধতি', en: 'Procurement Method', re: [/procurement method/i, /ক্রয়\s*পদ্ধতি/] },
    { k: 'tid', l: 'Tender ID', en: 'Tender/Proposal ID', re: [/tender\s*\/?\s*proposal\s*id/i, /^tender\s*id/i, /^proposal\s*id/i, /(টেন্ডার|দরপত্র)\s*আইডি/] },
    { k: 'appid', l: 'APP ID', en: 'App ID', re: [/^app\s*id/i] },
    { k: 'ref', l: 'স্মারক / রেফারেন্স নং', en: 'Invitation Ref No.', re: [/ref(erence)?\.?\s*no/i, /স্মারক/] },
    { k: 'pkg', l: 'প্যাকেজ নং', en: 'Package No.', re: [/package\s*no/i, /প্যাকেজ\s*(নং|নম্বর)/] },
    { k: 'title', l: 'প্যাকেজের নাম', en: 'Package Name', re: [/package\s*name/i, /(কাজের|প্যাকেজের)\s*নাম/] },
    { k: 'pub', l: 'প্রকাশের তারিখ', en: 'Publication Date', re: [/publication\s*date/i, /প্রকাশের\s*তারিখ/] },
    { k: 'sell', l: 'দলিল বিক্রয়ের শেষ সময়', en: 'Last Selling Date', re: [/last\s*selling/i, /বিক্রয়ের\s*শেষ/] },
    { k: 'close', l: 'জমার শেষ সময় (Closing)', en: 'Closing Date and Time', re: [/closing\s*date/i, /(দাখিলের|জমার|গ্রহণের)\s*শেষ/] },
    { k: 'open', l: 'খোলার সময় (Opening)', en: 'Opening Date and Time', re: [/opening\s*date/i, /খোলার\s*(তারিখ|সময়)/] },
    { k: 'fund', l: 'অর্থের উৎস', en: 'Budget and Source of Funds', re: [/source\s*of\s*fund/i, /অর্থের\s*উৎস/] },
    { k: 'project', l: 'প্রকল্প', en: 'Project Name', re: [/^project\s*name/i, /প্রকল্পের\s*নাম/] },
    { k: 'elig', l: 'দরদাতার যোগ্যতা', en: 'Eligibility of Tenderer', re: [/eligibility/i, /experience,\s*resources/i, /যোগ্যতা/] },
    { k: 'desc', l: 'সংক্ষিপ্ত বিবরণ', en: 'Brief Description', re: [/brief\s*description/i, /সংক্ষিপ্ত\s*বিবরণ/] },
    { k: 'docprice', l: 'দরপত্র দলিলের মূল্য', en: 'Price of Tender Document', re: [/price\s*of\s*tender/i, /দলিলের\s*মূল্য/] },
    { k: 'security', l: 'Tender Security (জামানত)', en: 'Tender Security Amount', re: [/tender\s*security/i, /(দরপত্র|টেন্ডার)\s*জামানত/, /^জামানত/] },
    { k: 'location', l: 'স্থান', en: 'Location', re: [/^location/i, /(কাজের|সরবরাহের)\s*স্থান/] },
    { k: 'completion', l: 'সম্পাদনের সময়', en: 'Completion Time', re: [/completion\s*time/i, /(সমাপ্তির|সম্পাদনের|সরবরাহের)\s*সময়/] },
    { k: 'official', l: 'আহ্বানকারী কর্মকর্তা', en: 'Designation of Official Inviting', re: [/designation\s*of\s*official/i, /আহ্বানকারী/] },
    { k: 'other', l: 'অন্যান্য তথ্য', en: 'Other Details', re: [/^other\s*details/i] }
  ];
  const labelOf = k => (FIELDS.find(f => f.k === k) || {}).l || k;

  function parseDate(s) {
    s = toEn(s);
    const bnPM = /(দুপুর|বিকাল|বিকেল|সন্ধ্যা|রাত)/.test(s);
    let m = s.match(/(\d{1,2})[\s\-\/.]+([A-Za-z]{3,9})[\s\-\/.,]+(\d{4})(?:[^\d]{1,12}(\d{1,2})[:.](\d{2})\s*(am|pm)?)?/i);
    if (m && MON[m[2].slice(0, 3).toLowerCase()] !== undefined) return mk(+m[3], MON[m[2].slice(0, 3).toLowerCase()], +m[1], m[4], m[5], m[6]);
    m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?/);
    if (m) return mk(+m[1], +m[2] - 1, +m[3], m[4], m[5]);
    m = s.match(/(\d{1,2})[\-\/.](\d{1,2})[\-\/.](\d{2,4})(?:[^\d]{1,12}(\d{1,2})[:.](\d{2})\s*(am|pm)?)?/i);
    if (m) { let y = +m[3]; if (y < 100) y += 2000; return mk(y, +m[2] - 1, +m[1], m[4], m[5], m[6]); }
    for (const [name, mi] of Object.entries(MON_BN_RE)) {
      const r = new RegExp('(\\d{1,2})\\s*' + name + ',?\\s*(\\d{4})(?:[^\\d]{1,12}(\\d{1,2})[:.](\\d{2}))?');
      const b = s.match(r); if (b) return mk(+b[2], mi, +b[1], b[3], b[4]);
    }
    return null;
    function mk(y, mo, d, h, mi, ap) {
      let H = h ? +h : null;
      if (H !== null && !ap && bnPM && H < 12 && !(/দুপুর/.test(s) && H >= 11)) H += 12;
      if (H !== null && ap) { if (/pm/i.test(ap) && H < 12) H += 12; if (/am/i.test(ap) && H === 12) H = 0; }
      const dt = new Date(y, mo, d, H ?? 0, mi ? +mi : 0);
      if (isNaN(dt) || y < 2000 || y > 2100) return null;
      dt.hasTime = H !== null; return dt;
    }
  }
  function parseAmount(s) {
    s = toEn(s).replace(/[\u00A0\s]+/g, ' ');
    const m = s.match(/(\d[\d,]*(?:\.\d+)?)\s*(crore|কোটি|lakh|lac|লাখ|লক্ষ|million)?/i);
    if (!m) return null;
    let v = parseFloat(m[1].replace(/,/g, '')); if (isNaN(v)) return null;
    const u = (m[2] || '').toLowerCase();
    if (/crore|কোটি/.test(u)) v *= 1e7; else if (/lakh|lac|লাখ|লক্ষ/.test(u)) v *= 1e5; else if (/million/.test(u)) v *= 1e6;
    return Math.round(v);
  }
  const SEP = /\s*[:：]\s*|\t+|\s{3,}/;
  function parse(raw) {
    const text = String(raw || '').replace(/\r/g, '');
    const lines = text.split('\n').map(x => x.trim()).filter(Boolean);
    const out = {}, isLabel = s => FIELDS.some(f => f.re.some(r => r.test(s)));
    lines.forEach((ln, i) => {
      const sp = ln.search(SEP);
      let lab = sp > 0 ? ln.slice(0, sp) : ln, val = sp > 0 ? ln.slice(sp).replace(SEP, '').trim() : '';
      if (lab.length > 70) return;
      const f = FIELDS.find(F => F.re.some(r => r.test(lab.trim())));
      if (!f || out[f.k]) return;
      if (!val && lines[i + 1] && !isLabel(lines[i + 1].split(SEP)[0])) val = lines[i + 1];
      if (val) out[f.k] = val;
    });
    // মুক্ত লেখা (পত্রিকার বিজ্ঞপ্তি) থেকে বিকল্প খোঁজ
    const T = toEn(text);
    if (!out.tid) { const m = T.match(/(?:tender|proposal|টেন্ডার|দরপত্র)[\s\/a-z]*?(?:id|আইডি)\s*(?:no\.?|নং|নম্বর)?\s*[:：\-]?\s*(\d{5,8})/i); if (m) out.tid = m[1]; }
    if (!out.method) { const m = T.match(/(open tendering method|limited tendering method|request for quotation|direct procurement method|two[\s-]stage tendering|one[\s-]stage two[\s-]envelope|quality and cost based selection|quality based selection|least cost selection|fixed budget selection|single source selection|\b(OTM|LTM|RFQM?|DPM|TSTM|OSTETM|QCBS|QBS|LCS|FBS|SSS|SBCQ|CQS)\b|উন্মুক্ত দরপত্র|সীমিত দরপত্র|কোটেশন)/i); if (m) out.method = m[0]; }
    if (!out.nature) { const m = T.match(/\b(goods|works|physical services|intellectual and professional services|consultancy)\b|(?<![\u0980-\u09FF])(পণ্য|কার্য|ভৌত সেবা|পরামর্শক সেবা)(?![\u0980-\u09FF])/i); if (m) out.nature = m[0]; }
    if (!out.security) { const m = T.match(/(?:tender security|জামানত)[^\n]{0,40}?(?:tk\.?|৳|টাকা)?\s*([\d,]+(?:\.\d+)?\s*(?:crore|lakh|কোটি|লাখ)?)/i); if (m) out.security = m[1]; }
    if (!out.close) {
      const m = T.match(/(?:closing|last date of submission|শেষ\s*(?:তারিখ|সময়))[^\n]{0,30}?(\d{1,2}[\s\-\/.]+(?:[a-z]{3,9}|\d{1,2})[\s\-\/.,]+\d{2,4}[^\n]{0,12})/i);
      if (m) out.close = m[1];
    }
    if (!out.title) { const first = lines.find(l => l.length > 25 && l.length < 200 && /supply|construction|procurement|improvement|development|repair|services|সরবরাহ|নির্মাণ|উন্নয়ন|মেরামত|সেবা/i.test(l)); if (first) out.title = first.replace(/^[\-•*\d.\s]+/, ''); }
    return interpret(out, text);
  }
  function interpret(f, text) {
    const r = { f, text };
    const lowAll = (f.method || '') + ' ' + text;
    const M = [
      ['OTM', /open tendering|\bOTM\b|উন্মুক্ত দরপত্র/i], ['LTM', /limited tendering|\bLTM\b|সীমিত দরপত্র/i], ['RFQM', /request for quotation|\bRFQM?\b|কোটেশন/i],
      ['DPM', /direct procurement|\bDPM\b|সরাসরি ক্রয়/i], ['TSTM', /two[\s-]stage tender|\bTSTM\b/i], ['OSTETM', /one[\s-]stage two[\s-]envelope|\bOSTETM\b/i],
      ['QCBS', /quality and cost|\bQCBS\b/i], ['QBS', /quality based selection|\bQBS\b/i], ['LCS', /least cost selection|\bLCS\b/i], ['FBS', /fixed budget|\bFBS\b/i],
      ['SSS', /single source|\bSSS\b/i], ['SBCQ', /consultants?['’]? qualification|\bSBCQ\b|\bCQS\b/i]
    ];
    const mm = M.find(([, re]) => re.test(f.method || '')) || M.find(([, re]) => re.test(lowAll));
    r.method = mm ? mm[0] : null;
    const nat = (f.nature || '').toLowerCase();
    r.nature = /physical/.test(nat) || /ভৌত/.test(nat) ? 'physical' : /intellectual|professional|consult|eoi|expression of interest|পরামর্শ/.test(nat) ? 'consult' : /works|কার্য|নির্মাণ/.test(nat) ? 'works' : /goods|পণ্য/.test(nat) ? 'goods' : /service|সেবা/.test(nat) ? 'physical' : null;
    if (!r.nature && (f.title || f.desc)) {
      const t = ((f.title || '') + ' ' + (f.desc || '')).toLowerCase();
      r.nature = /construct|improvement|rehabilit|repair|renovation|road|bridge|culvert|building|নির্মাণ|মেরামত|সংস্কার|স্থাপন|সড়ক|রাস্তা|ভবন|সেতু|কালভার্ট|উন্নয়ন/.test(t) ? 'works'
        : /security service|cleaning|guard|maintenance service|নিরাপত্তা সেবা|পরিচ্ছন্নতা/.test(t) ? 'physical'
          : /consult|design and supervision|feasibility|study|পরামর্শক|সমীক্ষা/.test(t) ? 'consult'
            : /supply|procurement of|purchase|সরবরাহ|ক্রয়/.test(t) ? 'goods' : null;
    }
    if (r.method && ['QCBS', 'QBS', 'LCS', 'FBS', 'SBCQ'].includes(r.method)) r.nature = 'consult';
    r.eoi = /expression of interest|\bEOI\b|আগ্রহপত্র/i.test(text);
    ['pub', 'sell', 'close', 'open'].forEach(k => { r[k] = f[k] ? parseDate(f[k]) : null; });
    r.security = f.security ? parseAmount(f.security) : null;
    r.docprice = f.docprice ? parseAmount(f.docprice) : null;
    const now = new Date();
    r.daysLeft = r.close ? Math.ceil((r.close - now) / 864e5) : null;
    r.window = r.close && r.pub ? Math.round((r.close - r.pub) / 864e5) : null;
    // যোগ্যতার সংখ্যা
    const el = toEn((f.elig || '') + ' ' + (f.other || ''));
    r.req = [];
    const yrs = el.match(/(?:minimum|at least|ন্যূনতম)?\s*(\d{1,2})\s*(?:\(\w+\)\s*)?(?:years?|বছর)/i); if (yrs) r.req.push({ k: 'years', v: +yrs[1], t: `সাধারণ অভিজ্ঞতা ন্যূনতম ${bn(yrs[1])} বছর` });
    const amts = [...el.matchAll(/(?:tk\.?|৳)?\s*(\d[\d,]*(?:\.\d+)?)\s*(crore|lakh|lac|কোটি|লাখ)/gi)].map(x => ({ raw: x[0].trim(), v: parseAmount(x[0]) }));
    amts.forEach(a => r.req.push({ k: 'amt', v: a.v, t: `শর্তে টাকার অঙ্ক: ${money(a.v)} — কোনটি অভিজ্ঞতা, Turnover নাকি Liquid Asset, দলিলে মিলিয়ে নাও` }));
    if (/turnover/i.test(el)) r.req.push({ k: 'turn', t: 'গড় বার্ষিক Turnover-এর শর্ত আছে' });
    if (/liquid|line of credit|ঋণসীমা/i.test(el)) r.req.push({ k: 'liq', t: 'Liquid Asset / Line of Credit-এর শর্ত আছে' });
    if (/trade licen|tin|vat/i.test(el)) r.req.push({ k: 'docs', t: 'ট্রেড লাইসেন্স, TIN, VAT নিবন্ধন হালনাগাদ থাকতে হবে' });
    if (/minimum (?:rate|wage)|মজুরি/i.test(el)) r.req.push({ k: 'wage', t: 'ন্যূনতম মজুরির শর্ত — দরে কম মজুরি ধরা যাবে না' });
    r.vague = !f.elig || (/as per (the )?tender document/i.test(f.elig) && r.req.length === 0);
    r.lots = (text.match(/^\s*lot\s*no\.?\s*[:：]/gim) || []).length;
    const found = FIELDS.filter(x => f[x.k]).length;
    r.quality = found;
    return r;
  }

  /* ---------------- সহায়ক ---------------- */
  function money(v) {
    if (v === null || v === undefined) return '—';
    if (v >= 1e7) return '৳ ' + bn((v / 1e7).toFixed(2).replace(/\.?0+$/, '')) + ' কোটি';
    if (v >= 1e5) return '৳ ' + bn((v / 1e5).toFixed(2).replace(/\.?0+$/, '')) + ' লাখ';
    return '৳ ' + bn(v.toLocaleString('en-IN'));
  }
  const dfmt = d => d ? `${bn(d.getDate())} ${MON_BN[d.getMonth()]} ${bn(d.getFullYear())}${d.hasTime !== false ? `, ${bn(String(d.getHours()).padStart(2, '0'))}:${bn(String(d.getMinutes()).padStart(2, '0'))}` : ''}` : '—';
  const NATURE = { goods: 'পণ্য (Goods)', works: 'কার্য (Works)', physical: 'ভৌত সেবা (Physical Services)', consult: 'বুদ্ধিবৃত্তিক ও পেশাগত সেবা (Consultancy)' };
  const METHOD = {
    OTM: ['উন্মুক্ত দরপত্র পদ্ধতি', 'যোগ্য যেকোনো প্রতিষ্ঠান অংশ নিতে পারে। প্রতিযোগিতা বেশি, তাই দর ও কাগজপত্র দুটোই নিখুঁত হতে হবে।'],
    LTM: ['সীমিত দরপত্র পদ্ধতি', 'শুধু নির্দিষ্ট তালিকাভুক্ত বা শর্তে নির্ধারিত প্রতিষ্ঠান অংশ নিতে পারে। আগে দেখো তুমি সেই তালিকায় বা শর্তে পড়ো কিনা।'],
    RFQM: ['কোটেশন পদ্ধতি (RFQ)', 'ছোট মূল্যের দ্রুত ক্রয়। কাগজপত্র তুলনামূলক কম, সময়ও কম — দ্রুত সিদ্ধান্ত নাও।'],
    DPM: ['সরাসরি ক্রয় পদ্ধতি', 'বিশেষ পরিস্থিতিতে নির্দিষ্ট প্রতিষ্ঠান থেকে ক্রয়। সাধারণ প্রতিযোগিতা নেই।'],
    TSTM: ['দুই ধাপের দরপত্র', 'প্রথমে কারিগরি প্রস্তাব ও আলোচনা, পরে চূড়ান্ত দর। জটিল কারিগরি ক্রয়ে ব্যবহৃত।'],
    OSTETM: ['এক ধাপ দুই খাম পদ্ধতি', 'কারিগরি ও আর্থিক প্রস্তাব আলাদা খামে; কারিগরিতে উত্তীর্ণদের আর্থিক খাম খোলে।'],
    QCBS: ['গুণ ও মূল্যভিত্তিক নির্বাচন (QCBS)', 'কারিগরি নম্বর ও দরের মিলিত স্কোরে জয়। শুধু কম দামে জেতা যায় না — কারিগরি প্রস্তাবই মূল।'],
    QBS: ['গুণভিত্তিক নির্বাচন (QBS)', 'শুধু কারিগরি গুণে র‍্যাঙ্কিং; শীর্ষ প্রতিষ্ঠানের সাথে দর আলোচনা।'],
    LCS: ['সর্বনিম্ন ব্যয়ভিত্তিক নির্বাচন (LCS)', 'কারিগরিতে পাস করলে সর্বনিম্ন দর জেতে।'],
    FBS: ['নির্দিষ্ট বাজেটে নির্বাচন (FBS)', 'বাজেট জানানো থাকে; সেই বাজেটে সেরা কারিগরি প্রস্তাব জেতে।'],
    SSS: ['একক উৎস নির্বাচন', 'বিশেষ কারণে একটি প্রতিষ্ঠানের সাথে সরাসরি আলোচনা।'],
    SBCQ: ['পরামর্শকের যোগ্যতাভিত্তিক নির্বাচন', 'ছোট কাজে অভিজ্ঞতা ও যোগ্যতা দেখে নির্বাচন।']
  };
  const DICT = { computer: 'কম্পিউটার', desktop: 'ডেস্কটপ', laptop: 'ল্যাপটপ', printer: 'প্রিন্টার', road: ['সড়ক', 'রাস্তা'], culvert: 'কালভার্ট', security: ['নিরাপত্তা', 'সিকিউরিটি'], guard: ['প্রহরী', 'গার্ড'], hospital: 'হাসপাতাল', software: 'সফটওয়্যার', portal: 'পোর্টাল', app: 'অ্যাপ', mobile: 'মোবাইল', building: 'ভবন', construction: 'নির্মাণ', supply: 'সরবরাহ', repair: 'মেরামত', cleaning: ['পরিচ্ছন্নতা', 'পরিষ্কার'], furniture: 'আসবাব', vehicle: ['গাড়ি', 'যান'], medicine: 'ওষুধ', equipment: ['যন্ত্র', 'সরঞ্জাম'], school: ['স্কুল', 'বিদ্যালয়'], bridge: ['সেতু', 'ব্রিজ'], network: 'নেটওয়ার্ক', server: 'সার্ভার', land: 'ভূমি', training: 'প্রশিক্ষণ', carpeting: ['কার্পেটিং', 'পিচ'], improvement: 'উন্নয়ন', development: 'উন্নয়ন', service: 'সেবা', services: 'সেবা', civil: 'সিভিল', surgeon: 'সার্জন', upazila: 'উপজেলা', engineer: 'প্রকৌশলী', district: 'জেলা', superintendent: 'তত্ত্বাবধায়ক', project: 'প্রকল্প', director: 'পরিচালক', office: ['অফিস', 'কার্যালয়'], gazipur: 'গাজীপুর', tangail: 'টাঙ্গাইল', cumilla: 'কুমিল্লা', comilla: 'কুমিল্লা', dhaka: 'ঢাকা', chattogram: 'চট্টগ্রাম', chittagong: 'চট্টগ্রাম', khulna: 'খুলনা', rajshahi: 'রাজশাহী', sylhet: 'সিলেট', barishal: 'বরিশাল', rangpur: 'রংপুর', mymensingh: 'ময়মনসিংহ', narayanganj: 'নারায়ণগঞ্জ', bogura: 'বগুড়া', jashore: 'যশোর', lged: ['এলজিইডি', 'lged'], pwd: ['গণপূর্ত', 'pwd'], rhd: ['সওজ', 'rhd'] };
  const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'including', 'nos', 'office', 'example', 'supply', 'of', 'to', 'by', 'in', 'on', 'at', 'a', 'an', 'up', 'ch', 'bc']);
  function keyGroups(str, max) {
    const words = toEn(str || '').toLowerCase().match(/[a-z]{3,}|[\u0980-\u09FF]{3,}/g) || [];
    const g = [];
    words.forEach(w => { if (STOP.has(w) || g.some(x => x[0] === w)) return; const d = DICT[w]; g.push([w].concat(d ? [].concat(d) : [])); });
    return g.slice(0, max || 4);
  }

  /* ---------------- পাতা ---------------- */
  let R = null, role = 'tenderer', raw = '';
  function pLab(sub) {
    if (sub === 'go' && R) return drawRead();
    R = null;
    const S = A.S;
    A.view.innerHTML = `<a class="back" href="#/tools">← টুলস</a>
      <h1>বিজ্ঞপ্তি ল্যাব</h1>
      <p class="muted">e-GP, পত্রিকা বা যেকোনো জায়গা থেকে একটি দরপত্র বিজ্ঞপ্তির লেখা কপি করে এখানে পেস্ট করো। আগে তোমার বোঝার পরীক্ষা হবে, তারপর অ্যাপ পুরো বিশ্লেষণ দেখাবে — মিলিয়ে নিও কতটা ঠিক ধরেছিলে।</p>
      <div class="seg" role="tablist" aria-label="কার চোখে দেখবে">
        <button role="tab" data-role="tenderer" class="${role === 'tenderer' ? 'on' : ''}">🏢 দরদাতার চোখে</button>
        <button role="tab" data-role="pe" class="${role === 'pe' ? 'on' : ''}">🏛️ PE-র চোখে</button>
      </div>
      <div class="field"><label for="lab-in">বিজ্ঞপ্তির লেখা</label>
        <textarea id="lab-in" class="lab-in" placeholder="এখানে পেস্ট করো… যেমন:&#10;Tender/Proposal ID : 1187452&#10;Procurement Method : Open Tendering Method (OTM)&#10;Tender Closing Date and Time : 28-Oct-2026 12:00">${esc(raw)}</textarea>
        <small>লেখা শুধু এই ডিভাইসে বিশ্লেষণ হয়। ইংরেজি ও বাংলা — দুই ধরনের বিজ্ঞপ্তিই চলে।</small></div>
      <div class="row wrap"><button class="btn grow" id="lab-go">বোঝার পরীক্ষা শুরু করো</button><button class="btn ghost" id="lab-paste">📋 পেস্ট</button></div>
      <h3 style="margin-top:20px">হাতের কাছে বিজ্ঞপ্তি নেই? নমুনা দিয়ে শুরু করো</h3>
      <div class="chips-row">${V2.SAMPLES.map(s => `<button class="chip-btn" data-sample="${s.id}">${esc(s.t)}</button>`).join('')}</div>
      <p class="small muted">নমুনাগুলো e-GP বিজ্ঞপ্তির আদলে বানানো; নাম ও নম্বর কাল্পনিক।</p>
      ${S.labs.length ? `<h3 style="margin-top:18px">আগের বিশ্লেষণ</h3>${S.labs.slice(0, 10).map(l => `<button class="node" data-hist="${esc(l.id)}" style="width:100%;text-align:left"><div class="nt"><b>${esc(l.title || 'নামহীন বিজ্ঞপ্তি')}</b><span>${l.tid ? 'ID ' + esc(l.tid) + ' · ' : ''}${new Date(l.t).toLocaleDateString('bn-BD')}</span></div><span class="chip ${l.score >= 70 ? 'ok' : ''}">${bn(l.score)}%</span></button>`).join('')}` : ''}`;
    $$('[data-role]').forEach(b => b.onclick = () => { role = b.dataset.role; raw = $('#lab-in').value; pLab(); });
    $('#lab-paste').onclick = async () => { try { const t = await navigator.clipboard.readText(); $('#lab-in').value = t; } catch (e) { A.toast('এখানে লম্বা চাপ দিয়ে Paste করো'); $('#lab-in').focus(); } };
    $$('[data-sample]').forEach(b => b.onclick = () => {
      const s = V2.SAMPLES.find(x => x.id === b.dataset.sample);
      const d = off => { const x = new Date(); x.setDate(x.getDate() + off); return `${String(x.getDate()).padStart(2, '0')}-${'JanFebMarAprMayJunJulAugSepOctNovDec'.substr(x.getMonth() * 3, 3)}-${x.getFullYear()}`; };
      $('#lab-in').value = s.mk(d); A.sound('tap');
    });
    $$('[data-hist]').forEach(b => b.onclick = () => { const h = A.S.labs.find(x => x.id === b.dataset.hist); if (h && h.raw) { raw = h.raw; $('#lab-in').value = raw; A.toast('আগের বিজ্ঞপ্তি লোড হয়েছে — আবার পরীক্ষা দিতে পারো'); } });
    $('#lab-go').onclick = start;
  }
  function start() {
    raw = $('#lab-in').value.trim();
    if (raw.length < 40) { A.toast('পুরো বিজ্ঞপ্তির লেখা পেস্ট করো — অন্তত কয়েক লাইন'); return; }
    R = parse(raw);
    const qs = makeQuestions(R);
    if (qs.length < 3) {
      A.modal(`<h2>যথেষ্ট তথ্য পাওয়া যায়নি</h2><p>এই লেখা থেকে Tender ID, পদ্ধতি, তারিখ বা জামানতের মতো মূল তথ্য খুব কম পাওয়া গেছে (${bn(R.quality)}টি ঘর)। e-GP-তে বিজ্ঞপ্তির পুরো পাতা সিলেক্ট করে কপি করো, অথবা নিচে সরাসরি বিশ্লেষণ দেখো।</p>
        <div class="stack"><button class="btn block" id="m-an">যা পাওয়া গেছে তার বিশ্লেষণ দেখো</button><button class="btn ghost block" id="m-x">আবার পেস্ট করব</button></div>`, () => {
        $('#m-an').onclick = () => { A.closeModal(); drawAnalysis(null); };
        $('#m-x').onclick = A.closeModal;
      });
      return;
    }
    R.qs = qs; drawRead();
  }
  function drawRead() {
    A.view.innerHTML = `<a class="back" href="#/lab">← ল্যাব</a><h1>আগে নিজে পড়ো</h1>
      <p class="muted">মনোযোগ দিয়ে পড়ো: কে কিনছে, কী কিনছে, কোন পদ্ধতিতে, শেষ সময় কবে, জামানত কত। পরীক্ষার সময়ও বিজ্ঞপ্তি খোলা রাখা যাবে — কিন্তু আসল পেশাদার এক নজরে বলতে পারে!</p>
      <pre class="notice raw">${esc(raw)}</pre>
      <div style="height:12px"></div>
      <button class="btn block gold" id="lab-test">পড়া শেষ — ${bn(R.qs.length + 1)}টি প্রশ্নের পরীক্ষা দাও</button>
      <button class="btn ghost block" id="lab-skip" style="margin-top:10px">পরীক্ষা ছাড়াই বিশ্লেষণ দেখো</button>`;
    $('#lab-test').onclick = runTest;
    $('#lab-skip').onclick = () => drawAnalysis(null);
  }

  /* ---------------- প্রশ্ন তৈরি ---------------- */
  function opts(right, pool, n = 4) {
    const seen = new Set([right]); const o = [right];
    shuffle(pool).forEach(x => { if (o.length < n && x && !seen.has(x)) { seen.add(x); o.push(x); } });
    if (o.length < 2) return null;
    const sh = shuffle(o); return { o: sh, a: sh.indexOf(right) };
  }
  function mutateId(id) {
    const s = String(id), out = new Set();
    for (let t = 0; t < 20 && out.size < 3; t++) {
      const arr = s.split(''), i = 1 + Math.floor(Math.random() * (arr.length - 1));
      arr[i] = String((+arr[i] + 1 + Math.floor(Math.random() * 8)) % 10);
      const v = arr.join(''); if (v !== s) out.add(v);
    }
    return [...out];
  }
  function makeQuestions(r) {
    const f = r.f, Q = [];
    if (f.tid) {
      const tid = (toEn(f.tid).match(/\d{4,}/) || [f.tid.trim()])[0];
      const others = [f.appid, f.pkg, f.ref].filter(Boolean).map(x => (toEn(x).match(/\d{4,}/) || [x.trim().slice(0, 30)])[0]);
      const o = opts(tid, others.concat(mutateId(tid)));
      if (o) Q.push({ q: 'এই দরপত্রের <b>Tender/Proposal ID</b> কোনটি?', ...o, e: `সঠিক: <b>${esc(tid)}</b>। e-GP-তে এই নম্বর দিয়েই দরপত্র খোঁজা, প্রশ্ন করা ও জমা দেওয়া হয়।${f.appid ? ` ${esc(toEn(f.appid))} হলো App ID — বার্ষিক ক্রয় পরিকল্পনার (APP) নম্বর, দরপত্রের নয়।` : ''}` });
    }
    if (r.close) {
      const right = dfmt(r.close);
      const pool = [r.open && dfmt(r.open), r.pub && dfmt(r.pub), r.sell && dfmt(r.sell)].filter(x => x && x !== right);
      const alt = new Date(r.close); alt.setDate(alt.getDate() - 1); alt.hasTime = r.close.hasTime; pool.push(dfmt(alt));
      const alt2 = new Date(r.close); alt2.setDate(alt2.getDate() + 7); alt2.hasTime = r.close.hasTime; pool.push(dfmt(alt2));
      const o = opts(right, pool);
      if (o) Q.push({ q: 'দরপত্র <b>জমার শেষ সময় (Closing)</b> কখন?', ...o, e: `Closing: <b>${right}</b>। এর পর e-GP আর জমা নেয় না।${r.open ? ` Opening (${dfmt(r.open)}) হলো দরপত্র খোলার সময় — জমার নয়।` : ''}${r.sell ? ` দলিল কেনার শেষ সময় (${dfmt(r.sell)}) Closing-এর আগে, এটাও খেয়াল রাখো।` : ''}` });
    }
    if (r.daysLeft !== null && r.daysLeft >= 0) {
      const d = r.daysLeft, pool = [d + 3, Math.max(0, d - 3), d + 7, d * 2 + 1].filter(x => x !== d).map(x => bn(x) + ' দিন');
      const o = opts(bn(d) + ' দিন', pool);
      if (o) Q.push({ q: 'আজ থেকে জমার শেষ সময় পর্যন্ত হাতে <b>প্রায় কত দিন</b> আছে?', ...o, e: `প্রায় ${bn(d)} দিন। ${d < 7 ? 'খুব কম সময় — জামানত, দলিল সংগ্রহ আর অনুমোদন এখনই শুরু না করলে ঝুঁকি।' : d < 14 ? 'সময় মাঝারি — আজই Bid/No-Bid সিদ্ধান্ত নাও, ব্যাংকের কাজ আগে শুরু করো।' : 'হাতে যথেষ্ট সময়; তবু Clarification-এর শেষ তারিখ দলিলে দেখে নাও।'}` });
    }
    if (r.method && METHOD[r.method]) {
      const right = METHOD[r.method][0];
      const o = opts(right, Object.values(METHOD).map(x => x[0]));
      if (o) Q.push({ q: 'এই বিজ্ঞপ্তিতে <b>কোন ক্রয় পদ্ধতি</b> ব্যবহার হচ্ছে?', ...o, e: `<b>${right}</b> — ${METHOD[r.method][1]}` });
    }
    if (r.nature) {
      const o = opts(NATURE[r.nature], Object.values(NATURE));
      if (o) Q.push({ q: 'এটি <b>কী ধরনের ক্রয়</b>?', ...o, e: `<b>${NATURE[r.nature]}</b>। ${r.nature === 'goods' ? 'পণ্যে স্পেসিফিকেশন, সরবরাহ সময় ও ওয়ারেন্টি মূল।' : r.nature === 'works' ? 'কার্যে BOQ, Rate Analysis, যন্ত্রপাতি ও Liquid Asset মূল।' : r.nature === 'physical' ? 'ভৌত সেবায় জনবল, মজুরি ও সেবার মান মূল।' : 'পরামর্শক সেবায় অভিজ্ঞতা, পদ্ধতি ও মূল জনবল — কারিগরি গুণই প্রধান।'}` });
    }
    if (r.security) {
      const right = money(r.security);
      const pool = [r.docprice && money(r.docprice), money(r.security * 2), money(Math.round(r.security / 2)), money(r.security * 10)];
      const o = opts(right, pool);
      if (o) Q.push({ q: '<b>Tender Security</b> (দরপত্রের জামানত) কত?', ...o, e: `জামানত <b>${right}</b>।${r.docprice ? ` ${money(r.docprice)} হলো দরপত্র দলিলের মূল্য — জামানত নয়।` : ''} জামানতের ধরন ও মেয়াদ TDS-এ দেখে নিতে হবে।` });
    }
    if (f.pe && (f.org || f.ministry)) {
      const right = f.pe.trim().slice(0, 90);
      const o = opts(right, [f.org, f.ministry, f.official].filter(Boolean).map(x => x.trim().slice(0, 90)));
      if (o) Q.push({ q: 'কোন দপ্তর এই ক্রয় করছে — অর্থাৎ <b>Procuring Entity (PE)</b> কে?', ...o, e: `PE: <b>${esc(right)}</b>। মন্ত্রণালয় বা অধিদপ্তর হলো ওপরের স্তর; চুক্তি, প্রশ্নোত্তর ও মূল্যায়ন — সব হয় PE-র সাথে।` });
    }
    const yrs = r.req.find(x => x.k === 'years');
    if (yrs) {
      const o = opts(bn(yrs.v) + ' বছর', [yrs.v + 2, Math.max(1, yrs.v - 2), yrs.v + 5, yrs.v * 2].filter(x => x !== yrs.v).map(x => bn(x) + ' বছর'));
      if (o) Q.push({ q: 'যোগ্যতার শর্তে <b>অভিজ্ঞতা কত বছর</b> চাওয়া হয়েছে?', ...o, e: `${bn(yrs.v)} বছর। ব্যবসা শুরুর তারিখ প্রমাণে ট্রেড লাইসেন্স বা নিবন্ধনের প্রথম তারিখ লাগে।` });
    }
    if (f.completion) {
      const right = f.completion.trim().slice(0, 40);
      const n = (toEn(right).match(/\d+/) || [])[0];
      if (n) {
        const unit = right.replace(/\d+/, '').trim();
        const o = opts(right, [+n + 30, Math.max(1, +n - 15), +n * 2].map(x => toEn(right).replace(/\d+/, x)).concat([n + ' ' + (/(day|দিন)/i.test(unit) ? 'Weeks' : 'Days')]));
        if (o) Q.push({ q: 'কাজ/সরবরাহ <b>শেষ করার সময়</b> কত?', ...o, e: `সম্পাদনের সময়: <b>${esc(right)}</b>। সাধারণত চুক্তি স্বাক্ষরের পর থেকে গোনা হয় — দেরি হলে LD।` });
      }
    }
    // ধারণাগত প্রশ্ন (পদ্ধতি অনুযায়ী)
    if (r.eoi) Q.push({ q: 'এটি EOI (আগ্রহপত্র) বিজ্ঞপ্তি। এই ধাপে কী জমা দিতে হয়?', o: ['কারিগরি ও আর্থিক প্রস্তাব একসাথে', 'প্রতিষ্ঠানের অভিজ্ঞতা, সক্ষমতা ও জনবলের তথ্য — দর নয়', 'শুধু দর', 'চুক্তিপত্র'], a: 1, e: 'EOI-তে অভিজ্ঞতা ও সক্ষমতা দেখে সংক্ষিপ্ত তালিকা হয়; পরে RFP-তে কারিগরি ও আর্থিক প্রস্তাব।' });
    else if (r.method === 'LTM') Q.push({ q: 'সীমিত দরপত্র (LTM) দেখে প্রথমে কী যাচাই করবে?', o: ['দর কত দেব', 'আমার প্রতিষ্ঠান এই দরপত্রে অংশ নেওয়ার তালিকা বা শর্তে পড়ে কিনা', 'অফিসের ঠিকানা', 'কিছু না'], a: 1, e: 'LTM-এ অংশগ্রহণ সীমিত — যোগ্য তালিকায় না থাকলে বাকি প্রস্তুতি অর্থহীন।' });
    else if (r.method === 'OTM') Q.push({ q: 'OTM দেখে দরদাতা হিসেবে কোন কথাটি সবচেয়ে সঠিক?', o: ['শুধু তালিকাভুক্তরা পারবে', 'যোগ্যতার শর্ত পূরণ করলে যেকোনো প্রতিষ্ঠান অংশ নিতে পারবে, তাই প্রতিযোগিতা বেশি', 'দর দিতে হয় না', 'লটারিতে বিজয়ী'], a: 1, e: 'উন্মুক্ত পদ্ধতি — প্রতিযোগিতা বেশি, নিখুঁত দলিল ও প্রতিযোগিতামূলক দর লাগবে।' });
    return Q.slice(0, 9);
  }

  /* ---------------- পরীক্ষা ---------------- */
  function runTest() {
    let i = 0, right = 0;
    const Q = R.qs, total = Q.length + 1;
    const noticeBox = `<details class="panel"><summary><b>বিজ্ঞপ্তি আবার দেখো</b></summary><pre class="notice raw" style="margin-top:10px">${esc(raw)}</pre></details>`;
    function draw() {
      if (i >= Q.length) return shortQ();
      const q = Q[i];
      A.view.innerHTML = `<div class="kicker">বোঝার পরীক্ষা · ${bn(i + 1)}/${bn(total)}</div>${noticeBox}
        <div class="panel"><div class="q-text">${q.q}</div><div class="opts">${q.o.map((o, k) => `<button class="opt" data-k="${k}"><span class="k">${KEYS[k]}</span><span>${esc(o)}</span></button>`).join('')}</div><div id="fx"></div></div>`;
      $$('.opt').forEach(b => b.onclick = () => {
        const ok = +b.dataset.k === q.a;
        $$('.opt').forEach(x => { x.disabled = true; if (+x.dataset.k === q.a) x.classList.add('right'); });
        if (!ok) b.classList.add('wrong'); else { right++; A.addXP(5, b); }
        A.sound(ok ? 'ok' : 'bad');
        $('#fx').innerHTML = `<div class="model" style="margin-top:12px"><b>${ok ? '✓ ঠিক ধরেছ' : '✗ ভুল'}</b> — ${q.e}</div><button class="btn block" style="margin-top:12px" id="nq">${i + 1 < Q.length ? 'পরের প্রশ্ন' : 'শেষ প্রশ্ন'}</button>`;
        $('#nq').onclick = () => { i++; draw(); };
      });
    }
    function shortQ() {
      const f = R.f;
      const groups = [];
      const peG = keyGroups(f.pe || f.org, 6); if (peG.length) groups.push({ n: 'কে কিনছে', g: peG.flat() });
      const tG = keyGroups((f.title || '') + ' ' + (f.desc || ''), 8); if (tG.length) groups.push({ n: 'কী কিনছে', g: tG.flat() });
      if (R.close) groups.push({ n: 'শেষ সময়', g: [String(R.close.getDate()), bn(R.close.getDate()), MON_BN[R.close.getMonth()], 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' ')[R.close.getMonth()]] });
      groups.push({ n: 'কী যাচাই করবে', g: ['যোগ্যতা', 'অভিজ্ঞতা', 'জামানত', 'সিকিউরিটি', 'security', 'experience', 'turnover', 'টার্নওভার', 'লাইসেন্স', 'license', 'দলিল', 'liquid', 'সময়', 'স্পেসিফিকেশন'] });
      A.view.innerHTML = `<div class="kicker">বোঝার পরীক্ষা · ${bn(total)}/${bn(total)} · নিজের ভাষায়</div>${noticeBox}
        <div class="panel"><div class="q-text">২–৩ বাক্যে লেখো: <b>কে</b> কিনছে, <b>কী</b> কিনছে, <b>শেষ সময়</b> কবে, আর অংশ নিতে তুমি প্রথমে <b>কী যাচাই</b> করবে?</div>
        <textarea id="ans" placeholder="যেমন: গাজীপুর সিভিল সার্জন অফিস ২৫টি কম্পিউটার কিনছে… শেষ সময় … আমি আগে অভিজ্ঞতা আর জামানত যাচাই করব…"></textarea>
        <div id="sres"></div><button class="btn block" style="margin-top:12px" id="ck">উত্তর যাচাই করো</button></div>`;
      let done = false;
      $('#ck').onclick = () => {
        if (done) return finish();
        const t = toEn($('#ans').value).toLowerCase();
        if (t.trim().length < 15) { A.toast('আরেকটু লেখো — অন্তত দুই বাক্য'); return; }
        done = true;
        const hits = groups.map(G => G.g.some(w => w && t.includes(String(w).toLowerCase())));
        const n = hits.filter(Boolean).length, pass = n >= Math.ceil(groups.length * 0.6);
        right += n / groups.length;
        A.addXP(Math.round(10 * n / groups.length) + 2, $('#ck'));
        A.sound(pass ? 'ok' : 'tap');
        $('#sres').innerHTML = `<div class="concepts">${groups.map((G, j) => `<span class="chip ${hits[j] ? 'ok' : ''}">${hits[j] ? '✓' : '○'} ${G.n}</span>`).join('')}</div>
          <div class="model"><b>একটি আদর্শ উত্তর:</b><br>${modelAnswer()}</div>`;
        $('#ans').readOnly = true; $('#ck').textContent = 'ফলাফল ও পূর্ণ বিশ্লেষণ দেখো';
      };
      function finish() {
        const pct = Math.round(right / total * 100);
        drawAnalysis(pct);
      }
    }
    draw();
  }
  function modelAnswer() {
    const f = R.f;
    return `${esc(f.pe || f.org || 'PE')} ${R.nature ? NATURE[R.nature].split(' (')[0] + ' হিসেবে ' : ''}“${esc((f.title || f.desc || 'বিজ্ঞপ্তির কাজ').slice(0, 140))}” কিনছে${R.method ? `, ${METHOD[R.method][0]}-তে` : ''}। জমার শেষ সময় ${dfmt(R.close)}${R.security ? `, জামানত ${money(R.security)}` : ''}। অংশ নেওয়ার আগে যোগ্যতার শর্ত (অভিজ্ঞতা, আর্থিক সক্ষমতা, হালনাগাদ সনদ), জামানতের ধরন ও মেয়াদ, আর হাতে যথেষ্ট সময় আছে কিনা যাচাই করব।`;
  }

  /* ---------------- বিশ্লেষণ ---------------- */
  function drawAnalysis(pct) {
    const f = R.f, S = A.S;
    if (pct !== null) {
      const rec = { id: A.uid(), t: Date.now(), title: (f.title || f.desc || '').slice(0, 120), tid: f.tid ? toEn(f.tid).trim().slice(0, 20) : '', score: pct, nature: R.nature, method: R.method, raw: raw.slice(0, 6000) };
      S.labs.unshift(rec); S.labs = S.labs.slice(0, 30);
      S.stats.lab = (S.stats.lab || 0) + 1; S.stats.labBest = Math.max(S.stats.labBest || 0, pct);
      A.save(); A.addXP(pct >= 70 ? 25 : 10); A.checkBadges();
      if (pct >= 70) { A.confetti(); A.sound('done'); }
    }
    const warn = [], good = [];
    if (R.daysLeft !== null) {
      if (R.daysLeft < 0) warn.push(`জমার শেষ সময় পেরিয়ে গেছে (${bn(-R.daysLeft)} দিন আগে) — শেখার জন্য বিশ্লেষণ করো, বাস্তবে অংশ নেওয়া যাবে না।`);
      else if (R.daysLeft < 7) warn.push(`হাতে মাত্র ${bn(R.daysLeft)} দিন — জামানত ও দলিল সংগ্রহ আজই শুরু করতে হবে।`);
      else good.push(`হাতে ${bn(R.daysLeft)} দিন আছে।`);
    } else warn.push('জমার শেষ সময় পাওয়া যায়নি — বিজ্ঞপ্তি বা দলিলে নিশ্চিত হও।');
    if (R.sell && R.sell < new Date()) warn.push('দলিল বিক্রয়/সংগ্রহের শেষ সময় পেরিয়ে গেছে।');
    if (!R.security && !R.eoi) warn.push('Tender Security-র অঙ্ক বিজ্ঞপ্তিতে পাওয়া যায়নি — TDS-এ দেখো।');
    if (R.vague) warn.push('যোগ্যতার শর্ত বিজ্ঞপ্তিতে বিস্তারিত নেই (“As per Tender Document”) — পুরো দলিল না পড়ে সিদ্ধান্ত নিও না।');
    if (/development partner|world bank|adb|jica|aiib|উন্নয়ন সহযোগী/i.test(R.text)) warn.push('উন্নয়ন সহযোগীর অর্থায়ন — তাদের ক্রয় নির্দেশিকাও প্রযোজ্য হতে পারে।');
    if (/\bICT\b/i.test(f.type || '')) warn.push('আন্তর্জাতিক প্রতিযোগিতা (ICT) — বিদেশি প্রতিষ্ঠানও অংশ নিতে পারে।');

    const steps = role === 'tenderer' ? tendererSteps() : peChecks();
    const known = FIELDS.filter(x => f[x.k]);
    A.view.innerHTML = `<a class="back" href="#/lab">← নতুন বিজ্ঞপ্তি</a>
      ${pct !== null ? `<div class="result" style="padding:6px 0 0"><div class="stamp" style="width:150px;height:150px"><div><b>${bn(pct)}%</b><small>বোঝার স্কোর</small></div></div>
        <h1>${pct >= 90 ? 'অসাধারণ — পেশাদারের চোখ!' : pct >= 70 ? 'ভালো বুঝেছ!' : 'নিচের বিশ্লেষণ মিলিয়ে নাও, আরেকটায় চেষ্টা করো'}</h1></div>` : '<h1>বিজ্ঞপ্তির বিশ্লেষণ</h1>'}
      <div class="seg" role="tablist"><button data-role="tenderer" class="${role === 'tenderer' ? 'on' : ''}">🏢 দরদাতার চোখে</button><button data-role="pe" class="${role === 'pe' ? 'on' : ''}">🏛️ PE-র চোখে</button></div>
      <div class="panel lab-summary">
        <h2>${esc((f.title || f.desc || 'শিরোনাম পাওয়া যায়নি').slice(0, 160))}</h2>
        <div class="kv"><span>ক্রয়কারী</span><b>${esc(f.pe || f.org || '—')}</b></div>
        <div class="kv"><span>ধরন ও পদ্ধতি</span><b>${R.nature ? NATURE[R.nature] : '—'}${R.method ? ' · ' + R.method : ''}${R.eoi ? ' · EOI' : ''}</b></div>
        <div class="kv"><span>Tender ID</span><b>${esc(f.tid ? toEn(f.tid) : '—')}</b></div>
        <div class="kv"><span>জমার শেষ</span><b>${dfmt(R.close)}${R.daysLeft !== null && R.daysLeft >= 0 ? ` <span class="chip ${R.daysLeft < 7 ? 'bad' : 'ok'}">${bn(R.daysLeft)} দিন বাকি</span>` : ''}</b></div>
        <div class="kv"><span>জামানত / দলিলমূল্য</span><b>${money(R.security)} / ${money(R.docprice)}</b></div>
        <div class="kv"><span>সম্পাদনের সময়</span><b>${esc(f.completion || '—')}</b></div>
      </div>
      ${warn.length || good.length ? `<div class="panel"><h3>সতর্কতা ও সংকেত</h3><ul class="flags">${warn.map(w => `<li class="w">⚠️ ${w}</li>`).join('')}${good.map(w => `<li class="g">✅ ${w}</li>`).join('')}</ul></div>` : ''}
      <div class="panel"><h3>${role === 'tenderer' ? 'তোমার করণীয় — ধাপে ধাপে' : 'PE হিসেবে বিজ্ঞপ্তির মান যাচাই'}</h3>${steps}</div>
      ${R.req.length ? `<div class="panel"><h3>যোগ্যতার যে সংখ্যাগুলো যাচাই করতে হবে</h3><ul>${R.req.map(x => `<li>${x.t}</li>`).join('')}</ul><a class="btn ghost block" href="#/calc/elig">যোগ্যতা ক্যালকুলেটরে মেলাও</a></div>` : ''}
      <div class="panel"><h3>লাইন ধরে বাংলা ব্যাখ্যা</h3><div class="tbl"><table><tr><th>বিজ্ঞপ্তিতে</th><th>পাওয়া তথ্য</th><th>মানে কী</th></tr>
        ${known.map(x => `<tr><td><b>${x.l}</b><br><span class="small muted">${x.en}</span></td><td>${esc(String(f[x.k]).slice(0, 220))}</td><td class="small">${explain(x.k)}</td></tr>`).join('')}</table></div>
        ${FIELDS.filter(x => !f[x.k] && ['tid', 'close', 'method', 'security', 'elig', 'completion', 'pe'].includes(x.k)).length ? `<p class="small muted" style="margin-top:8px">বিজ্ঞপ্তিতে পাওয়া যায়নি: ${FIELDS.filter(x => !f[x.k] && ['tid', 'close', 'method', 'security', 'elig', 'completion', 'pe'].includes(x.k)).map(x => x.l).join(', ')}</p>` : ''}</div>
      <div class="stack no-print"><button class="btn block" id="to-sheet">📝 Analysis Sheet-এ পাঠাও</button>
        <div class="row"><a class="btn ghost grow" href="#/bid">⚖️ Bid/No-Bid</a><button class="btn ghost grow" id="cp">📋 সারাংশ কপি</button></div>
        ${R.qs && R.qs.length >= 3 ? '<button class="btn ghost block" id="again">একই বিজ্ঞপ্তিতে আবার পরীক্ষা</button>' : ''}</div>`;
    $$('[data-role]').forEach(b => b.onclick = () => { role = b.dataset.role; drawAnalysis(null); });
    $('#to-sheet').onclick = () => {
      const iso = d => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';
      A.sheetDraft = {
        title: f.title || '', tid: f.tid ? toEn(f.tid).trim() : '', pkg: f.pkg || '', pe: f.pe || f.org || '',
        cat: R.nature ? NATURE[R.nature] : '', method: R.method || f.method || '', what: f.desc || '', close: iso(R.close), open: iso(R.open),
        fee: R.docprice ? money(R.docprice) : '', sec: R.security ? money(R.security) + ' (ধরন ও মেয়াদ TDS থেকে)' : '', elig: f.elig || '',
        risk: warn.join('\n')
      };
      location.hash = '#/sheet/new';
    };
    $('#cp').onclick = () => A.copy(`দরপত্র বিজ্ঞপ্তি সারাংশ\n${f.title || ''}\nক্রয়কারী: ${f.pe || f.org || '-'}\nTender ID: ${f.tid || '-'}\nধরন/পদ্ধতি: ${R.nature ? NATURE[R.nature] : '-'} / ${R.method || '-'}\nজমার শেষ: ${dfmt(R.close)}\nজামানত: ${money(R.security)}\nসম্পাদনের সময়: ${f.completion || '-'}\n\nসতর্কতা:\n${warn.map(w => '- ' + w).join('\n') || '-'}`);
    const ag = $('#again'); if (ag) ag.onclick = () => { R.qs = makeQuestions(R); drawRead(); };
  }
  function explain(k) {
    const r = R;
    const E = {
      ministry: 'সবচেয়ে ওপরের প্রশাসনিক স্তর। চুক্তি এদের সাথে নয়।',
      org: 'PE যে অধিদপ্তর বা সংস্থার অধীনে।',
      pe: 'আসল ক্রেতা — প্রশ্নোত্তর, মূল্যায়ন, চুক্তি সব এদের সাথে।',
      district: 'PE-র অবস্থান — মাঠপর্যায়ের যোগাযোগ ও সাইট ভিজিটের জন্য।',
      nature: r.nature ? NATURE[r.nature] + ' — এই অনুযায়ী STD ও শর্ত আলাদা।' : 'ক্রয়ের ধরন।',
      type: 'NCT = জাতীয় প্রতিযোগিতা; ICT = আন্তর্জাতিক।',
      method: r.method && METHOD[r.method] ? METHOD[r.method].join(' — ') : 'দলিলে পদ্ধতি মিলিয়ে নাও।',
      tid: 'e-GP-তে দরপত্রের অনন্য নম্বর — খোঁজা ও জমায় লাগে।',
      appid: 'বার্ষিক ক্রয় পরিকল্পনায় (APP) এই প্যাকেজের নম্বর।',
      ref: 'দপ্তরের চিঠির স্মারক নম্বর।',
      pkg: 'APP-র প্যাকেজ নম্বর — একই প্যাকেজে একাধিক Lot থাকতে পারে।',
      title: 'কী কেনা হচ্ছে তার সংক্ষিপ্ত নাম।',
      pub: 'বিজ্ঞপ্তি প্রকাশের দিন — এখান থেকে প্রস্তুতির সময় গোনা শুরু।',
      sell: 'এর মধ্যে দলিল সংগ্রহ/মূল্য পরিশোধ না করলে জমা দেওয়া যাবে না।',
      close: 'জমার শেষ মুহূর্ত। কয়েক ঘণ্টা আগেই Final Submission করো।',
      open: 'দরপত্র খোলার সময় — Opening report দেখে প্রতিযোগীদের দর জানা যায়।',
      fund: 'GoB নাকি উন্নয়ন সহযোগী — সহযোগী হলে তাদের নির্দেশিকাও প্রযোজ্য হতে পারে।',
      project: 'যে প্রকল্পের টাকায় কেনা — প্রকল্পের মেয়াদ ও অগ্রাধিকার বোঝা যায়।',
      elig: 'অংশ নেওয়ার প্রবেশপত্র। একটি অপরিহার্য শর্তে ঘাটতি মানে বাদ।',
      desc: 'কাজের পরিধির সারাংশ — বিস্তারিত স্পেসিফিকেশন/BOQ/ToR দলিলে।',
      docprice: 'দলিল নেওয়ার ফি — ফেরতযোগ্য নয়।',
      security: 'দরপত্রের নিশ্চয়তা জামানত — অঙ্ক, ধরন, মেয়াদ ও Beneficiary-র নাম হুবহু মানতে হবে।',
      location: 'সরবরাহ বা কাজের জায়গা — পরিবহন ও সাইট খরচ ধরতে হবে।',
      completion: 'চুক্তির পর কাজ শেষের সময় — দেরি হলে LD।',
      official: 'দরপত্র আহ্বানকারী কর্মকর্তার পদবি — আনুষ্ঠানিক চিঠিতে লাগবে।',
      other: 'অতিরিক্ত নির্দেশনা — মূল্যায়ন পদ্ধতি বা ধাপ প্রায়ই এখানে থাকে।'
    };
    return E[k] || '';
  }
  function tendererSteps() {
    const s = [];
    s.push('<b>দলিল নামাও ও TDS পড়ো</b> — বিজ্ঞপ্তি শুধু সারাংশ; আসল শর্ত TDS ও যোগ্যতার অংশে।');
    if (R.method === 'LTM') s.push('<b>তুমি অংশ নিতে পারবে কিনা</b> — LTM-এ তালিকা/শর্ত আগে নিশ্চিত করো।');
    if (R.eoi) s.push('<b>EOI প্রস্তুতি</b> — অনুরূপ কাজের তালিকা (মূল্য, ক্লায়েন্ট, সময়), মূল জনবলের CV, প্রতিষ্ঠানের প্রোফাইল। এখন দর নয়।');
    s.push('<b>যোগ্যতা মেলাও</b> — অভিজ্ঞতা, Turnover, Liquid Asset, সনদের মেয়াদ। একটিতেও ঘাটতি থাকলে Bid/No-Bid বিশ্লেষকে যাও।');
    if (R.security) s.push(`<b>জামানতের কাজ আজই</b> — ${money(R.security)}; ব্যাংকে Beneficiary-র নাম ও মেয়াদ (validity + অতিরিক্ত দিন) TDS থেকে হুবহু দাও।`);
    if (R.nature === 'works') s.push('<b>সাইট ভিজিট ও Rate Analysis</b> — মালামালের দাম, পরিবহন, যন্ত্র; প্রাক্কলনের অনেক নিচে অবাস্তব দর দিও না।');
    if (R.nature === 'goods') s.push('<b>সরবরাহকারীর উদ্ধৃতি ও Manufacturer\'s Authorization</b> — দরকার হলে এখনই চাও; সরবরাহ সময় লিখিত নাও।');
    if (R.nature === 'physical') s.push('<b>জনবল ও মজুরির হিসাব</b> — দলিলের ন্যূনতম মজুরি ও আইনি পাওনা ধরে দর।');
    if (R.nature === 'consult' && !R.eoi) s.push('<b>কারিগরি প্রস্তাব শক্ত করো</b> — QCBS-এ কারিগরি নম্বরই জয়ের মূল।');
    s.push('<b>Clarification-এর শেষ তারিখ</b> দেখে অস্পষ্টতা লিখিতভাবে জিজ্ঞেস করো।');
    s.push('<b>জমার দিন</b> — কয়েক ঘণ্টা আগে Final Submission, প্রাপ্তিস্বীকার সংরক্ষণ।');
    return `<ol class="flow">${s.map(x => `<li>${x}</li>`).join('')}</ol>`;
  }
  function peChecks() {
    const f = R.f, c = [
      [!!f.tid && !!f.pkg, 'Tender ID ও প্যাকেজ নম্বর আছে'],
      [!!R.close && !!R.open, 'Closing ও Opening-এর তারিখ-সময় স্পষ্ট'],
      [!!R.method, 'ক্রয় পদ্ধতি উল্লেখ আছে'],
      [!!R.security || R.eoi, 'Tender Security-র অঙ্ক উল্লেখ আছে'],
      [!R.vague, 'যোগ্যতার মূল শর্ত বিজ্ঞপ্তিতেই সংক্ষেপে আছে — দরদাতা দ্রুত সিদ্ধান্ত নিতে পারে'],
      [!!f.desc && f.desc.length > 40, 'কাজের সংক্ষিপ্ত বিবরণ যথেষ্ট স্পষ্ট (পরিমাণ/স্থান)'],
      [!!f.completion, 'সম্পাদনের সময় উল্লেখ আছে'],
      [!!f.location || /location|স্থান/i.test(R.text), 'সরবরাহ/কাজের স্থান উল্লেখ আছে'],
      [!!f.fund, 'অর্থের উৎস উল্লেখ আছে']
    ];
    const ok = c.filter(x => x[0]).length;
    return `<p>বিজ্ঞপ্তির মান: <b>${bn(ok)}/${bn(c.length)}</b></p><div class="checks">${c.map(([v, t]) => `<label class="${v ? '' : 'miss'}"><span>${v ? '✅' : '⬜'}</span><span>${t}</span></label>`).join('')}</div>
      ${R.window !== null ? `<p class="small" style="margin-top:10px">প্রকাশ থেকে Closing পর্যন্ত <b>${bn(R.window)} দিন</b>। বিধিতে পদ্ধতি ও মূল্যভেদে ন্যূনতম সময় নির্ধারিত — সর্বশেষ PPR অনুযায়ী মিলিয়ে নাও; কম সময় দিলে প্রতিযোগিতা কমে।</p>` : ''}
      <p class="small muted">PE হিসেবে শিক্ষা: স্পষ্ট বিজ্ঞপ্তি মানে কম Clarification, বেশি যোগ্য দরদাতা, কম অভিযোগ।</p>`;
  }

  A.page('lab', pLab, 'tools');
  A.LAB = { parse, parseDate, parseAmount, makeQuestions };
})();
