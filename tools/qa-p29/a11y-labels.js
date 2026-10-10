const { JSDOM } = require('jsdom'); const fs = require('fs');
for (const [name, root] of [['HEAD', '/tmp/headtree/woodex-live-p29-v2.1-pro'], ['WORKING', '/home/user/-marketingwoodex/woodex-live-p29-v2.1-pro']]) {
  const dom = new JSDOM(fs.readFileSync(root + '/estimator/index.html', 'utf8'));
  const d = dom.window.document;
  const bad = [...d.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea')]
    .filter(el => el.getAttribute('aria-hidden') !== 'true' && el.tabIndex !== -1)
    .filter(el => !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !(el.id && d.querySelector('label[for="' + el.id + '"]')) && !el.closest('label'))
    .map(el => '#' + (el.id || el.name));
  console.log(name, 'unlabelled visible controls:', bad.length, bad.join(' ') || '(none)');
}
