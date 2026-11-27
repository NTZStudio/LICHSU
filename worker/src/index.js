/* Sử Quán · Worker quản lý mã kích hoạt (Cloudflare Workers + D1).
   Xem KE-HOACH-MA-KICH-HOAT.md và worker/HUONG-DAN-DEPLOY.md. */
const R = { basic: 0, plus: 1, promax: 2 };
const SWITCH_MAX = 3;           // số lần chuyển/tạo khóa mới mỗi ngày
const FAIL_MAX = 10;            // số lần nhập sai tối đa / 10 phút / IP
const enc = new TextEncoder();

async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', enc.encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
function rnd(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(x => x.toString(16).padStart(2, '0')).join(''); }
const norm = c => String(c || '').toUpperCase().replace(/\s+/g, '');
const today = () => new Date().toISOString().slice(0, 10);

const cors = env => ({
  'access-control-allow-origin': (env && env.ALLOWED_ORIGIN) || '*',
  'access-control-allow-headers': 'content-type,x-admin,x-contrib',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-max-age': '86400',
  'cache-control': 'no-store'
});
const send = (env, data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...cors(env) } });
const ok = (env, o = {}) => send(env, { ok: true, ...o });
const err = (env, status, msg, extra = {}) => send(env, { ok: false, msg, ...extra }, status);

const q = (env, sql, ...a) => env.DB.prepare(sql).bind(...a);
const first = (env, sql, ...a) => q(env, sql, ...a).first();

/* ---------- giới hạn nhập sai theo IP ---------- */
const rlKey = (act, ip) => act + ':' + ip + ':' + Math.floor(Date.now() / 600000);
async function blocked(env, act, ip) { const r = await first(env, 'SELECT n FROM rate_limits WHERE k=?', rlKey(act, ip)); return !!(r && r.n >= FAIL_MAX); }
async function failed(env, act, ip) {
  await q(env, 'INSERT INTO rate_limits(k,n,exp) VALUES(?,1,?) ON CONFLICT(k) DO UPDATE SET n=n+1', rlKey(act, ip), Date.now() + 900000).run();
  await q(env, 'DELETE FROM rate_limits WHERE exp<?', Date.now()).run();
}
const TOO_MANY = 'Nhập sai quá nhiều lần. Vui lòng thử lại sau ít phút.';

/* ---------- khóa gói ---------- */
async function keyRow(env, key) { const k = norm(key); if (!k) return null; return first(env, 'SELECT * FROM keys WHERE key_hash=?', await sha('key:' + k)); }
async function newKey(env, o) {
  const key = 'SQK-' + rnd(20).toUpperCase();
  await q(env, 'INSERT INTO keys(key_hash,plan,expires_at,active,code_id,dev_hash,switches,switch_day,created_at) VALUES(?,?,?,1,?,?,?,?,?)',
    await sha('key:' + key), o.plan, o.expires_at ?? null, o.code_id ?? null, o.dev_hash ?? null, o.switches || 0, o.switch_day || null, Date.now()).run();
  return key;
}
const live = (r, now) => r && r.active && (!r.expires_at || r.expires_at > now);
function keyExpiry(code, now) {
  let e = null;
  if (code.days) e = now + code.days * 864e5;
  if (code.expires_at) e = e === null ? code.expires_at : Math.min(e, code.expires_at);
  return e;
}
async function deadKey(env, id, now) { await q(env, 'UPDATE keys SET active=0, replaced_at=? WHERE id=?', now, id).run(); }

async function codeMeta(env, id) {
  if (id == null) return {};
  const c = await first(env, 'SELECT note,max_uses,used FROM codes WHERE id=?', id);
  if (!c) return {};
  return { note: c.note || '', max: c.max_uses, left: c.max_uses == null ? null : Math.max(0, c.max_uses - c.used) };
}

/* ---------- API người dùng ---------- */
async function redeem(env, b, ip) {
  if (await blocked(env, 'r', ip)) return err(env, 429, TOO_MANY);
  const code = await first(env, 'SELECT * FROM codes WHERE code_hash=?', await sha(norm(b.code)));
  if (!code || !code.active) { await failed(env, 'r', ip); return err(env, 404, 'Mã không đúng hoặc đã bị vô hiệu hóa.'); }
  const now = Date.now();
  if (code.expires_at && now >= code.expires_at) return err(env, 410, 'Mã này đã hết hạn.');
  if (!b.dev || String(b.dev).length < 16) return err(env, 400, 'Thiếu mã thiết bị.');
  const dev = await sha('dev:' + b.dev);
  const cur = b.cur ? await keyRow(env, b.cur) : null, curLive = live(cur, now);
  if (curLive && R[cur.plan] >= R[code.plan]) return err(env, 409, 'Bạn đã có gói ' + cur.plan.toUpperCase() + ' trở lên, không cần dùng mã này.');
  const had = await first(env, 'SELECT 1 AS x FROM redemptions WHERE code_id=? AND dev_hash=?', code.id, dev);
  if (!had) {
    const up = await q(env, 'UPDATE codes SET used=used+1 WHERE id=? AND active=1 AND (max_uses IS NULL OR used<max_uses) AND (expires_at IS NULL OR expires_at>?)', code.id, now).run();
    if (!up.meta.changes) return err(env, 410, 'Mã đã hết lượt sử dụng.');
    await q(env, 'INSERT OR IGNORE INTO redemptions(code_id,dev_hash,at) VALUES(?,?,?)', code.id, dev, now).run();
  }
  await q(env, 'UPDATE keys SET active=0, replaced_at=? WHERE active=1 AND code_id=? AND dev_hash=?', now, code.id, dev).run();
  if (curLive) await deadKey(env, cur.id, now);
  const until = keyExpiry(code, now);
  const key = await newKey(env, { plan: code.plan, expires_at: until, code_id: code.id, dev_hash: dev });
  return ok(env, { key, plan: code.plan, until, ...(await codeMeta(env, code.id)) });
}

/* Chuyển gói sang trình duyệt này (nhập khóa) hoặc tạo khóa mới (rotate: cur === key). */
async function moveKey(env, b, ip) {
  if (await blocked(env, 'k', ip)) return err(env, 429, TOO_MANY);
  const row = await keyRow(env, b.key), now = Date.now();
  if (!row) { await failed(env, 'k', ip); return err(env, 404, 'Khóa không đúng.'); }
  if (!live(row, now)) return err(env, 410, 'Khóa này không còn hiệu lực (đã được chuyển sang nơi khác, bị hủy hoặc hết hạn).');
  if (!b.dev || String(b.dev).length < 16) return err(env, 400, 'Thiếu mã thiết bị.');
  const day = today(), sw = row.switch_day === day ? row.switches : 0;
  if (sw >= SWITCH_MAX) return err(env, 429, 'Hôm nay gói này đã chuyển ' + SWITCH_MAX + ' lần. Hãy thử lại vào ngày mai.');
  const dev = await sha('dev:' + b.dev);
  const mv = await q(env, 'UPDATE keys SET active=0, replaced_at=? WHERE id=? AND active=1', now, row.id).run();
  if (!mv.meta.changes) return err(env, 410, 'Khóa này vừa được chuyển sang nơi khác.');
  const cur = b.cur ? await keyRow(env, b.cur) : null;
  if (cur && cur.id !== row.id && live(cur, now)) await deadKey(env, cur.id, now);
  const key = await newKey(env, { plan: row.plan, expires_at: row.expires_at, code_id: row.code_id, dev_hash: dev, switches: sw + 1, switch_day: day });
  return ok(env, { key, plan: row.plan, until: row.expires_at, ...(await codeMeta(env, row.code_id)) });
}

async function status(env, b) {
  const row = await keyRow(env, b.key), now = Date.now();
  if (!row || !row.active) return err(env, 200, 'Gói đã được chuyển sang thiết bị khác hoặc đã bị hủy.', { reason: 'revoked' });
  if (row.expires_at && row.expires_at <= now) return err(env, 200, 'Gói của bạn đã hết hạn.', { reason: 'expired' });
  return ok(env, { plan: row.plan, until: row.expires_at });
}
async function deactivate(env, b) {
  const row = await keyRow(env, b.key);
  if (!row) return err(env, 404, 'Khóa không đúng.');
  await deadKey(env, row.id, Date.now());
  return ok(env);
}
async function codeInfo(env, b, ip) {
  if (await blocked(env, 'r', ip)) return err(env, 429, TOO_MANY);
  const c = await first(env, 'SELECT * FROM codes WHERE code_hash=?', await sha(norm(b.code)));
  if (!c || !c.active) { await failed(env, 'r', ip); return err(env, 404, 'Mã không đúng hoặc đã bị vô hiệu hóa.'); }
  if (c.expires_at && Date.now() >= c.expires_at) return err(env, 410, 'Mã này đã hết hạn.');
  return ok(env, { plan: c.plan, left: c.max_uses == null ? null : Math.max(0, c.max_uses - c.used), days: c.days, until: c.expires_at });
}


/* ---------- Contributor ---------- */
const CT_TABLES = [
  'CREATE TABLE IF NOT EXISTS contributors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_key TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT \'pending\', pend_hash TEXT, ticket_hash TEXT, ticket_plain TEXT, session_hash TEXT, created_at INTEGER NOT NULL, decided_at INTEGER)',
  'CREATE TABLE IF NOT EXISTS contrib_subs (id INTEGER PRIMARY KEY AUTOINCREMENT, contributor_id INTEGER NOT NULL, title TEXT NOT NULL, data TEXT NOT NULL, status TEXT NOT NULL DEFAULT \'pending\', note TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS contrib_packs (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, data TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS community_docs (id INTEGER PRIMARY KEY AUTOINCREMENT, contributor_id INTEGER NOT NULL, author TEXT NOT NULL, title TEXT NOT NULL, html TEXT NOT NULL, snippet TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)'
];
const genTicket = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', g = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), x => A[x % A.length]).join(''); return 'CTB-' + g(4) + '-' + g(4) + '-' + g(4); };
const txt = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);
function cleanQs(a) {
  if (!Array.isArray(a) || !a.length) return null;
  if (a.length > 500) return null;
  const out = [], seen = new Set();
  for (const r of a) {
    if (!Array.isArray(r) || r.length < 4) return null;
    const id = txt(r[0], 40), qt = txt(r[1], 1000), op = Array.isArray(r[2]) ? r[2].slice(0, 4).map(x => txt(x, 500)) : [], an = String(r[3] || '').toUpperCase();
    if (!id || !qt || op.length !== 4 || op.some(x => !x) || !'ABCD'.includes(an) || an.length !== 1) return null;
    if (seen.has(id)) continue; seen.add(id);
    out.push([id, qt, op, an]);
  }
  return out;
}
/* Phần II: [id, tư liệu, [[mệnh đề, 1|0] x4], {block, detect}] */
function cleanP2(a) {
  if (a == null) return [];
  if (!Array.isArray(a) || a.length > 500) return null;
  const out = [], seen = new Set();
  for (const r of a) {
    if (!Array.isArray(r) || r.length < 3) return null;
    const id = txt(r[0], 40), tl = txt(r[1], 4000);
    const sts = Array.isArray(r[2]) ? r[2].slice(0, 4).map(s => Array.isArray(s) ? [txt(s[0], 800), s[1] ? 1 : 0] : null) : [];
    if (!id || !tl || sts.length !== 4 || sts.some(s => !s || !s[0])) return null;
    if (seen.has(id)) continue; seen.add(id);
    const m = r[3] && typeof r[3] === 'object' ? r[3] : {};
    out.push([id, tl, sts, { block: txt(m.block, 60) || 'BX_' + id, detect: Array.isArray(m.detect) ? m.detect.slice(0, 4).map(x => txt(x, 120)).filter(Boolean) : [] }]);
  }
  return out;
}
/* Cột data: mảng Phần I (dữ liệu cũ) hoặc {q, p2} khi có Phần II */
const packData = (qs, p2) => JSON.stringify(p2 && p2.length ? { q: qs, p2 } : qs);
const unpack = raw => { const d = JSON.parse(raw); return Array.isArray(d) ? { q: d, p2: [] } : { q: d.q || [], p2: d.p2 || [] }; };
const mergeQs = (...lists) => { const m = new Map(); lists.forEach(l => (l || []).forEach(r => m.set(r[0], r))); return [...m.values()]; };

/* ---------- Cộng đồng: tài liệu văn bản (HTML) ----------
   Bộ lọc danh sách cho phép (allowlist). Trình duyệt vẫn lọc lại lần nữa khi hiển thị (js/sqdoc.js). */
const CM_MAX = 200000, CM_PER_USER = 40;
const DOC_TAGS = new Set('p div span br b strong i em u s strike sub sup h1 h2 h3 h4 ul ol li blockquote pre code a table thead tbody tr td th hr mark'.split(' '));
const DOC_DROP = new Set(['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'svg', 'math', 'form', 'textarea', 'select', 'option', 'button', 'input', 'link', 'meta', 'title', 'head']);
const DOC_VOID = new Set(['br', 'hr']);
const DOC_DATA = new Set(['data-k', 'data-id', 'data-a', 'data-v', 'data-l', 'data-t']);
const ent = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unent = s => String(s).replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function okStyle(css) {
  const out = [];
  String(css || '').split(';').forEach(d => {
    const i = d.indexOf(':'); if (i < 1) return;
    const k = d.slice(0, i).trim().toLowerCase(), v = unent(d.slice(i + 1)).trim().toLowerCase();
    if (!v || v.length > 80 || /url\s*\(|expression|[\\@<>{}]|javascript|\/\*/.test(v)) return;
    const col = /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.\s,%]+\)|[a-z]{3,20})$/;
    if ((k === 'color' || k === 'background-color') && col.test(v)) out.push(k + ':' + v);
    else if (k === 'font-size' && /^\d{1,2}(\.\d+)?(px|pt|em|rem|%)$/.test(v) && parseFloat(v) > 0 && parseFloat(v) <= (/px|pt/.test(v) ? 96 : 6)) out.push(k + ':' + v);
    else if (k === 'font-family' && /^[a-z0-9\s,'"-]+$/.test(v)) out.push(k + ':' + v);
    else if (k === 'text-align' && /^(left|right|center|justify)$/.test(v)) out.push(k + ':' + v);
    else if (k === 'font-weight' && /^(normal|bold|[1-9]00)$/.test(v)) out.push(k + ':' + v);
    else if (k === 'font-style' && /^(normal|italic)$/.test(v)) out.push(k + ':' + v);
    else if (k === 'text-decoration' && /^(none|underline|line-through|underline line-through|line-through underline)$/.test(v)) out.push(k + ':' + v);
    else if (k === 'letter-spacing' && /^-?\d(\.\d+)?(px|em)$/.test(v)) out.push(k + ':' + v);
    else if (k === 'margin-left' && /^\d{1,3}px$/.test(v) && parseInt(v) <= 240) out.push(k + ':' + v);
  });
  return out.join(';');
}
function okHref(u) { u = unent(u).trim(); return /^https?:\/\/[^\s<>"']{1,1000}$/i.test(u) ? u : ''; }
function cleanDocHtml(html) {
  html = String(html == null ? '' : html).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/<!--[\s\S]*?-->/g, '');
  if (html.length > CM_MAX) return null;
  let out = '', pos = 0, skipUntil = null; const stack = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
  let m;
  while ((m = re.exec(html))) {
    if (skipUntil === null) out += html.slice(pos, m.index).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    pos = re.lastIndex;
    const close = m[1] === '/', tag = m[2].toLowerCase();
    if (skipUntil !== null) { if (close && tag === skipUntil) skipUntil = null; continue; }
    if (DOC_DROP.has(tag)) { if (!close && !DOC_VOID.has(tag) && !/\/\s*$/.test(m[3])) skipUntil = tag; continue; }
    if (!DOC_TAGS.has(tag)) continue;
    if (close) { const i = stack.lastIndexOf(tag); if (i >= 0) { while (stack.length > i) out += '</' + stack.pop() + '>'; } continue; }
    let attrs = '', href = '';
    const ar = /([a-zA-Z_:][-\w:.]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g; let a;
    while ((a = ar.exec(m[3]))) {
      const n = a[1].toLowerCase(), v = a[3] != null ? a[3] : a[4] != null ? a[4] : a[5] != null ? a[5] : '';
      if (n === 'class') { const c = unent(v).split(/\s+/).filter(x => /^(sqd|fx|n)-[a-z0-9_-]{1,30}$/.test(x)).join(' '); if (c) attrs += ' class="' + c + '"'; }
      else if (n === 'style') { const c = okStyle(v); if (c) attrs += ' style="' + ent(c) + '"'; }
      else if (n === 'href' && tag === 'a') href = okHref(v);
      else if (DOC_DATA.has(n)) attrs += ' ' + n + '="' + ent(unent(v).slice(0, 60)) + '"';
      else if ((n === 'colspan' || n === 'rowspan') && /^[1-9]\d?$/.test(v) && (tag === 'td' || tag === 'th')) attrs += ' ' + n + '="' + v + '"';
    }
    if (tag === 'a') { if (!href) continue; attrs += ' href="' + ent(href) + '" target="_blank" rel="noopener noreferrer nofollow"'; }
    out += '<' + tag + attrs + (DOC_VOID.has(tag) ? '>' : '>');
    if (!DOC_VOID.has(tag)) stack.push(tag);
  }
  if (skipUntil === null) out += html.slice(pos).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  while (stack.length) out += '</' + stack.pop() + '>';
  return out;
}
const docText = h => unent(String(h).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const docHead = raw => {
  const m = String(raw || '').match(/^<!--sqdoc1((?:;[a-z]+=[#\w]+)*)-->/); let bg = '', ink = '';
  if (m && m[1]) m[1].split(';').forEach(kv => { const [k, v] = kv.split('='); if (/^(transparent|#[0-9a-fA-F]{3,8})$/.test(v || '')) { if (k === 'bg') bg = v; if (k === 'ink') ink = v; } });
  return '<!--sqdoc1' + (bg ? ';bg=' + bg : '') + (ink ? ';ink=' + ink : '') + '-->';
};

async function ctMe(env, req) {
  const t = req.headers.get('x-contrib') || '';
  if (!t) return null;
  await ensure(env);
  const r = await first(env, 'SELECT * FROM contributors WHERE session_hash=? AND status=\'approved\'', await sha('ctb:' + t));
  return r || null;
}
async function contrib(env, req, path, b, ip) {
  await ensure(env);
  const now = Date.now();
  if (path === '/api/contrib/register') {
    if (await blocked(env, 'c', ip)) return err(env, 429, TOO_MANY);
    const name = txt(b.name, 30).replace(/\s+/g, ' ');
    if (name.length < 2) return err(env, 400, 'Tên cần từ 2 đến 30 ký tự.');
    const key = name.toLowerCase();
    const ex = await first(env, 'SELECT id,status FROM contributors WHERE name_key=?', key);
    if (ex && ex.status !== 'rejected') return err(env, 409, 'Tên này đã được đăng ký. Hãy chọn tên khác.');
    if (ex) await q(env, 'DELETE FROM contributors WHERE id=?', ex.id).run();
    await failed(env, 'c', ip);
    const pend = rnd(16);
    await q(env, 'INSERT INTO contributors(name,name_key,status,pend_hash,created_at) VALUES(?,?,\'pending\',?,?)', name, key, await sha('pend:' + pend), now).run();
    return ok(env, { pend, name });
  }
  if (path === '/api/contrib/status') {
    const r = await first(env, 'SELECT * FROM contributors WHERE pend_hash=?', await sha('pend:' + String(b.pend || '')));
    if (!r) return err(env, 404, 'Không tìm thấy đăng ký này.');
    return ok(env, { status: r.status, name: r.name, ticket: r.status === 'approved' ? r.ticket_plain : null });
  }
  if (path === '/api/contrib/claim') {
    if (await blocked(env, 'c', ip)) return err(env, 429, TOO_MANY);
    const t = norm(b.ticket);
    const r = t ? await first(env, 'SELECT * FROM contributors WHERE ticket_hash=? AND status=\'approved\'', await sha('tk:' + t)) : null;
    if (!r) { await failed(env, 'c', ip); return err(env, 404, 'Vé không đúng hoặc đã được dùng.'); }
    const tok = rnd(32);
    await q(env, 'UPDATE contributors SET session_hash=?, ticket_hash=NULL, ticket_plain=NULL WHERE id=?', await sha('ctb:' + tok), r.id).run();
    return ok(env, { token: tok, name: r.name });
  }
  if (path === '/api/contrib/packs') {
    const rows = (await q(env, 'SELECT id,name,data,updated_at FROM contrib_packs WHERE published=1 ORDER BY id').all()).results;
    return ok(env, { packs: rows.map(x => ({ id: x.id, name: x.name, questions: unpack(x.data).q, part2: unpack(x.data).p2, at: x.updated_at })) });
  }
  if (path === '/api/contrib/community') {
    const rows = (await q(env, 'SELECT id,author,title,snippet,LENGTH(html) AS size,created_at,updated_at FROM community_docs ORDER BY updated_at DESC LIMIT 300').all()).results;
    return ok(env, { docs: rows.map(x => ({ id: x.id, author: x.author, title: x.title, snippet: x.snippet || '', size: x.size, at: x.updated_at })) });
  }
  if (path === '/api/contrib/community-get') {
    const r = await first(env, 'SELECT id,contributor_id,author,title,html,created_at,updated_at FROM community_docs WHERE id=?', Number(b.id));
    if (!r) return err(env, 404, 'Không tìm thấy bài này (có thể tác giả đã gỡ).');
    const meRow = await ctMe(env, req);
    return ok(env, { doc: { id: r.id, author: r.author, title: r.title, html: r.html, at: r.updated_at, created: r.created_at }, mine: !!(meRow && meRow.id === r.contributor_id) });
  }
  const me = await ctMe(env, req);
  if (!me) return err(env, 401, 'Chưa đăng nhập Contributor. Cần có tên Contributor mới đăng được lên cộng đồng.');
  if (path === '/api/contrib/me') return ok(env, { name: me.name });
  if (path === '/api/contrib/logout') { await q(env, 'UPDATE contributors SET session_hash=NULL WHERE id=?', me.id).run(); return ok(env); }
  if (path === '/api/contrib/mine') {
    const rows = (await q(env, 'SELECT id,title,data,status,note,updated_at FROM contrib_subs WHERE contributor_id=? ORDER BY id DESC LIMIT 100', me.id).all()).results;
    return ok(env, { subs: rows.map(x => ({ id: x.id, title: x.title, status: x.status, note: x.note || '', at: x.updated_at, questions: unpack(x.data).q, part2: unpack(x.data).p2 })) });
  }
  if (path === '/api/contrib/submit') {
    const p2 = cleanP2(b.part2), title = txt(b.title, 80);
    const qs = (Array.isArray(b.questions) && !b.questions.length && p2 && p2.length) ? [] : cleanQs(b.questions);
    if (!title) return err(env, 400, 'Hãy đặt tên cho bộ đề.');
    if (!p2) return err(env, 400, 'Phần II không hợp lệ (mỗi câu cần ID, tư liệu và đủ 4 mệnh đề a–d có Đúng/Sai).');
    if (!qs) return err(env, 400, 'Bộ đề không hợp lệ (cần 1–500 câu, mỗi câu có ID, nội dung, 4 đáp án và đáp án đúng).');
    const n = await first(env, 'SELECT COUNT(*) AS n FROM contrib_subs WHERE contributor_id=? AND status=\'pending\'', me.id);
    if (b.id) {
      const up = await q(env, 'UPDATE contrib_subs SET title=?,data=?,status=\'pending\',note=NULL,updated_at=? WHERE id=? AND contributor_id=? AND status<>\'approved\'', title, packData(qs, p2), now, Number(b.id), me.id).run();
      if (!up.meta.changes) return err(env, 400, 'Không sửa được bộ đề này (đã được duyệt).');
      return ok(env, { id: Number(b.id), count: qs.length + p2.length, p1: qs.length, p2: p2.length });
    }
    if (n && n.n >= 10) return err(env, 429, 'Bạn đang có 10 bộ đề chờ duyệt. Hãy đợi admin xử lý bớt.');
    const r = await q(env, 'INSERT INTO contrib_subs(contributor_id,title,data,created_at,updated_at) VALUES(?,?,?,?,?)', me.id, title, packData(qs, p2), now, now).run();
    return ok(env, { id: r.meta.last_row_id, count: qs.length + p2.length, p1: qs.length, p2: p2.length });
  }
  if (path === '/api/contrib/community-mine') {
    const rows = (await q(env, 'SELECT id,title,snippet,LENGTH(html) AS size,updated_at FROM community_docs WHERE contributor_id=? ORDER BY updated_at DESC LIMIT 100', me.id).all()).results;
    return ok(env, { docs: rows.map(x => ({ id: x.id, title: x.title, snippet: x.snippet || '', size: x.size, at: x.updated_at })) });
  }
  if (path === '/api/contrib/community-publish') {
    const title = txt(b.title, 80);
    if (!title) return err(env, 400, 'Hãy đặt tên cho tài liệu.');
    let html = String(b.html == null ? '' : b.html);
    if (html.length > CM_MAX) return err(env, 400, 'Tài liệu quá dài (tối đa ' + CM_MAX / 1000 + 'k ký tự).');
    const head = docHead(html);
    html = cleanDocHtml(html);
    if (html == null) return err(env, 400, 'Tài liệu quá dài.');
    const plain = docText(html);
    if (!plain && !/<(table|hr)|sqd-q/.test(html)) return err(env, 400, 'Tài liệu đang trống.');
    html = head + html;
    const snippet = plain.slice(0, 160);
    if (b.id) {
      const up = await q(env, 'UPDATE community_docs SET title=?,html=?,snippet=?,author=?,updated_at=? WHERE id=? AND contributor_id=?', title, html, snippet, me.name, now, Number(b.id), me.id).run();
      if (!up.meta.changes) return err(env, 404, 'Không sửa được bài này (không phải bài của bạn hoặc đã bị gỡ).');
      return ok(env, { id: Number(b.id), updated: true });
    }
    const n = await first(env, 'SELECT COUNT(*) AS n FROM community_docs WHERE contributor_id=?', me.id);
    if (n && n.n >= CM_PER_USER) return err(env, 429, 'Bạn đã đăng ' + CM_PER_USER + ' bài. Hãy gỡ bớt bài cũ trước khi đăng thêm.');
    const r = await q(env, 'INSERT INTO community_docs(contributor_id,author,title,html,snippet,created_at,updated_at) VALUES(?,?,?,?,?,?,?)', me.id, me.name, title, html, snippet, now, now).run();
    return ok(env, { id: r.meta.last_row_id, updated: false });
  }
  if (path === '/api/contrib/community-delete') {
    const r = await q(env, 'DELETE FROM community_docs WHERE id=? AND contributor_id=?', Number(b.id), me.id).run();
    if (!r.meta.changes) return err(env, 404, 'Không gỡ được bài này.');
    return ok(env);
  }
  return err(env, 404, 'Không có API này.');
}
const idList = b => (Array.isArray(b.ids) ? b.ids : [b.id]).map(Number).filter(Number.isFinite).slice(0, 500);
async function delIds(env, table, ids) { for (let i = 0; i < ids.length; i += 50) { const c = ids.slice(i, i + 50); await q(env, 'DELETE FROM ' + table + ' WHERE id IN (' + c.map(() => '?').join(',') + ')', ...c).run(); } return ids.length; }
async function ctAdmin(env, path, b) {
  const now = Date.now();
  if (path === '/api/admin/ct-list') {
    const accounts = (await q(env, 'SELECT id,name,status,ticket_plain,created_at,decided_at,(session_hash IS NOT NULL) AS active FROM contributors ORDER BY id DESC LIMIT 300').all()).results;
    const subs = (await q(env, 'SELECT s.id,s.title,s.status,s.note,s.data,s.updated_at,c.name AS who FROM contrib_subs s LEFT JOIN contributors c ON c.id=s.contributor_id ORDER BY s.id DESC LIMIT 300').all()).results.map(x => ({ id: x.id, title: x.title, status: x.status, note: x.note || '', who: x.who, at: x.updated_at, questions: unpack(x.data).q, part2: unpack(x.data).p2 }));
    const packs = (await q(env, 'SELECT id,name,data,published,updated_at FROM contrib_packs ORDER BY id DESC').all()).results.map(x => ({ id: x.id, name: x.name, published: !!x.published, at: x.updated_at, questions: unpack(x.data).q, part2: unpack(x.data).p2 }));
    const st = async (t) => (await first(env, 'SELECT COUNT(*) AS n, COALESCE(SUM(LENGTH(data)),0) AS bytes FROM ' + t)) || { n: 0, bytes: 0 };
    return ok(env, { accounts, subs, packs, stats: { subs: await st('contrib_subs'), packs: await st('contrib_packs'), accounts: accounts.length } });
  }
  if (path === '/api/admin/ct-account') {
    const id = Number(b.id), act = b.action;
    if (act === 'approve' || act === 'reissue') {
      const t = genTicket();
      await q(env, 'UPDATE contributors SET status=\'approved\', ticket_hash=?, ticket_plain=?, decided_at=? WHERE id=?', await sha('tk:' + t), t, now, id).run();
      return ok(env, { ticket: t });
    }
    if (act === 'reject') { await q(env, 'UPDATE contributors SET status=\'rejected\', ticket_hash=NULL, ticket_plain=NULL, session_hash=NULL, decided_at=? WHERE id=?', now, id).run(); return ok(env); }
    if (act === 'logout') { await q(env, 'UPDATE contributors SET session_hash=NULL WHERE id=?', id).run(); return ok(env); }
    if (act === 'delete') { await q(env, 'DELETE FROM contrib_subs WHERE contributor_id=?', id).run(); await q(env, 'DELETE FROM contributors WHERE id=?', id).run(); return ok(env); }
    return err(env, 400, 'Hành động không hợp lệ.');
  }
  if (path === '/api/admin/ct-sub') {
    const id = Number(b.id);
    if (b.action === 'delete' && Array.isArray(b.ids)) return ok(env, { deleted: await delIds(env, 'contrib_subs', idList(b)) });
    if (b.action === 'reject') { await q(env, 'UPDATE contrib_subs SET status=\'rejected\', note=?, updated_at=? WHERE id=?', txt(b.note, 200), now, id).run(); return ok(env); }
    if (b.action === 'delete') { await q(env, 'DELETE FROM contrib_subs WHERE id=?', id).run(); return ok(env); }
    return err(env, 400, 'Hành động không hợp lệ.');
  }
  if (path === '/api/admin/ct-pack-create') {
    const ids = (Array.isArray(b.sub_ids) ? b.sub_ids : []).map(Number).filter(Boolean);
    const packIds = (Array.isArray(b.pack_ids) ? b.pack_ids : []).map(Number).filter(Boolean);
    if (!ids.length && !packIds.length) return err(env, 400, 'Hãy chọn ít nhất một bộ đề.');
    const lists = [];
    for (const i of packIds) { const r = await first(env, 'SELECT data FROM contrib_packs WHERE id=?', i); if (r) lists.push(unpack(r.data)); }
    for (const i of ids) { const r = await first(env, 'SELECT data FROM contrib_subs WHERE id=?', i); if (r) lists.push(unpack(r.data)); }
    const qs = mergeQs(...lists.map(l => l.q)), p2 = mergeQs(...lists.map(l => l.p2));
    if (!qs.length && !p2.length) return err(env, 400, 'Không có câu hỏi nào để gộp.');
    const name = txt(b.name, 80) || 'Gói mới';
    let pid = Number(b.into) || 0;
    if (pid) {
      const cur = await first(env, 'SELECT data FROM contrib_packs WHERE id=?', pid);
      if (!cur) return err(env, 404, 'Không thấy gói để gộp vào.');
      await q(env, 'UPDATE contrib_packs SET data=?, name=?, updated_at=? WHERE id=?', (() => { const c = unpack(cur.data); return packData(mergeQs(c.q, qs), mergeQs(c.p2, p2)); })(), name, now, pid).run();
    } else {
      const r = await q(env, 'INSERT INTO contrib_packs(name,data,published,created_at,updated_at) VALUES(?,?,1,?,?)', name, packData(qs, p2), now, now).run();
      pid = r.meta.last_row_id;
    }
    for (const i of ids) await q(env, 'UPDATE contrib_subs SET status=\'approved\', updated_at=? WHERE id=?', now, i).run();
    return ok(env, { id: pid, count: qs.length + p2.length });
  }
  if (path === '/api/admin/ct-pack-update') {
    const id = Number(b.id), sets = [], vals = [];
    if ('name' in b) { sets.push('name=?'); vals.push(txt(b.name, 80) || 'Gói'); }
    if ('published' in b) { sets.push('published=?'); vals.push(b.published ? 1 : 0); }
    if ('questions' in b || 'part2' in b) {
      const cur = await first(env, 'SELECT data FROM contrib_packs WHERE id=?', id); if (!cur) return err(env, 404, 'Không thấy gói.');
      const old = unpack(cur.data), qs = 'questions' in b ? cleanQs(b.questions) : old.q, p2 = 'part2' in b ? cleanP2(b.part2) : old.p2;
      if (!qs || !p2) return err(env, 400, 'Dữ liệu câu hỏi không hợp lệ.');
      sets.push('data=?'); vals.push(packData(qs, p2));
    }
    if (!sets.length) return err(env, 400, 'Không có gì để sửa.');
    sets.push('updated_at=?'); vals.push(now);
    await q(env, 'UPDATE contrib_packs SET ' + sets.join(',') + ' WHERE id=?', ...vals, id).run();
    return ok(env);
  }
  if (path === '/api/admin/ct-pack-delete') return ok(env, { deleted: await delIds(env, 'contrib_packs', idList(b)) });
  if (path === '/api/admin/ct-community') {
    const rows = (await q(env, 'SELECT id,author,title,snippet,LENGTH(html) AS size,updated_at FROM community_docs ORDER BY updated_at DESC LIMIT 300').all()).results;
    return ok(env, { docs: rows.map(x => ({ id: x.id, author: x.author, title: x.title, snippet: x.snippet || '', size: x.size, at: x.updated_at })) });
  }
  if (path === '/api/admin/ct-community-delete') return ok(env, { deleted: await delIds(env, 'community_docs', idList(b)) });
  if (path === '/api/admin/ct-purge') {
    let r;
    if (b.what === 'approved') r = await q(env, 'DELETE FROM contrib_subs WHERE status=\'approved\'').run();
    else if (b.what === 'rejected') r = await q(env, 'DELETE FROM contrib_subs WHERE status=\'rejected\'').run();
    else if (b.what === 'old') r = await q(env, 'DELETE FROM contrib_subs WHERE updated_at<?', now - Math.max(1, Number(b.days) || 30) * 864e5).run();
    else if (b.what === 'hidden_packs') r = await q(env, 'DELETE FROM contrib_packs WHERE published=0').run();
    else if (b.what === 'accounts') r = await q(env, 'DELETE FROM contributors WHERE status=\'rejected\'').run();
    else return err(env, 400, 'Kiểu dọn không hợp lệ.');
    return ok(env, { deleted: r.meta.changes || 0 });
  }
  return null;
}

/* ---------- admin ---------- */
const epoch = env => String(env.ADMIN_EPOCH || '1');
const MAX_SESS = 10;
let _ready = false;
async function ensure(env) {
  if (_ready) return;
  await q(env, 'CREATE TABLE IF NOT EXISTS admin_sessions (session_hash TEXT PRIMARY KEY, epoch TEXT NOT NULL, label TEXT, created_at INTEGER NOT NULL, last_seen INTEGER, owner INTEGER NOT NULL DEFAULT 0)').run();
  try { await q(env, 'ALTER TABLE admin_sessions ADD COLUMN owner INTEGER NOT NULL DEFAULT 0').run(); } catch (e) {}
  const old = await first(env, 'SELECT epoch, session_hash FROM admin_state WHERE id=1');
  if (old && old.session_hash) await q(env, 'INSERT OR IGNORE INTO admin_sessions(session_hash,epoch,label,created_at,last_seen) VALUES(?,?,?,?,?)', old.session_hash, old.epoch || '1', 'Phiên cũ', Date.now(), Date.now()).run();
  const ep = epoch(env), has = await first(env, 'SELECT 1 AS x FROM admin_sessions WHERE epoch=? AND owner=1', ep);
  if (!has) await q(env, 'UPDATE admin_sessions SET owner=1 WHERE session_hash=(SELECT session_hash FROM admin_sessions WHERE epoch=? ORDER BY created_at LIMIT 1)', ep).run();
  for (const t of CT_TABLES) await q(env, t).run();
  _ready = true;
}
async function adminState(env) { return first(env, 'SELECT * FROM admin_state WHERE id=1'); }
async function adminHash(env, req) {
  const tok = req.headers.get('x-admin') || '';
  if (!tok || !env.ADMIN_HASH) return null;
  await ensure(env);
  const h = await sha('adm:' + tok);
  const r = await first(env, 'SELECT last_seen FROM admin_sessions WHERE session_hash=? AND epoch=?', h, epoch(env));
  if (!r) return null;
  if (!r.last_seen || Date.now() - r.last_seen > 300000) await q(env, 'UPDATE admin_sessions SET last_seen=? WHERE session_hash=?', Date.now(), h).run();
  return h;
}
const isAdmin = async (env, req) => !!(await adminHash(env, req));
async function addSession(env, label, owner) {
  const tok = rnd(32), now = Date.now();
  await q(env, 'INSERT INTO admin_sessions(session_hash,epoch,label,created_at,last_seen,owner) VALUES(?,?,?,?,?,?)', await sha('adm:' + tok), epoch(env), String(label || '').slice(0, 80), now, now, owner ? 1 : 0).run();
  await q(env, 'DELETE FROM admin_sessions WHERE epoch=? AND owner=0 AND session_hash NOT IN (SELECT session_hash FROM admin_sessions WHERE epoch=? AND owner=0 ORDER BY created_at DESC LIMIT ?)', epoch(env), epoch(env), MAX_SESS).run();
  await q(env, 'INSERT INTO admin_state(id,epoch,session_hash,transfer_hash,transfer_exp) VALUES(1,?,NULL,NULL,NULL) ON CONFLICT(id) DO UPDATE SET epoch=excluded.epoch, session_hash=NULL, transfer_hash=NULL, transfer_exp=NULL', epoch(env)).run();
  return tok;
}
async function adminClaim(env, b, ip) {
  if (!env.ADMIN_HASH) return err(env, 503, 'Chưa cấu hình ADMIN_HASH cho Worker.');
  if (await blocked(env, 'a', ip)) return err(env, 429, TOO_MANY);
  await ensure(env);
  if ((await sha(norm(b.code))) !== String(env.ADMIN_HASH).toLowerCase()) { await failed(env, 'a', ip); return err(env, 403, 'Mã admin không đúng.'); }
  const n = await first(env, 'SELECT COUNT(*) AS n FROM admin_sessions WHERE epoch=?', epoch(env));
  if (n && n.n > 0) return err(env, 403, 'Mã admin đã được kích hoạt. Hãy mở link thêm thiết bị do admin hiện tại tạo.');
  return ok(env, { token: await addSession(env, b.label, true) });
}
async function adminTransfer(env) {
  const t = rnd(20);
  await q(env, 'INSERT INTO admin_state(id,epoch,session_hash,transfer_hash,transfer_exp) VALUES(1,?,NULL,?,?) ON CONFLICT(id) DO UPDATE SET epoch=excluded.epoch, transfer_hash=excluded.transfer_hash, transfer_exp=excluded.transfer_exp', epoch(env), await sha('tr:' + t), Date.now() + 5 * 60000).run();
  return ok(env, { transfer: t, minutes: 5 });
}
async function adminAccept(env, b, ip) {
  if (await blocked(env, 'a', ip)) return err(env, 429, TOO_MANY);
  await ensure(env);
  const st = await adminState(env), now = Date.now();
  const good = st && st.epoch === epoch(env) && st.transfer_hash && st.transfer_exp > now && (await sha('tr:' + String(b.transfer || ''))) === st.transfer_hash;
  if (!good) { await failed(env, 'a', ip); return err(env, 403, 'Link thêm admin không đúng hoặc đã hết hạn.'); }
  return ok(env, { token: await addSession(env, b.label) });
}
const genCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', g = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), x => A[x % A.length]).join(''); return 'NTZ-' + g(4) + '-' + g(4) + '-' + g(4); };
const intOrNull = v => (v === '' || v == null) ? null : Math.max(0, Math.floor(Number(v)));

async function admin(env, req, path, b) {
  if (path === '/api/admin/claim') return adminClaim(env, b, req.headers.get('cf-connecting-ip') || 'x');
  if (path === '/api/admin/accept') return adminAccept(env, b, req.headers.get('cf-connecting-ip') || 'x');
  const me = await adminHash(env, req);
  if (!me) return err(env, 401, 'Chưa đăng nhập admin.');
  const meRow = await first(env, 'SELECT owner FROM admin_sessions WHERE session_hash=?', me), isOwner = !!(meRow && meRow.owner);
  const OWN = 'Chỉ admin chủ mới làm được việc này.';
  if (path === '/api/admin/transfer') return isOwner ? adminTransfer(env) : err(env, 403, OWN);
  if (path === '/api/admin/list') {
    const codes = (await q(env, 'SELECT id,code_plain,plan,max_uses,used,expires_at,days,active,note,created_at,substr(code_hash,1,8) AS h FROM codes ORDER BY id DESC').all()).results;
    const keys = (await q(env, 'SELECT id,plan,expires_at,code_id,created_at,switches,switch_day,substr(key_hash,1,8) AS h FROM keys WHERE active=1 AND (expires_at IS NULL OR expires_at>?) ORDER BY id DESC LIMIT 500', Date.now()).all()).results;
    const sessions = (await q(env, 'SELECT substr(session_hash,1,12) AS h, label, created_at, last_seen, owner, session_hash FROM admin_sessions WHERE epoch=? ORDER BY created_at DESC', epoch(env)).all()).results.map(x => ({ h: x.h, label: x.label, created_at: x.created_at, last_seen: x.last_seen, owner: !!x.owner, me: x.session_hash === me }));
    return ok(env, { codes, keys, sessions, owner: !!(sessions.find(x => x.me) || {}).owner, now: Date.now() });
  }
  if (path === '/api/admin/create') {
    if (!(b.plan in R) || b.plan === 'basic') return err(env, 400, 'Gói phải là plus hoặc promax.');
    const code = norm(b.code) || genCode();
    if (code.length < 4) return err(env, 400, 'Mã quá ngắn (tối thiểu 4 ký tự).');
    try {
      await q(env, 'INSERT INTO codes(code_hash,code_plain,plan,max_uses,expires_at,days,note,created_at) VALUES(?,?,?,?,?,?,?,?)',
        await sha(code), code, b.plan, intOrNull(b.max_uses), intOrNull(b.expires_at), intOrNull(b.days), String(b.note || '').slice(0, 200), Date.now()).run();
    } catch (e) { return err(env, 409, 'Mã này đã tồn tại.'); }
    return ok(env, { code });
  }
  if (path === '/api/admin/update') {
    const sets = [], vals = [];
    if ('max_uses' in b) { sets.push('max_uses=?'); vals.push(intOrNull(b.max_uses)); }
    if ('expires_at' in b) { sets.push('expires_at=?'); vals.push(intOrNull(b.expires_at)); }
    if ('days' in b) { sets.push('days=?'); vals.push(intOrNull(b.days)); }
    if ('active' in b) { sets.push('active=?'); vals.push(b.active ? 1 : 0); }
    if ('note' in b) { sets.push('note=?'); vals.push(String(b.note || '').slice(0, 200)); }
    if (!sets.length) return err(env, 400, 'Không có gì để sửa.');
    await q(env, 'UPDATE codes SET ' + sets.join(',') + ' WHERE id=?', ...vals, Number(b.id)).run();
    return ok(env);
  }
  if (path === '/api/admin/delete') { await q(env, 'DELETE FROM codes WHERE id=?', Number(b.id)).run(); return ok(env); }
  if (path === '/api/admin/revoke-session') {
    if (!isOwner) return err(env, 403, OWN);
    const h = String(b.h || '');
    if (h.length < 8) return err(env, 400, 'Thiếu mã phiên.');
    await q(env, 'DELETE FROM admin_sessions WHERE epoch=? AND owner=0 AND substr(session_hash,1,?)=?', epoch(env), h.length, h).run();
    return ok(env);
  }
  if (path === '/api/admin/revoke-others') { if (!isOwner) return err(env, 403, OWN); await q(env, 'DELETE FROM admin_sessions WHERE epoch=? AND owner=0', epoch(env)).run(); return ok(env); }
  if (path === '/api/admin/set-owner') {
    if (!isOwner) return err(env, 403, OWN);
    const h = String(b.h || ''); if (h.length < 8) return err(env, 400, 'Thiếu mã phiên.');
    if (me.slice(0, h.length) === h && !b.owner) return err(env, 400, 'Không thể tự bỏ quyền chủ của chính mình.');
    await q(env, 'UPDATE admin_sessions SET owner=? WHERE epoch=? AND substr(session_hash,1,?)=?', b.owner ? 1 : 0, epoch(env), h.length, h).run();
    return ok(env);
  }
  if (path.startsWith('/api/admin/ct-')) { const r = await ctAdmin(env, path, b); if (r) return r; }
  if (path === '/api/admin/revoke-key') { await deadKey(env, Number(b.id), Date.now()); return ok(env); }
  return err(env, 404, 'Không có API này.');
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });
    const url = new URL(req.url), path = url.pathname;
    if (path === '/' || path === '/api/ping') return ok(env, { name: 'sq-codes' });
    if (req.method !== 'POST') return err(env, 405, 'Chỉ nhận POST.');
    let b = {}; try { b = await req.json(); } catch (e) {}
    const ip = req.headers.get('cf-connecting-ip') || 'x';
    try {
      if (path.startsWith('/api/admin/')) return await admin(env, req, path, b);
      if (path.startsWith('/api/contrib/')) return await contrib(env, req, path, b, ip);
      if (path === '/api/redeem') return await redeem(env, b, ip);
      if (path === '/api/activate-key' || path === '/api/rotate') return await moveKey(env, b, ip);
      if (path === '/api/status') return await status(env, b);
      if (path === '/api/deactivate') return await deactivate(env, b);
      if (path === '/api/code-info') return await codeInfo(env, b, ip);
    } catch (e) { return err(env, 500, 'Lỗi máy chủ.'); }
    return err(env, 404, 'Không có API này.');
  }
};
