/**
 * Voice end to end against a running app started with GEMINI_BASE_URL pointing at scripts/mock-gemini-live.mjs:
 * opens a sample, presses Talk with a fake microphone, waits for the mock's edit + apply, saves, screenshots.
 * Usage: node scripts/voice-scenario.cjs <outdir> <sample-name>
 */
const { chromium } = require('playwright');
const [O, SRC] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['microphone'] });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:3000/');
  await p.getByRole('button', { name: SRC, exact: true }).click();
  await p.waitForFunction(() => !document.querySelector('.ai-compose textarea')?.disabled, null, { timeout: 60000 }); await p.waitForTimeout(2500);
  await p.locator('.voice-btn').click();
  await p.waitForSelector('.voice-log .cap.you', { timeout: 30000 });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${O}/voice-1-working.png` });
  await p.waitForFunction(() => /Applied\./.test(document.querySelector('.voice-log')?.textContent ?? ''), null, { timeout: 300000 });
  await p.waitForTimeout(1500);
  await p.waitForFunction(() => !document.querySelector('.ai-status'), null, { timeout: 300000 });
  console.log('CAPTIONS:', await p.locator('.voice-log').innerText());
  console.log('CHAT:', (await p.locator('.msg-ai').first().innerText()).slice(0, 900));
  await p.screenshot({ path: `${O}/voice-2-done.png` });
  await p.locator('.voice-btn').click();
  await p.locator('.topbar button.primary').click();
  await p.waitForFunction(() => /saved · v2/.test(document.querySelector('.save-state')?.textContent ?? ''), null, { timeout: 30000 }).catch(() => console.log('not saved v2'));
  console.log('DOCID', p.url().split('/doc/')[1], '| page errors:', errs.length ? errs : 'none'); await b.close();
})().catch((e) => { console.error('VOICE SCENARIO FAILED', e.message); process.exit(1); });
