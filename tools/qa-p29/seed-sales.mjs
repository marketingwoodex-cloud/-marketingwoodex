/* Seeds the preview database through the REAL api actions so the sales screens
   have genuine records to render (the fresh install ships users only).
   Everything written here goes through the same code path the UI uses.
   Usage: PREVIEW_EMAIL=… PREVIEW_PASS=… node seed-sales.mjs [base] */
import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const ROOT = path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');
const browser = await pptr.launch({ executablePath: await cm.executablePath(), args: cm.args, headless: true, defaultViewport: { width: 1440, height: 950 } });
const page = await browser.newPage(); const errs = [];
page.on('pageerror', e => errs.push(String(e.message).slice(0, 120)));
await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#login-form, #nav', { timeout: 25000 });
if (await page.$('#l-email')) { await page.type('#l-email', process.env.PREVIEW_EMAIL); await page.type('#l-pass', process.env.PREVIEW_PASS); await page.click('#l-btn'); }
await page.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 30000 });

const report = await page.evaluate(async () => {
  const api = (a, b) => window.WXA.api(a, b);
  const log = [];
  const clients = (await api('clients_master')).clients || {};
  const cl = Object.values(clients);
  if (!cl.length) return { error: 'no clients to quote' };

  const jobs = [
    { c: cl[0], project: 'DHA Phase 6 — Living & Dining Renovation', kind: 'interior', site: 'House 142, Phase 6, DHA Lahore',
      sections: [
        { name: 'Demolition & civil work', note: 'Includes debris removal', items: [
          { desc: 'Removal of existing flooring and false ceiling', qty: 1, unit: 'job', rate: 185000 },
          { desc: 'Levelling and screed for new flooring', qty: 1250, unit: 'sq ft', rate: 165 }] },
        { name: 'Flooring & finishes', note: '', items: [
          { desc: 'Imported porcelain tile — supply and lay', qty: 1250, unit: 'sq ft', rate: 420 },
          { desc: 'Skirting, 4 inch, matching tile', qty: 180, unit: 'rft', rate: 300 }] },
      ], discount: 25000, taxPct: 0, advance: 500000, status: 'sent' },
    { c: cl[1] || cl[0], project: 'Model Town — Master Bedroom Furniture', kind: 'furniture', site: 'Model Town, Lahore',
      sections: [
        { name: 'Bespoke furniture', note: 'Veneer finish, soft-close hardware', items: [
          { desc: 'King bed with upholstered headboard', qty: 1, unit: 'set', rate: 320000 },
          { desc: 'Bedside tables with drawer', qty: 2, unit: 'pcs', rate: 48000 },
          { desc: 'Built-in wardrobe — 8 ft run', qty: 1, unit: 'job', rate: 385000 }] },
      ], discount: 0, taxPct: 5, advance: 250000, status: 'approved' },
  ];

  const made = [];
  for (const j of jobs) {
    const q = await api('quote_save', {
      client: { name: j.c.name, phone: j.c.phone, email: j.c.email, company: j.c.company || '', address: j.c.address || '', city: j.c.city || '' },
      project: j.project, kind: j.kind, site: j.site, design: 'classic', layout: 'classic',
      sections: j.sections, discount: j.discount, taxPct: j.taxPct, advance: j.advance,
      intro: 'Thank you for the opportunity. Please find below our quotation for the work discussed on site.',
      terms: '50% advance with work order, balance on completion', valid_days: 30,
    });
    if (!q.ok) { log.push({ step: 'quote_save', error: q.error }); continue; }
    const qid = q.quote?.id ?? q.id;
    made.push({ qid, project: j.project, status: j.status });
    if (j.status === 'sent') await api('quote_status', { id: qid, status: 'sent' });
    if (j.status === 'approved') {
      await api('quote_status', { id: qid, status: 'sent' });
      await api('quote_status', { id: qid, status: 'approved' });
      const inv = await api('quote_invoice', { id: qid });
      const iid = inv.invoice?.id ?? inv.id;
      made[made.length - 1].invoice = iid;
      if (iid) {
        await api('inv_track', { id: iid, delivery_date: new Date().toISOString().slice(0, 10) });
        const inv2 = await api('inv_get', { id: iid });
        const total = inv2.invoice?.total || 0;
        if (total) await api('pay_add', { id: iid, amount: Math.round(total * 0.5), method: 'bank', ref: 'TRF-88412', note: '50% advance against work order' });
      }
    }
  }
  const after = { quotes: ((await api('quotes_list')).quotes || []).length, invoices: ((await api('invs_list')).invoices || []).length, tracker: ((await api('invs_tracker')).rows || []).length };
  return { made, log, after };
});
console.log(JSON.stringify(report, null, 1));
console.log('pageErrors:', errs.length);
await browser.close();
