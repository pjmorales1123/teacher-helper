/**
 * Voice end to end against a running app started with GEMINI_BASE_URL pointing at scripts/mock-gemini-live.mjs:
 * opens a sample, presses Talk with a fake microphone, waits for the mock's edit + apply, saves, screenshots.
 * Usage: node scripts/voice-scenario.cjs <outdir> <sample-name | file path | new:docx|xlsx|pptx> [shot-name]
 */
const { chromium } = require('playwright');
const [O, SRC, NAME = 'voice'] = process.argv.slice(2);
const NEW = { 'new:docx': 'Word document', 'new:xlsx': 'Excel workbook', 'new:pptx': 'PowerPoint deck' };
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['microphone'] });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:3000/');
  if (NEW[SRC]) await p.getByRole('button', { name: NEW[SRC], exact: true }).click();
  else if (SRC.includes('/')) await p.locator('input[type=file]').setInputFiles(SRC);
  else await p.getByRole('button', { name: SRC, exact: true }).click();
  await p.waitForURL(/#\/doc\//);
  await p.waitForFunction(() => !document.querySelector('.ai-compose textarea')?.disabled, null, { timeout: 60000 }); await p.waitForTimeout(2500);
  await p.locator('.voice-btn').click();
  await p.waitForSelector('.voice-log .cap.you', { timeout: 30000 });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${O}/${NAME}-1-working.png` });
  await p.waitForFunction(() => /Applied\./.test(document.querySelector('.voice-log')?.textContent ?? ''), null, { timeout: 300000 });
  await p.waitForTimeout(1500);
  await p.waitForFunction(() => !document.querySelector('.ai-status'), null, { timeout: 300000 });
  console.log('CAPTIONS:', await p.locator('.voice-log').innerText());
  for (const m of await p.locator('.msg-ai').all()) console.log('CHAT:', (await m.innerText()).slice(0, 1500));
  await p.screenshot({ path: `${O}/${NAME}-2-done.png` });
  await p.locator('.voice-btn').click();
  await p.locator('.topbar button.primary').click();
  await p.waitForFunction(() => /saved · v2/.test(document.querySelector('.save-state')?.textContent ?? ''), null, { timeout: 30000 }).catch(() => console.log('not saved v2'));
  console.log('DOCID', p.url().split('/doc/')[1], '| page errors:', errs.length ? errs : 'none'); await b.close();
})().catch((e) => { console.error('VOICE SCENARIO FAILED', e.message); process.exit(1); });
