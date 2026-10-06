// 冒烟测试：用 Playwright 启动 Electron 主进程（Mac 上运行同一套 main.js），
// 检查页面加载、存储持久化、麦克风权限范围和外链拦截。数据写在临时目录里。
const { _electron: electron } = require('/Users/even/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('fs'), os = require('os'), path = require('path');
const assert = require('assert/strict');

(async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'paperroom-win-test-'));
  const launch = () => electron.launch({ executablePath: require('electron'), args: [__dirname], env: { ...process.env, PAPERROOM_USER_DATA: userData } });
  let app = await launch(), page = await app.firstWindow();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/status of 404/.test(m.text())) errors.push(m.text()); });
  const failed = []; page.on('response', (r) => { if (r.status() >= 400) failed.push(r.url()); });
  await page.waitForFunction(() => document.querySelector('#board-select')?.options.length > 0, null, { timeout: 30000 });
  assert.equal(page.url(), 'paperroom://app/');
  assert.equal(await page.title(), '纸间 · 黑色灵感工作台');
  assert.equal(await page.evaluate(() => isSecureContext), true, 'secure context (needed for the microphone)');
  assert.equal(await page.evaluate(() => !!document.querySelector('#viewport canvas')), true, 'WebGL canvas rendered');

  // Microphone permission: granted to our page (audio only).
  assert.equal(await page.evaluate(async () => (await navigator.permissions.query({ name: 'microphone' })).state !== 'denied'), true);

  // Path traversal through the protocol is refused.
  assert.equal(await page.evaluate(async () => (await fetch('paperroom://app/..%2f..%2fpackage.json')).status), 404);
  assert.equal(await page.evaluate(async () => (await fetch('paperroom://app/vendor/three.module.js')).ok), true);

  // Notes persist across a full restart.
  await page.keyboard.press('n');
  await page.fill('#note-title', 'Windows 测试便签');
  await page.fill('#note-body', '重启以后还在。');
  await page.click('#note-form button[type=submit]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(__dirname, 'build', 'smoke-test.png') });
  await app.close();

  app = await launch(); page = await app.firstWindow();
  await page.waitForFunction(() => document.querySelector('#board-select')?.options.length > 0, null, { timeout: 30000 });
  const titles = await page.evaluate(() => JSON.parse(localStorage.getItem('paperroom-workspace-v2')).boards[0].state.notes.map((n) => n.title));
  assert.ok(titles.includes('Windows 测试便签'), 'note survived restart: ' + titles.join(','));

  // External links never navigate the app window.
  await page.evaluate(() => { location.href = 'file:///etc/hosts'; });
  await page.waitForTimeout(500);
  assert.equal(page.url(), 'paperroom://app/');
  await app.close();
  fs.rmSync(userData, { recursive: true, force: true });

  assert.deepEqual(errors, [], 'page errors');
  // The only failed request must be the deliberate traversal probe.
  assert.deepEqual(failed, ['paperroom://app/..%2f..%2fpackage.json'], 'failed requests');
  console.log('SMOKE TEST PASSED');
})().catch((e) => { console.error('SMOKE TEST FAILED', e); process.exit(1); });
