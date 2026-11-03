/**
 * Drives one AI editing scenario end to end against a running app (npm start): opens a sample or uploads a
 * file, optionally allows all suggested folders, sends the request, accepts suggestions, applies pending
 * changes (which triggers the automatic visual check), applies any fixes from the check, saves, and writes
 * screenshots to <outdir>.
 * Usage: node scripts/scenario.cjs <outdir> <name> <sample-name-or-file-path> <allowFolders 0|1> "<request>"
 */
const { chromium } = require('playwright');
const [O, NAME, SRC, ALLOW, PROMPT] = process.argv.slice(2);
const idle = (p, t = 300000) => p.waitForFunction(() => { const m = document.querySelectorAll('.msg-ai'); return m.length && !m[m.length - 1].querySelector('.msg-dots') && !document.querySelector('.ai-status'); }, null, { timeout: t });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:3000/');
  if (SRC.includes('/')) await p.locator('input[type=file]').setInputFiles(SRC); else await p.getByRole('button', { name: SRC, exact: true }).click();
  await p.waitForURL(/#\/doc\//); const id = p.url().split('/doc/')[1];
  await p.waitForFunction(() => !document.querySelector('.ai-compose textarea')?.disabled, null, { timeout: 60000 }); await p.waitForTimeout(2500);
  if (ALLOW === '1') {
    await p.locator('.files-btn').click(); await p.waitForTimeout(300);
    for (const box of await p.locator('.files-pop input[type=checkbox]').all()) { if (!(await box.isChecked())) { await box.click(); await p.waitForTimeout(500); } }
    await p.screenshot({ path: `${O}/${NAME}-0-files.png` }); await p.locator('.files-pop button.link').click();
  }
  await p.locator('.ai-compose textarea').fill(PROMPT); const t0 = Date.now();
  await p.locator('.ai-compose button.primary').click(); await idle(p); await p.waitForTimeout(1500);
  console.log(`AI (${((Date.now() - t0) / 1000).toFixed(0)}s):`, (await p.locator('.msg-ai').last().innerText()).slice(0, 1800));
  await p.screenshot({ path: `${O}/${NAME}-1-proposed.png` });
  await p.getByRole('button', { name: 'Accept all suggestions' }).click(); await p.waitForTimeout(1500); await idle(p).catch(() => {});
  const apply = p.locator('.pending button.primary').first();
  if (await apply.count()) { await apply.click(); await p.waitForTimeout(3000); await idle(p); await p.waitForTimeout(1500); }
  else if (!(await p.locator('.msg-review').count())) { await p.getByRole('button', { name: 'Check the result' }).last().click(); await p.waitForTimeout(2000); await idle(p); }
  console.log('AFTER APPLY:', (await p.locator('.pending').first().innerText().catch(() => '(none)')).slice(0, 1500));
  console.log('REVIEW:', (await p.locator('.msg-review').last().innerText().catch(() => '(no review)')).slice(0, 1800));
  await p.screenshot({ path: `${O}/${NAME}-2-checked.png` });
  const fix = p.locator('.msg-review .pending button.primary');
  if (await fix.count()) { await fix.last().click(); await p.waitForTimeout(3000); await idle(p); await p.waitForTimeout(1500); console.log('SECOND REVIEW:', (await p.locator('.msg-review').last().innerText()).slice(0, 1200)); }
  await p.getByRole('button', { name: 'Accept all suggestions' }).click(); await p.waitForTimeout(1500); await idle(p).catch(() => {});
  await p.locator('.topbar button.primary').click();
  await p.waitForFunction(() => /saved · v2/.test(document.querySelector('.save-state')?.textContent ?? ''), null, { timeout: 30000 }).catch(() => console.log('not saved v2'));
  await p.screenshot({ path: `${O}/${NAME}-3-saved.png` });
  console.log('DOCID', id, '| page errors:', errs.length ? errs : 'none'); await b.close();
})().catch((e) => { console.error('SCENARIO FAILED', e.message); process.exit(1); });
