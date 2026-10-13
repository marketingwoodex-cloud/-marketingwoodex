/* lib-signin.mjs — one reliable sign-in for every QA script.
   The login form exists in the DOM before the PHP runtime has answered auth_status, and
   typing into it during that window silently does nothing (focus is refused while the
   boot overlay owns the page). Set the values directly, dispatch input events, then press
   the button until a session token appears. */
export async function signIn(p, base=process.env.PREVIEW_BASE || 'http://127.0.0.1:8080', opt={}) {
  const email = opt.email || process.env.PREVIEW_EMAIL, pass = opt.pass || process.env.PREVIEW_PASS;
  if (!email || !pass) throw new Error('signIn: PREVIEW_EMAIL / PREVIEW_PASS not set');
  await p.goto(base + '/admin/', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#l-email', { timeout: 45000 });
  await p.waitForFunction(() => { const e = document.querySelector('#l-email'); return e && !e.disabled && e.offsetParent !== null; }, { timeout: 45000 }).catch(() => {});
  await p.evaluate(({ e, s }) => {
    const a = document.querySelector('#l-email'), b = document.querySelector('#l-pass');
    if (!a || !b) return;
    a.value = e; b.value = s;
    a.dispatchEvent(new Event('input', { bubbles: true })); b.dispatchEvent(new Event('input', { bubbles: true }));
  }, { e: email, s: pass });
  /* one press only: api/admin.php counts failures per IP and answers 429 after 8, so a
     retry loop locks the QA account out of its own preview. Read the answer instead. */
  const [resp] = await Promise.all([
    p.waitForResponse(r => r.url().includes('admin.php') && r.request().method() === 'POST', { timeout: 30000 }).catch(() => null),
    p.click('#l-btn').catch(() => {}),
  ]);
  let body = null;
  if (resp) { try { body = await resp.json(); } catch (e) {} }
  if (!body || !body.ok) {
    const shown = await p.evaluate(() => (document.querySelector('#l-err') || {}).textContent || '');
    throw new Error('sign-in failed: HTTP ' + (resp ? resp.status() : '?') + ' ' + ((body && body.error) || shown || 'no response'));
  }
  await p.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 25000 });
  return true;
}
