/**
 * Browser smoke test against a running Guro Buddy (npm run build && npm start).
 * Opens each sample, types and saves in Word, and with --ai also runs one AI fix.
 * Usage: node scripts/smoke.cjs [--ai] [--url http://localhost:3000]
 * Needs Playwright with Chromium available (require('playwright')).
 */
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const URL = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'http://localhost:3000';
const withAi = args.includes('--ai');
const savedAt = (v) => (page) => page.waitForFunction((n) => document.querySelector('.save-state')?.textContent?.includes(`v${n}`), v, { timeout: 20000 });

async function openSample(page, name) {
  await page.goto(`${URL}/`);
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForURL(/#\/doc\//);
  await page.waitForFunction(() => !document.querySelector('.ai-compose textarea')?.disabled, null, { timeout: 30000 });
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const check = (label, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) process.exitCode = 1; };

  for (const name of ['class-record.xlsx', 'flower-lesson.pptx']) {
    await openSample(page, name);
    check(`${name} opens`, (await page.locator('.save-state').innerText()).includes('v1'));
  }

  await openSample(page, 'lesson-plan.docx');
  await page.waitForTimeout(2000);
  await page.mouse.click(612, 349); // end of the title line on the first page
  await page.keyboard.press('End');
  await page.keyboard.type(' (smoke)');
  await page.locator('.topbar button.primary').click();
  await savedAt(2)(page);
  check('docx manual edit saves v2', true);

  if (withAi) {
    await page.getByRole('button', { name: 'Fix spelling and grammar' }).click();
    await page.waitForSelector('.msg-report, .msg-error', { timeout: 120000 });
    const report = await page.locator('.msg-ai').last().innerText();
    check('AI staged suggestions', /suggestion/.test(report));
    await page.getByRole('button', { name: 'Accept all suggestions' }).click();
    await page.locator('.topbar button.primary').click();
    await savedAt(3)(page);
    check('AI edits accepted and saved v3', true);
  }

  check(`no page errors ${errors.join(' | ')}`, errors.length === 0);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
