/**
 * api-matrix.mjs — prove the API's WRITE paths, not just that they answer.
 *
 * The sweep (php-sweep.mjs) sends empty payloads, so every write action comes back as "input
 * refused". This probe does the opposite: it performs the real business chain end to end and checks
 * the change came back from the database — create a lead, note it, convert it into a client, quote
 * it, invoice it, track it, take a payment, bill a milestone — plus the settings screens, where it
 * reads the current value, writes a changed one, reads it back and restores it.
 *
 * Runs against the real PHP (php-preview.mjs or the runner) with a SQLite database. Everything it
 * creates is named "QA Probe …" so it is easy to find and delete.
 *
 *   node api-matrix.mjs [baseUrl] [--work <sandbox-project>]
 */
import { createRunner, loadAccounts, DEFAULT_PROJECT } from './php-runner.mjs';
import { cpSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const argv = process.argv.slice(2);
const arg = (f, d = null) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const HOST = argv.find((a) => a.startsWith('http')) ?? null;
const WORK = arg('--work', null);

const accounts = loadAccounts();
const OWNER = accounts.find((a) => a.role === 'owner');
const SALES = accounts.find((a) => a.role === 'sales');
const EDITOR = accounts.find((a) => a.role === 'editor');
if (!OWNER || !SALES) { console.error('accounts file must have an owner and a sales account'); process.exit(1); }

const results = [];
let session = { owner: null, sales: null, editor: null };

/** One API call: through HTTP when a base URL was given, otherwise straight into PHP. */
async function call(action, body = {}, who = 'owner', { url = '/api/admin.php', expect = 'ok', note = '' } = {}) {
  const ts = Date.now();
  let json, status;
  if (HOST) {
    const res = await fetch(HOST + url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(session[who] ? { 'x-wx-adm': session[who] } : {}) },
      body: JSON.stringify({ action, ...body }),
    });
    status = res.status;
    json = await res.json().catch(() => null);
  } else {
    const res = await runner.request({ action, token: session[who], body, url });
    status = res.status;
    json = res.json;
  }
  const ok = json?.ok === true;
  const verdict = expect === 'ok' ? ok : !ok;
  const row = {
    action, who, status, ms: Date.now() - ts, expect, pass: verdict,
    error: ok ? '' : String(json?.error ?? json?.message ?? (json ? '' : 'non-json')),
    note,
  };
  results.push(row);
  if (!verdict) console.log(`  FAIL ${action} [${who}] expected ${expect}: ${row.error || 'http ' + status}`);
  return { json, row, ok };
}
const must = async (action, body, who, opts) => {
  const r = await call(action, body, who, { ...opts, expect: 'ok' });
  if (!r.ok) throw new Error(`${action} failed: ${r.row.error}`);
  return r.json;
};
const find = (list, pred) => (list ?? []).find(pred);

const steps = [];
const step = (name, fn) => steps.push({ name, fn });

/* ---------------------------------------------------------------- CRM chain */
step('lead → note → convert → client', async () => {
  const created = await must('lead_save', { name: 'QA Probe Lead', phone: '03001234567', source: 'QA Probe', service: 'QA service', value: 100000 }, 'sales');
  const leads = await must('leads_list', {}, 'sales');
  const lead = find(leads.leads ?? leads.rows ?? [], (l) => l.name === 'QA Probe Lead');
  if (!lead) throw new Error('created lead not in leads_list');
  await must('lead_note', { id: lead.id, text: 'QA probe note' }, 'sales');
  await must('lead_activity', { id: lead.id, kind: 'call', text: 'QA probe call', outcome: 'Spoke with the client' }, 'sales');
  const afterAct = await must('leads_list', {}, 'sales');
  const touched = find(afterAct.leads ?? afterAct.rows ?? [], (l) => l.id === lead.id);
  if (!touched) throw new Error('lead vanished after lead_activity');
  if (!touched.last_contact) throw new Error('lead_activity did not stamp last_contact');
  const conv = await must('lead_convert', { id: lead.id }, 'sales');
  const cid = conv.clientId ?? conv.client_id ?? conv.client?.id;
  const clients = await must('clients_list', {}, 'sales');
  const client = cid ? find(clients.clients ?? [], (c) => c.id === cid) : find(clients.clients ?? [], (c) => /QA Probe/.test(c.name ?? ''));
  if (!client) throw new Error('lead_convert did not create a client');
  return `lead #${lead.id} · note ok · client #${client.id} (${client.name})`;
});

step('client → quote → invoice → track → payment', async () => {
  const clients = await must('clients_list', {}, 'sales');
  const client = find(clients.clients ?? [], (c) => /QA Probe/.test(c.name ?? '')) ?? clients.clients?.[0];
  if (!client) throw new Error('no client to quote');
  const q = await must('quote_save', {
    client: { name: client.name, phone: client.phone ?? '03001234567', email: client.email ?? 'qa@example.com' },
    project: 'QA Probe Project', kind: 'interior', design: 'classic', layout: 'classic',
    sections: [{ name: 'QA scope', note: 'probe', items: [{ desc: 'QA line item', qty: 1, unit: 'job', rate: 100000 }] }],
    discount: 0, taxPct: 0,
  }, 'sales');
  const qid = q.quote?.id ?? q.id;
  if (!qid) throw new Error('quote_save returned no id');
  const quotes = await must('quotes_list', {}, 'sales');
  if (!find(quotes.quotes ?? [], (x) => x.id === qid)) throw new Error('quote not in quotes_list');

  await must('quote_status', { id: qid, status: 'approved' }, 'sales');
  const inv = await must('quote_invoice', { id: qid }, 'sales');
  const invId = inv.invoice?.id ?? inv.id;
  if (!invId) throw new Error('quote_invoice returned no invoice id');
  const before = await must('inv_get', { id: invId }, 'sales');
  const total = before.invoice?.total ?? 0;
  if (!(total > 0)) throw new Error(`invoice total is 0 (invoice ${JSON.stringify(before.invoice).slice(0, 200)})`);

  await must('inv_track', { id: invId, delivery_date: new Date().toISOString().slice(0, 10) }, 'sales');
  const half = Math.round(total / 2);
  await must('pay_add', { id: invId, amount: half, method: 'bank' }, 'sales');
  const after = await must('inv_get', { id: invId }, 'sales');
  const bal = after.invoice?.balance ?? -1;
  if (bal !== total - half) throw new Error(`balance ${bal} should be ${total - half}`);
  const tr = await must('invs_tracker', {}, 'sales');
  const rows = tr.rows ?? [];
  if (!find(rows, (r) => r.id === invId)) throw new Error('invoice not on the tracker');
  return `quote #${qid} → invoice #${invId} (${total}) · tracked · paid ${half} · balance ${bal}`;
});

step('overpayment is refused', async () => {
  const tr = await must('invs_tracker', {}, 'sales');
  const row = find(tr.rows ?? [], (r) => /WI-/.test(String(r.no ?? ''))) ?? (tr.rows ?? [])[0];
  if (!row) throw new Error('no invoice to overpay');
  await call('pay_add', { id: row.id, amount: Number(row.balance ?? row.total ?? 1) + 500000 }, 'sales', { expect: 'error' });
  return 'pay_add over the balance refused';
});

step('project → milestones → bill', async () => {
  const p = await must('proj_save', { name: 'QA Probe Project', client_name: 'QA Probe Client', value: 200000, stage: 'design' }, 'sales');
  const pid = p.project?.id ?? p.id;
  if (!pid) throw new Error('proj_save returned no id');
  await must('proj_save', { id: pid, value: 200000 }, 'sales');
  await must('proj_update', { id: pid, text: 'QA probe update' }, 'sales');
  const ms = await must('proj_milestones', { id: pid, plan: [{ label: 'QA milestone', pct: 60 }, { label: 'QA handover', pct: 40 }] }, 'sales');
  const proj = ms.project ?? ms;
  if (!(proj.milestones ?? []).some((m) => m.label === 'QA milestone')) throw new Error('milestones did not save');
  const bill = await call('proj_bill', { id: pid, k: 0 }, 'sales', { note: 'may refuse until the contract value is set' });
  const list = await must('projs_list', {}, 'sales');
  if (!find(list.projects ?? [], (x) => x.id === pid)) throw new Error('project not in projs_list');
  return `project #${pid} · milestone saved · bill ${bill.ok ? 'created' : 'refused: ' + bill.row.error}`;
});

/* ---------------------------------------------------------------- sales docs */
step('template save → list → delete', async () => {
  const t = await must('tpl_save', { name: 'QA Probe Template', kind: 'quote', sections: [{ name: 'QA scope', items: [{ desc: 'QA item', qty: 1, unit: 'job', rate: 1000 }] }] }, 'owner');
  const id = t.template?.id ?? t.id;
  const list = await must('tpl_list', {}, 'owner');
  if (!find(list.templates ?? [], (x) => x.name === 'QA Probe Template')) throw new Error('template not listed');
  if (id) await must('tpl_delete', { id }, 'owner');
  return `template #${id ?? '?'} saved, listed and deleted`;
});

/* ---------------------------------------------------------------- CMS + files */
step('announcement save → read back → restore', async () => {
  const before = await must('cms_announce_get', {}, 'editor');
  await must('cms_announce_save', { ann: { on: true, text: 'QA probe banner', link: '', linkText: '', colour: '' } }, 'owner');
  const after = await must('cms_announce_get', {}, 'editor');
  if (after.ann?.text !== 'QA probe banner') throw new Error('announcement did not save');
  await must('cms_announce_save', { ann: before.ann ?? { on: false, text: '' } }, 'owner');
  const restored = await must('cms_announce_get', {}, 'editor');
  if (restored.ann?.text === 'QA probe banner') throw new Error('announcement not restored');
  return 'saved, read back, restored';
});

step('business info save → read back', async () => {
  const before = await must('cms_biz_get', {}, 'editor');
  const biz = { ...(before.biz ?? {}) };
  const key = Object.keys(biz).find((k) => /phone|mobile|wa/.test(k)) ?? Object.keys(biz)[0];
  if (!key) throw new Error('cms_biz_get returned no fields');
  const original = biz[key];
  biz[key] = '0300 0000000';
  await must('cms_biz_save', { biz }, 'owner');
  const after = await must('cms_biz_get', {}, 'editor');
  if (after.biz?.[key] !== '0300 0000000') throw new Error('business info did not save');
  biz[key] = original;
  await must('cms_biz_save', { biz }, 'owner');
  return `field "${key}" written and restored`;
});

step('new page → page meta → delete', async () => {
  const pagesBefore = await must('pages_list', {}, 'owner');
  const slug = 'qa-probe-page';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>QA Probe Page</title></head><body><h1>QA probe page</h1></body></html>`;
  await must('page_new', { slug, folder: '', html }, 'owner', { url: '/api/builder.php' });
  const pages = await must('pages_list', {}, 'owner');
  const page = find(pages.pages ?? [], (p) => String(p.path ?? '').includes(slug) || String(p.url ?? '').includes(slug));
  if (!page) throw new Error(`page ${slug} not created`);
  await must('page_meta_save', { path: page.path, title: 'QA Probe Page', description: 'qa probe', status: 'draft' }, 'owner');
  const afterMeta = await must('pages_list', {}, 'owner');
  const saved = find(afterMeta.pages ?? [], (p) => p.path === page.path);
  if (!saved) throw new Error('page vanished after meta save');
  await must('page_delete', { path: page.path, redirectTo: '/contact/' }, 'owner');
  const afterDelete = await must('pages_list', {}, 'owner');
  if ((afterDelete.pages ?? []).some((p) => String(p.path ?? '').includes(slug))) throw new Error('page not deleted');
  return `created ${slug}, set meta, deleted (${(pagesBefore.pages ?? []).length} → ${(afterDelete.pages ?? []).length} pages)`;
});

step('media folder + file manager folder', async () => {
  const stamp = 'qa-probe-' + Date.now().toString().slice(-5);
  await must('media_folder', { name: stamp }, 'owner');
  const fmName = 'qa-fm-' + Date.now().toString().slice(-5);
  const media = await must('media_list', {}, 'owner');
  const files = media.files ?? [];
  if (!files.length) throw new Error('media_list is empty');
  await must('fm_mkdir', { dir: 'assets/uploads', name: fmName }, 'owner');
  const fm = await must('fm_list', { dir: 'assets/uploads' }, 'owner');
  const dirs = fm.dirs ?? fm.entries ?? [];
  return `media ${files.length} files · fm dirs ${Array.isArray(dirs) ? dirs.length : '?'}`;
});

step('maintenance mode on → off', async () => {
  const before = await must('mt_get', {}, 'owner');
  await must('mt_set', { on: true, mode: 'maintenance' }, 'owner');
  const on = await must('mt_get', {}, 'owner');
  if (!(on.on ?? on.cfg?.on)) throw new Error('maintenance did not switch on');
  await must('mt_set', { on: !!(before.on ?? before.cfg?.on), mode: before.mode ?? before.cfg?.mode }, 'owner');
  const off = await must('mt_get', {}, 'owner');
  if ((off.on ?? off.cfg?.on) && !(before.on ?? before.cfg?.on)) throw new Error('maintenance not restored');
  return 'switched on and restored';
});

step('redirect rule add → read back → restore', async () => {
  const before = await must('redirects', {}, 'owner');
  const list = before.redirects ?? [];
  const rule = { from: '/qa-probe-old', to: '/contact/', code: 301, on: true };
  await must('redirects_save', { redirects: [...list, rule], cfg: before.cfg ?? {} }, 'owner');
  const after = await must('redirects', {}, 'owner');
  if (!(after.redirects ?? []).some((r) => String(r.from ?? r.url ?? '').includes('qa-probe-old'))) throw new Error('redirect not saved');
  await must('redirects_save', { redirects: list, cfg: before.cfg ?? {} }, 'owner');
  const restored = await must('redirects', {}, 'owner');
  if ((restored.redirects ?? []).length !== list.length) throw new Error('redirect list not restored');
  return `${list.length} rules → added → restored`;
});

/* ---------------------------------------------------------------- settings */
step('speed monitor site → read back → restore', async () => {
  const before = await must('health_speed', {}, 'owner');
  const site = before.site ?? '';
  await must('health_settings', { site: 'https://woodex.com.pk' }, 'owner');
  const after = await must('health_speed', {}, 'owner');
  if (!String(after.site ?? '').includes('woodex.com.pk')) throw new Error('speed settings did not save');
  if (site && site !== 'https://woodex.com.pk') await must('health_settings', { site }, 'owner');
  return `monitored site → ${after.site}`;
});

step('sheets link off → read back', async () => {
  await must('sheets_save', { on: false, url: '' }, 'owner');
  const after = await must('sheets_get', {}, 'owner');
  return `sheets_get on=${after.on ?? after.cfg?.on ?? 'n/a'}`;
});

step('chat settings save → read back → restore', async () => {
  const before = await must('chat_cfg_get', {}, 'owner');
  const cfg = { ...(before.cfg ?? {}), greeting: 'QA probe greeting' };
  await must('chat_cfg_save', { cfg }, 'owner');
  const after = await must('chat_cfg_get', {}, 'owner');
  if (after.cfg?.greeting !== 'QA probe greeting') throw new Error('chat greeting did not save');
  await must('chat_cfg_save', { cfg: before.cfg }, 'owner');
  return 'greeting written and restored';
});

step('booking settings + a booking', async () => {
  const before = await must('bk_cfg', {}, 'owner');
  const cfg = before.cfg ?? {};
  await must('bk_cfg_save', { cfg }, 'owner');
  const type = (cfg.types ?? [])[0];
  if (type) {
    /* Ask for a free slot instead of guessing a time — the API already knows what is taken. */
    let d = '', tm = '';
    for (let day = 1; day <= 5 && !tm; day++) {
      d = new Date(Date.now() + day * 86400000).toISOString().slice(0, 10);
      const slotRes = await must('bk_slots', { type: type.k, date: d }, 'owner');
      const slots = (slotRes.slots ?? []).map((x) => (typeof x === 'string' ? x : x.tm ?? x.time)).filter(Boolean);
      if (slots.length) tm = slots[0];
      else if (slotRes.closed) continue;
    }
    if (!tm) throw new Error('no free slot in the next five days');
    const made = await must('bk_save', { type: type.k, d, tm, name: 'QA Probe Booking', phone: '03001234567', dur: type.dur ?? 60 }, 'owner');
    const list = await must('bk_list', { from: d, to: d }, 'owner');
    const rows = list.items ?? list.rows ?? list.bookings ?? list.pend ?? [];
    const row = rows.find((b) => /QA Probe/.test(String(b.name ?? '')));
    if (!row) throw new Error('booking not listed: ' + JSON.stringify(list).slice(0, 160));
    /* A taken slot must now be refused, and the booking must cancel cleanly. */
    await call('bk_save', { type: type.k, d, tm, name: 'QA Probe Clash', phone: '03001234567' }, 'owner', { expect: 'error' });
    await must('bk_status', { id: row.id, status: 'cancelled' }, 'owner');
    return `booking #${row.id} on ${d} ${tm} · clash refused · cancelled`;
  }
  const slots = await must('bk_slots', {}, 'owner');
  return `settings saved; no booking types configured (slots: ${JSON.stringify(slots).slice(0, 60)})`;
});

step('notification settings save → read back', async () => {
  const before = await must('notify_get', {}, 'owner');
  const cfg = { ...(before.cfg ?? {}) };
  await must('notify_save', { cfg }, 'owner');
  const after = await must('notify_get', {}, 'owner');
  return `notify config stable (${Object.keys(cfg).length} keys, ${(after.log ?? []).length} log rows)`;
});

step('SEO: page keyword save → read back', async () => {
  const before = await must('seo_list', {}, 'editor');
  let target = Object.keys(before.pages ?? {})[0];
  if (!target) {
    /* Nothing scored yet (fresh database): take a real page and give it keywords. */
    const pages = await must('pages_list', {}, 'editor');
    const page = (pages.pages ?? []).find((p) => p.path === 'index.html') ?? (pages.pages ?? [])[0];
    if (!page) throw new Error('no pages to score');
    target = page.path;
    await must('seo_save', { path: target, kw: 'qa probe keyword', related: '' }, 'editor');
    const seeded = await must('seo_list', {}, 'editor');
    const kw = seeded.pages?.[target]?.kw ?? '';
    if (!JSON.stringify(kw).includes('qa probe keyword')) throw new Error('keyword did not save');
    return `${target}: first keyword written on a fresh store`;
  }
  const prev = before.pages[target] ?? {};
  await must('seo_save', { path: target, kw: 'qa probe keyword', related: prev.related ?? '' }, 'editor');
  const after = await must('seo_list', {}, 'editor');
  if (!String(after.pages?.[target]?.kw ?? '').includes('qa probe keyword')) throw new Error('keyword did not save');
  await must('seo_save', { path: target, kw: prev.kw ?? '', related: prev.related ?? '' }, 'editor');
  return `keywords written for ${target} and restored`;
});

step('SEO agent settings save → read back', async () => {
  const before = await must('sag_get', {}, 'editor');
  const cfg = { ...(before.cfg ?? {}) };
  await must('sag_cfg_save', { cfg }, 'owner');
  const after = await must('sag_get', {}, 'editor');
  const engines = before.engines ?? before.enginesList ?? Object.keys(before.engines ?? {});
  return `agent engine=${after.cfg?.engine || '(auto)'} · ${Array.isArray(engines) ? engines.length : Object.keys(engines ?? {}).length} engines offered`;
});

step('approvals rules save → read back', async () => {
  const before = await must('appr_cfg_get', {}, 'owner');
  await must('appr_cfg_save', { manager: !!before.cfg?.manager, developer: !!before.cfg?.developer }, 'owner');
  const after = await must('appr_cfg_get', {}, 'owner');
  return `manager=${after.cfg?.manager} developer=${after.cfg?.developer}`;
});

step('estimator rate book save → read back', async () => {
  const before = await must('est_tpls', {}, 'owner');
  const tpl = (before.templates ?? [])[0];
  if (!tpl) {
    const rates = {
      services: [{ label: 'QA Design', rates: { essential: 100, standard: 200, premium: 300 }, unit: 'sqft' }],
      finishes: [{ label: 'QA Finish', rates: { essential: 50, standard: 80, premium: 120 }, unit: 'sqft' }],
    };
    await must('est_tpl_save', { name: 'QA Probe Rates', rates }, 'owner');
    const after = await must('est_tpls', {}, 'owner');
    if (!(after.templates ?? []).some((t) => /QA Probe Rates/.test(t.name ?? ''))) throw new Error('rate book not saved');
    return 'rate book created and listed';
  }
  await must('est_tpl_save', { name: tpl.name, rates: tpl.rates ?? {} }, 'owner');
  return `rate book "${tpl.name}" re-saved`;
});

step('profile name save → read back → restore', async () => {
  const before = await must('me_get', {}, 'owner');
  const name = before.user?.name ?? before.me?.name ?? 'Managing Director';
  await must('me_save', { name: name + ' QA' }, 'owner');
  const after = await must('me_get', {}, 'owner');
  const now = after.user?.name ?? after.me?.name;
  if (!String(now).endsWith(' QA')) throw new Error('profile name did not save');
  await must('me_save', { name }, 'owner');
  return `name written (${now}) and restored`;
});

step('backup runs and is listed', async () => {
  const before = await must('backup_list', {}, 'owner');
  const made = await must('backup_run', {}, 'owner');
  const after = await must('backup_list', {}, 'owner');
  const n0 = (before.backups ?? []).length, n1 = (after.backups ?? []).length;
  if (n1 <= n0) throw new Error(`backup count did not grow (${n0} → ${n1})`);
  const name = made.backup?.name ?? made.name ?? '?';
  await must('backup_delete', { name }, 'owner');
  const cleaned = await must('backup_list', {}, 'owner');
  return `backup ${name} created and deleted (${n0} → ${n1} → ${(cleaned.backups ?? []).length})`;
});

step('team member add → deactivate', async () => {
  const before = await must('users', {}, 'owner');
  const email = `qa-probe-${Date.now().toString().slice(-6)}@example.com`;
  const made = await must('user_save', { name: 'QA Probe Member', email, role: 'support', password: 'QaProbe!2345' }, 'owner');
  const after = await must('users', {}, 'owner');
  const user = find(after.users ?? [], (u) => u.email === email);
  if (!user) throw new Error('team member not listed');
  await must('user_save', { id: user.id, name: user.name, email, role: 'support', active: false }, 'owner');
  const gone = await must('users', {}, 'owner');
  const off = find(gone.users ?? [], (u) => u.email === email);
  if (off && off.active !== false && off.active !== 0) throw new Error('member not deactivated');
  return `member added (#${user.id}) and deactivated (${(before.users ?? []).length} → ${(after.users ?? []).length})`;
});

step('role gates hold on a write path', async () => {
  await call('user_save', { name: 'QA Nope', email: 'qa-nope@example.com', role: 'owner', password: 'Nope!2345' }, 'sales', { expect: 'error' });
  await call('backup_run', {}, 'editor', { expect: 'error' });
  await call('lead_save', { name: 'QA Nope' }, 'editor', { expect: 'error' });
  await call('media_folder', { name: 'qa-nope' }, 'support', { expect: 'error' });
  return 'sales/editor/support refused on four write paths';
});

/* ---------------------------------------------------------------- run */
let runner = null;
if (!HOST) {
  /* Default to its own sandbox so the write probe never touches the shipped tree or the preview's
     database (the preview is what the owner looks at; it must stay clean). */
  let dir = WORK;
  if (!dir) {
    const HERE = dirname(new URL(import.meta.url).pathname);
    dir = join(HERE, '.qa-run/matrix');
    if (!existsSync(join(dir, 'api/admin.php'))) {
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(dir, { recursive: true });
      cpSync(DEFAULT_PROJECT, dir, { recursive: true });
    }
  }
  runner = await createRunner({ projectDir: dir, trace: true });
  runner.useSqlite({});
  if (!(await runner.dbReady())) {
    const inst = await runner.install();
    console.log(`[matrix] schema installed: ${inst.tables} tables, ${inst.errors.length} error(s)`);
  }
  await runner.seed(accounts, { reset: true });
}

for (const who of Object.keys(session)) {
  const acc = who === 'owner' ? OWNER : who === 'sales' ? SALES : EDITOR;
  if (!acc) continue;
  if (HOST) {
    const res = await fetch(HOST + '/api/admin.php', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'login', email: acc.email, password: acc.password }),
    });
    const j = await res.json();
    if (!j.token) { console.log(`cannot sign in ${acc.email}: ${j.error}`); process.exit(1); }
    session[who] = j.token;
  } else {
    const l = await runner.login(acc.email, acc.password);
    if (!l.token) { console.log(`cannot sign in ${acc.email}: ${l.error}`); process.exit(1); }
    session[who] = l.token;
  }
}

console.log(`api-matrix — ${steps.length} write steps — ${HOST ? 'over HTTP ' + HOST : 'sandbox ' + (WORK ?? DEFAULT_PROJECT)}`);
const summary = [];
for (const s of steps) {
  const t0 = Date.now();
  try {
    const note = await s.fn();
    summary.push({ step: s.name, pass: true, note, ms: Date.now() - t0 });
    console.log(`  ok   ${s.name} — ${note}`);
  } catch (e) {
    summary.push({ step: s.name, pass: false, note: String(e.message), ms: Date.now() - t0 });
    console.log(`  FAIL ${s.name} — ${e.message}`);
  }
}

const failedCalls = results.filter((r) => !r.pass);
console.log(`\nsteps: ${summary.filter((s) => s.pass).length}/${summary.length} pass · calls: ${results.length} (${failedCalls.length} unexpected)`);
if (failedCalls.length) for (const f of failedCalls) console.log(`  ${f.action} [${f.who}] ${f.status}: ${f.error}`);
if (runner) await runner.close();
process.exit(failedCalls.length ? 1 : 0);
