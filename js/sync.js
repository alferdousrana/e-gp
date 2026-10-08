/* দরপত্র পাঠশালা — ক্লাউড সিঙ্ক (Firebase Auth + Firestore)
   নীতি: local-first। সব কাজ আগে এই ডিভাইসে জমা হয় (অফলাইনেও)।
   অনলাইন ও লগইন থাকলে Firestore-এ যায়; অন্য ডিভাইসের পরিবর্তন রিয়েলটাইমে আসে।
   দুই ডিভাইসে অফলাইনে আলাদা কাজ হলেও কিছু হারায় না — নিচের merge() সব মিলিয়ে নেয়। */

const APP = window.APP;
const cfg = window.FIREBASE_CONFIG || {};
const ENABLED = !!(cfg.apiKey && cfg.projectId && cfg.appId);
const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
const META_KEY = 'darpotro-sync-meta';
const { $, $$, esc, bn } = APP;

/* ------------------------------------------------------------------
   MERGE — দুই অবস্থা মিলিয়ে একটি (কোনো ডিভাইসের অর্জন হারাবে না)
   ------------------------------------------------------------------ */
const clone = o => JSON.parse(JSON.stringify(o));
const maxN = (x, y) => Math.max(+x || 0, +y || 0);
const union = (x, y) => Array.from(new Set([...(x || []), ...(y || [])]));
function mapMerge(x, y, f) { const o = {}; new Set([...Object.keys(x || {}), ...Object.keys(y || {})]).forEach(k => { o[k] = f((x || {})[k], (y || {})[k]); }); return o; }

export function merge(local, remote) {
  if (!remote) return clone(local);
  if (!local) return clone(remote);
  // রিসেট বা ব্যাকআপ ফেরানো হলে (epoch বাড়ে) — যেটা নতুন epoch-এর, সেটাই পুরোটা
  if ((remote.epoch || 0) !== (local.epoch || 0)) return clone((remote.epoch || 0) > (local.epoch || 0) ? remote : local);
  const a = local, b = remote;
  const newer = (b._u || 0) > (a._u || 0) ? b : a;
  const m = clone(newer); // নাম, সেটিংস, চেকলিস্ট, Bid শিট, ভুলের খাতা — শেষ পরিবর্তন জেতে

  m.xpDev = mapMerge(a.xpDev, b.xpDev, maxN);
  m.xp = Object.values(m.xpDev).reduce((s, v) => s + v, 0);
  m.done = mapMerge(a.done, b.done, (x, y) => {
    if (!x) return y; if (!y) return x;
    return { score: Math.max(x.score || 0, y.score || 0), date: [x.date, y.date].filter(Boolean).sort()[0] || '' };
  });
  m.badges = union(a.badges, b.badges);
  m.known = union(a.known, b.known);
  m.log = mapMerge(a.log, b.log, maxN);
  const sa = a.streak || {}, sb = b.streak || {};
  m.streak = (sa.last || '') === (sb.last || '') ? { last: sa.last || '', count: maxN(sa.count, sb.count) } : clone((sa.last || '') > (sb.last || '') ? sa : sb);
  ['best', 'perfect', 'dailyCount', 'fixed', 'finalScore'].forEach(k => {
    if (a[k] === null && b[k] === null) return;
    m[k] = maxN(a[k], b[k]);
  });
  if (a.finalScore === null && b.finalScore === null) m.finalScore = null;
  m.daily = [a.daily || '', b.daily || ''].sort().pop();
  m.finalDate = [a.finalDate, b.finalDate].filter(Boolean).sort()[0] || '';
  m.matchBest = [a.matchBest, b.matchBest].filter(v => v !== null && v !== undefined).sort((x, y) => x - y)[0] ?? null;

  // শিট: আইডি ধরে, নতুনটা জেতে; মুছে ফেলা শিট আর ফিরবে না
  m.deleted = mapMerge(a.deleted, b.deleted, maxN);
  const sheets = {};
  [...(a.sheets || []), ...(b.sheets || [])].forEach(s => { if (!s.id) return; if (!sheets[s.id] || (s.u || 0) > (sheets[s.id].u || 0)) sheets[s.id] = s; });
  m.sheets = Object.values(sheets).filter(s => !(m.deleted[s.id] >= (s.u || 0))).sort((x, y) => (y.u || 0) - (x.u || 0));

  // ল্যাবের ইতিহাস
  const labs = {};
  [...(a.labs || []), ...(b.labs || [])].forEach(l => { if (l && l.id && !labs[l.id]) labs[l.id] = l; });
  m.labs = Object.values(labs).sort((x, y) => (y.t || 0) - (x.t || 0)).slice(0, 30);

  // পরিসংখ্যান
  const xa = a.stats || {}, xb = b.stats || {};
  m.stats = Object.assign({}, newer.stats, {
    lab: maxN(xa.lab, xb.lab), labBest: maxN(xa.labBest, xb.labBest), seqWins: maxN(xa.seqWins, xb.seqWins),
    sprintBest: maxN(xa.sprintBest, xb.sprintBest), boqWins: maxN(xa.boqWins, xb.boqWins),
    mockCount: maxN(xa.mockCount, xb.mockCount),
    mockBest: (xa.mockBest ?? null) === null && (xb.mockBest ?? null) === null ? null : maxN(xa.mockBest, xb.mockBest),
    convo: mapMerge(xa.convo, xb.convo, maxN), calc: mapMerge(xa.calc, xb.calc, maxN)
  });

  // প্রো পথের কাজ: প্রতিটি কাজের সর্বশেষ টিক/আনটিক (সময়ের চিহ্ন: +টিক, −আনটিক)
  const ta = (a.track || {}).tasks || {}, tb = (b.track || {}).tasks || {};
  m.track = { role: (newer.track || {}).role || '', tasks: mapMerge(ta, tb, (x, y) => Math.abs(+x || 0) >= Math.abs(+y || 0) ? (x || 0) : (y || 0)) };

  m._u = Math.max(a._u || 0, b._u || 0);
  return m;
}
window.SYNC_MERGE = merge;

/* ------------------------------------------------------------------
   অবস্থা ও UI
   ------------------------------------------------------------------ */
let meta = { pending: false, last: 0, uid: '' };
try { meta = Object.assign(meta, JSON.parse(localStorage.getItem(META_KEY) || '{}')); } catch (e) { }
const saveMeta = () => { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) { } };

let fb = null, auth = null, db = null, user = null, unsub = null, loading = null, status = ENABLED ? 'loading' : 'off', lastErr = '';
let pushTimer = null, pushing = false, again = false;

function setStatus(s) { status = s; pill(); box(); }
function computeStatus() {
  if (!ENABLED) return 'off';
  if (!fb) return navigator.onLine ? 'loading' : 'offline';
  if (!user) return 'signedout';
  if (!navigator.onLine) return 'offline';
  if (meta.pending || pushing) return 'syncing';
  return 'synced';
}
function refresh() { setStatus(lastErr && status === 'error' ? 'error' : computeStatus()); }

const ICON = { loading: '☁️…', offline: '☁️📴', signedout: '☁️', syncing: '☁️⏳', synced: '☁️✓', error: '☁️⚠️' };
const LABEL = {
  off: 'ক্লাউড সিঙ্ক বন্ধ', loading: 'সংযোগ হচ্ছে…', offline: 'অফলাইন — অনলাইন হলেই সিঙ্ক হবে',
  signedout: 'লগইন করলে সব ডিভাইসে সিঙ্ক হবে', syncing: 'সিঙ্ক হচ্ছে…', synced: 'সব ডিভাইসে হালনাগাদ', error: 'সিঙ্কে সমস্যা'
};
function pill() {
  const p = $('#tb-sync'); if (!p) return;
  p.hidden = !ENABLED;
  p.textContent = ICON[status] || '☁️';
  p.title = LABEL[status] || '';
  p.className = 'pill sync s-' + status;
}
const ago = t => {
  if (!t) return 'এখনো হয়নি';
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'এইমাত্র';
  if (s < 3600) return `${bn(Math.round(s / 60))} মিনিট আগে`;
  if (s < 86400) return `${bn(Math.round(s / 3600))} ঘণ্টা আগে`;
  return new Date(t).toLocaleString('bn-BD');
};

function boxHTML() {
  if (!ENABLED) return `<div class="panel sync-box" id="sync-box"><div class="row"><span class="ic">☁️</span><div><b>সব ডিভাইসে সিঙ্ক</b>
    <div class="small muted">ক্লাউড সিঙ্ক এখনো চালু করা হয়নি — অগ্রগতি এই ডিভাইসেই সংরক্ষিত থাকছে। অ্যাপের মালিক Firebase সংযোগ দিলে লগইন করে ফোন ও কম্পিউটারে একই অগ্রগতি পাবে। ততক্ষণ নিচের “ব্যাকআপ নামাও/ফেরাও” দিয়ে ডিভাইস বদলাতে পারো।</div></div></div></div>`;
  const head = `<div class="row"><span class="ic">☁️</span><div class="grow"><b>সব ডিভাইসে সিঙ্ক</b><div class="small sync-state s-${status}">${ICON[status]} ${LABEL[status]}${status === 'error' && lastErr ? ' — ' + esc(lastErr) : ''}</div></div></div>`;
  if (!fb) return `<div class="panel sync-box" id="sync-box">${head}<p class="small muted" style="margin:.6em 0 0">${navigator.onLine ? 'Firebase যুক্ত হচ্ছে…' : 'প্রথমবার লগইনের জন্য ইন্টারনেট লাগবে। অফলাইনে সব কাজ এই ডিভাইসে জমা হচ্ছে।'}</p></div>`;
  if (!user) return `<div class="panel sync-box" id="sync-box">${head}
    <p class="small muted" style="margin:.6em 0">একই অ্যাকাউন্টে মোবাইল ও কম্পিউটারে লগইন করলে XP, পাঠ, শিট, ব্যাজ — সব মিলে যাবে। অফলাইনে করা কাজও অনলাইন হলেই উঠে যাবে।</p>
    <button class="btn block" id="sg-google">Google দিয়ে লগইন</button>
    <details class="email-login"><summary>ইমেইল ও পাসওয়ার্ড দিয়ে</summary>
      <div class="field"><label for="sg-email">ইমেইল</label><input id="sg-email" type="text" inputmode="email" autocomplete="email" placeholder="you@example.com"></div>
      <div class="field"><label for="sg-pass">পাসওয়ার্ড (অন্তত ৬ অক্ষর)</label><input id="sg-pass" type="password" autocomplete="current-password"></div>
      <div class="row"><button class="btn grow" id="sg-in">লগইন</button><button class="btn ghost grow" id="sg-up">নতুন অ্যাকাউন্ট</button></div>
      <button class="linkbtn small" id="sg-reset">পাসওয়ার্ড ভুলে গেছি</button>
    </details></div>`;
  return `<div class="panel sync-box" id="sync-box">${head}
    <div class="setting"><div><b>${esc(user.displayName || user.email || 'অ্যাকাউন্ট')}</b><div class="small muted">${esc(user.email || '')}</div></div></div>
    <div class="setting"><div><b>শেষ সিঙ্ক</b><div class="small muted">${ago(meta.last)}${meta.pending ? ' · কিছু আপডেট অপেক্ষায়' : ''}</div></div></div>
    <div class="row" style="padding-top:10px"><button class="btn ghost grow" id="sg-now">এখনই সিঙ্ক করো</button><button class="btn ghost grow" id="sg-out">লগআউট</button></div></div>`;
}
function box() {
  const el = $('#sync-box'); if (!el) return;
  el.outerHTML = boxHTML(); bindBox();
}
function bindBox() {
  const g = $('#sg-google'); if (g) g.onclick = google;
  const i = $('#sg-in'); if (i) i.onclick = () => emailAuth(false);
  const u = $('#sg-up'); if (u) u.onclick = () => emailAuth(true);
  const r = $('#sg-reset'); if (r) r.onclick = resetPass;
  const n = $('#sg-now'); if (n) n.onclick = () => { if (!navigator.onLine) { APP.toast('📴 এখন অফলাইন — অনলাইন হলেই নিজে থেকে সিঙ্ক হবে'); return; } pull(true); };
  const o = $('#sg-out'); if (o) o.onclick = signOutNow;
}
APP.hooks.meTop.push(boxHTML);
const prevBind = APP.hooks.meBind;
APP.hooks.meBind = () => { prevBind && prevBind(); bindBox(); };

const ERR = {
  'auth/invalid-email': 'ইমেইলটি সঠিক নয়', 'auth/missing-password': 'পাসওয়ার্ড দাও', 'auth/weak-password': 'পাসওয়ার্ড অন্তত ৬ অক্ষরের দাও',
  'auth/email-already-in-use': 'এই ইমেইলে আগেই অ্যাকাউন্ট আছে — লগইন চাপো', 'auth/invalid-credential': 'ইমেইল বা পাসওয়ার্ড মেলেনি',
  'auth/wrong-password': 'পাসওয়ার্ড মেলেনি', 'auth/user-not-found': 'এই ইমেইলে অ্যাকাউন্ট নেই — নতুন অ্যাকাউন্ট চাপো',
  'auth/network-request-failed': 'ইন্টারনেট সংযোগ নেই', 'auth/popup-closed-by-user': 'লগইন উইন্ডো বন্ধ করা হয়েছে',
  'auth/unauthorized-domain': 'এই ডোমেইন Firebase-এ অনুমোদিত নয় (Authorized domains-এ যোগ করতে হবে)',
  'auth/too-many-requests': 'অনেকবার চেষ্টা হয়েছে, একটু পরে আবার চেষ্টা করো',
  'permission-denied': 'ডেটাবেসের অনুমতি নেই (firestore.rules যাচাই করো)'
};
const errMsg = e => ERR[e && e.code] || (e && e.message) || 'অজানা সমস্যা';

/* ------------------------------------------------------------------
   Firebase লোড (অনলাইনে একবার লোড হলে Service Worker ক্যাশে রাখে)
   ------------------------------------------------------------------ */
function loadSDK() {
  if (!ENABLED) return Promise.resolve(null);
  if (fb) return Promise.resolve(fb);
  if (loading) return loading;
  loading = (async () => {
    const [app, au, fs] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')]);
    const fapp = app.initializeApp(cfg);
    auth = au.getAuth(fapp);
    try { db = fs.initializeFirestore(fapp, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) }); }
    catch (e) { db = fs.getFirestore(fapp); }
    fb = { au, fs };
    au.getRedirectResult(auth).catch(e => { lastErr = errMsg(e); setStatus('error'); });
    au.onAuthStateChanged(auth, u => onUser(u));
    return fb;
  })().catch(e => { loading = null; lastErr = navigator.onLine ? 'Firebase লোড হয়নি' : ''; refresh(); throw e; });
  return loading;
}

async function google() {
  try {
    await loadSDK();
    const p = new fb.au.GoogleAuthProvider();
    try { await fb.au.signInWithPopup(auth, p); }
    catch (e) {
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) await fb.au.signInWithRedirect(auth, p);
      else throw e;
    }
  } catch (e) { APP.toast('⚠️ ' + errMsg(e)); }
}
async function emailAuth(create) {
  const em = ($('#sg-email').value || '').trim(), pw = $('#sg-pass').value || '';
  if (!em || !pw) { APP.toast('ইমেইল ও পাসওয়ার্ড দুটোই দাও'); return; }
  try {
    await loadSDK();
    if (create) await fb.au.createUserWithEmailAndPassword(auth, em, pw);
    else await fb.au.signInWithEmailAndPassword(auth, em, pw);
  } catch (e) { APP.toast('⚠️ ' + errMsg(e)); }
}
async function resetPass() {
  const em = ($('#sg-email').value || '').trim();
  if (!em) { APP.toast('আগে ইমেইলের ঘরে তোমার ইমেইল লেখো'); return; }
  try { await loadSDK(); await fb.au.sendPasswordResetEmail(auth, em); APP.toast('📧 পাসওয়ার্ড বদলানোর লিংক ইমেইলে পাঠানো হয়েছে'); }
  catch (e) { APP.toast('⚠️ ' + errMsg(e)); }
}
async function signOutNow() {
  if (!confirm('লগআউট করবে? এই ডিভাইসের অগ্রগতি থেকে যাবে, কিন্তু আর সিঙ্ক হবে না।')) return;
  try { await flush(); } catch (e) { }
  try { await fb.au.signOut(auth); APP.toast('লগআউট হয়েছে'); } catch (e) { APP.toast('⚠️ ' + errMsg(e)); }
}

/* ------------------------------------------------------------------
   পুল / পুশ / রিয়েলটাইম
   ------------------------------------------------------------------ */
const ref = () => fb.fs.doc(db, 'users', user.uid);
const parse = d => { try { return d && d.state ? APP.normalize(JSON.parse(d.state)) : null; } catch (e) { return null; } };

async function onUser(u) {
  user = u;
  if (unsub) { unsub(); unsub = null; }
  if (!u) { refresh(); return; }
  lastErr = '';
  // এই ডিভাইসে আগে অন্য অ্যাকাউন্ট ছিল? তাহলে তার অগ্রগতি নতুন অ্যাকাউন্টে মিশবে না
  const switched = meta.uid && meta.uid !== u.uid;
  meta.uid = u.uid; saveMeta();
  await pull(false, switched);
  unsub = fb.fs.onSnapshot(ref(), snap => {
    if (snap.metadata.hasPendingWrites || !snap.exists()) return;
    const remote = parse(snap.data()); if (!remote) return;
    const merged = merge(APP.S, remote);
    APP.replaceState(merged, snap.data().dev !== APP.DEV && !APP.same(APP.normalize(merged), APP.S) ? '🔄 অন্য ডিভাইসের আপডেট যোগ হয়েছে' : '');
    if (!snap.metadata.fromCache) { meta.last = Date.now(); saveMeta(); }
    if (!APP.same(APP.normalize(merged), remote)) schedule(300);
    refresh();
  }, e => { lastErr = errMsg(e); setStatus('error'); });
  APP.toast('☁️ লগইন হয়েছে — অগ্রগতি সব ডিভাইসে সিঙ্ক হবে');
}

async function pull(manual, replace) {
  if (!user) return;
  setStatus('syncing');
  try {
    let snap;
    try { snap = await fb.fs.getDocFromServer(ref()); } catch (e) { snap = await fb.fs.getDoc(ref()); }
    const remote = snap.exists() ? parse(snap.data()) : null;
    const base = replace ? (remote || APP.normalize(null)) : APP.S;
    const merged = merge(base, remote);
    APP.replaceState(merged, replace ? '🔁 এই অ্যাকাউন্টের অগ্রগতি আনা হয়েছে' : '');
    if (!remote || !APP.same(APP.normalize(merged), remote)) await push();
    else { meta.pending = false; meta.last = Date.now(); saveMeta(); }
    lastErr = '';
    if (manual) APP.toast('☁️ সিঙ্ক সম্পন্ন');
  } catch (e) { lastErr = errMsg(e); setStatus('error'); return; }
  refresh();
}

async function push() {
  if (!user || !fb) return;
  if (pushing) { again = true; return; }
  pushing = true; meta.pending = true; saveMeta(); refresh();
  try {
    // অফলাইনে থাকলে Firestore লেখাটা নিজের সারিতে রাখে; অনলাইন হলে পাঠায়, তখন এই await শেষ হয়
    await fb.fs.setDoc(ref(), { state: JSON.stringify(APP.S), u: APP.S._u || Date.now(), dev: APP.DEV, ver: 2, at: fb.fs.serverTimestamp() });
    meta.pending = false; meta.last = Date.now(); saveMeta(); lastErr = '';
  } catch (e) { lastErr = errMsg(e); pushing = false; setStatus('error'); return; }
  pushing = false;
  if (again) { again = false; return push(); }
  refresh();
}
function schedule(ms = 1500) { clearTimeout(pushTimer); pushTimer = setTimeout(push, ms); }
async function flush() { clearTimeout(pushTimer); await push(); }

// অ্যাপে প্রতিটি সংরক্ষণে: লগইন থাকলে ক্লাউডে পাঠানোর সারিতে
APP.on('save', () => {
  if (!ENABLED) return;
  meta.pending = true; saveMeta();
  if (user) schedule(); else refresh();
});
window.addEventListener('online', () => { if (!ENABLED) return; if (!fb) loadSDK().catch(() => { }); else if (user) pull(false); refresh(); });
window.addEventListener('offline', refresh);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && user && meta.pending) push(); });

// শুরু
pill();
if (ENABLED) {
  if (navigator.onLine) loadSDK().catch(() => { }); else refresh();
}
