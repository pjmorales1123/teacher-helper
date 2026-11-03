/**
 * Drives one AI editing scenario end to end in the browser against a running app (npm start):
 * opens a sample or uploads a file, sends the request in Edit mode, applies every pending change,
 * accepts all suggestions, retries failures once, saves, and writes screenshots to <outdir>.
 * Usage: node scripts/scenario.cjs <outdir> <name> <sample-name-or-file-path> "<request>"
 */
const { chromium } = require('playwright');
const [O, NAME, SRC, PROMPT] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:3000/');
  if (SRC.includes('/')) await p.locator('input[type=file]').setInputFiles(SRC);
  else await p.getByRole('button', { name: SRC, exact: true }).click();
  await p.waitForURL(/#\/doc\//); const id = p.url().split('/doc/')[1];
  await p.waitForFunction(() => !document.querySelector('.ai-compose textarea')?.disabled, null, { timeout: 60000 }); await p.waitForTimeout(3000);
  await p.getByRole('tab', { name: 'Edit with AI' }).click();
  await p.locator('.ai-compose textarea').fill(PROMPT); const t0 = Date.now();
  await p.locator('.ai-compose button.primary').click();
  await p.waitForFunction(() => { const m = document.querySelectorAll('.msg-ai'); return m.length && !m[m.length - 1].querySelector('.msg-dots') && !document.querySelector('.ai-status'); }, null, { timeout: 300000 });
  await p.waitForTimeout(2000); const secs = ((Date.now() - t0) / 1000).toFixed(1);
  await p.screenshot({ path: `${O}/${NAME}-1-proposed.png` });
  console.log('AI (' + secs + 's):', (await p.locator('.msg-ai').last().innerText()).slice(0, 2500));
  const apply = p.locator('.pending button.primary');
  if (await apply.count()) { await apply.click(); await p.waitForFunction(() => !document.querySelector('.pending button.primary') && !document.querySelector('.ai-status'), null, { timeout: 60000 }); await p.waitForTimeout(1500); }
  console.log('AFTER APPLY:', (await p.locator('.pending').last().innerText().catch(() => '(no pending)')).slice(0, 2500));
  await p.screenshot({ path: `${O}/${NAME}-2-applied.png` });
  await p.getByRole('button', { name: 'Accept all suggestions' }).click(); await p.waitForTimeout(2000);
  const retry = p.getByRole('button', { name: /^Retry/ });
  if (await retry.count()) { await retry.click(); await p.waitForTimeout(2500); console.log('AFTER RETRY:', (await p.locator('.pending').last().innerText()).slice(0, 1500)); }
  await p.locator('.topbar button.primary').click();
  await p.waitForFunction(() => /saved · v2/.test(document.querySelector('.save-state')?.textContent ?? ''), null, { timeout: 30000 }).catch(() => console.log('SAVE STATE:', 'not v2'));
  await p.waitForTimeout(800); await p.screenshot({ path: `${O}/${NAME}-3-saved.png` });
  console.log('DOCID', id, '| page errors:', errs.length ? errs : 'none');
  await b.close();
})().catch((e) => { console.error('SCENARIO FAILED', e.message); process.exit(1); });
