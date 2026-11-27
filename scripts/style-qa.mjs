import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { colors, focusState, geometry, settleTransitions } from './style-qa-browser.mjs';
import { cases, epoch, stateFor, widths } from './style-qa-fixtures.mjs';
import { compareImages } from './style-qa-images.mjs';
import { judgeComparison, POLICY } from './style-qa-policy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const loadModule = createRequire(import.meta.url);
const cssFiles = ['tokens.css', 'base.css', 'components.css', 'screens.css'];
const cssPaths = cssFiles.map(file => `src/styles/${file}`);
const toolFiles = ['style-qa.mjs', 'style-qa-browser.mjs', 'style-qa-fixtures.mjs', 'style-qa-images.mjs', 'style-qa-policy.mjs'];
const hash = data => createHash('sha256').update(data).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function fingerprint() {
  return {
    node: process.version,
    lock: hash(fs.readFileSync(path.join(root, 'package-lock.json'))),
    tools: Object.fromEntries(toolFiles.map(file => [file, hash(fs.readFileSync(path.join(root, 'scripts', file)))])),
  };
}

async function initPage(page, sample, motion = 'reduce') {
  const state = stateFor(sample.state);
  state.settings.motion = motion;
  await page.addInitScript(({ state, epoch }) => {
    localStorage.setItem('interview-thieves:v1', JSON.stringify(state));
    const NativeDate = Date;
    window.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [epoch])); }
      static now() { return epoch; }
    };
    let seed = 13579;
    Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  }, { state, epoch });
}

async function capture(browser, origin, folder, axePath, referenceHits) {
  fs.mkdirSync(folder);
  const context = await browser.newContext({ locale: POLICY.locale, timezoneId: POLICY.timezoneId, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  const summary = [];
  try {
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    for (const viewport of widths) {
      for (const sample of cases) {
        const key = `${viewport.width}-${sample.id}`;
        const page = await context.newPage();
        const errors = [], warnings = [], failures = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => {
          if (message.type() === 'error') errors.push(message.text());
          if (message.type() === 'warning') warnings.push(message.text());
        });
        page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
        page.on('requestfailed', request => failures.push(`${request.failure()?.errorText} ${request.url()}`));
        try {
          await page.setViewportSize(viewport);
          await initPage(page, sample);
          await page.goto(`${origin}/#${sample.hash}`, { waitUntil: 'networkidle' });
          await page.locator('main').waitFor({ state: 'visible' });
          if (referenceHits) assert.equal(referenceHits.size, cssFiles.length, '원본 CSS 네 파일이 모두 제공되지 않았습니다.');
          if (sample.id === 'card') await page.locator('canvas.is-ready').waitFor();
          await page.evaluate(() => document.fonts.ready);
          await page.mouse.move(0, 0);
          if (sample.dialog) {
            await page.keyboard.press('Tab');
            await page.getByRole('button', { name: '모두 지우기', exact: true }).focus();
            await page.keyboard.press('Enter');
            await page.locator('dialog[open]').waitFor();
          }
          await settleTransitions(page);
          const computed = await colors(page);
          const rectangles = await geometry(page, POLICY.geometryPrecision);
          const overflow = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
          await page.screenshot({ path: path.join(folder, `${key}.png`), fullPage: true, animations: 'disabled' });
          const keyboard = [];
          for (const [keyName, count] of [['Tab', POLICY.tabSteps], ['Shift+Tab', POLICY.reverseTabSteps]]) {
            for (let step = 0; step < count; step++) {
              await page.keyboard.press(keyName);
              keyboard.push({ key: keyName, ...await focusState(page) });
            }
          }
          let dialogKeyboard = null;
          if (sample.dialog) {
            await page.keyboard.press('Escape');
            dialogKeyboard = await page.evaluate(() => ({ closed: !document.querySelector('dialog').open, returned: document.activeElement.textContent.trim() === '모두 지우기' }));
            assert(dialogKeyboard.closed && dialogKeyboard.returned, '대화상자 닫기·포커스 복귀 실패');
            await page.keyboard.press('Enter');
            await page.locator('dialog[open]').waitFor();
          }
          let spaceToggle = null;
          if (sample.id === 'settings') {
            const checkbox = page.locator('input[type="checkbox"]').first();
            const checked = await checkbox.isChecked();
            await checkbox.focus();
            await page.keyboard.press('Space');
            const changed = await checkbox.isChecked();
            await page.keyboard.press('Space');
            spaceToggle = changed !== checked && (await checkbox.isChecked()) === checked;
            assert(spaceToggle, '체크박스 Space 조작 실패');
            await settleTransitions(page);
          }
          await page.addScriptTag({ path: axePath });
          const accessibility = await page.evaluate(async () => {
            const result = await window.axe.run(document, { resultTypes: ['violations'] });
            return result.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) }));
          });
          writeJson(path.join(folder, `${key}.json`), { computed, geometry: rectangles, keyboard, dialogKeyboard, spaceToggle, overflow, accessibility, errors, warnings, failures });
          const row = { key, nodes: computed.length, overflow: overflow.document > viewport.width || overflow.body > viewport.width, violations: accessibility, errors, warnings, failures };
          summary.push(row);
          console.log(`${path.basename(folder)} ${key}: 위반 ${accessibility.length}, 오류 ${errors.length}, 경고 ${warnings.length}, 요청 실패 ${failures.length}`);
        } finally { await page.close(); }
      }
    }
    writeJson(path.join(folder, 'summary.json'), summary);
    assert.equal(summary.length, cases.length * widths.length, '검수 건수 불일치');
    assert.equal(summary.filter(row => row.overflow || row.violations.length || row.errors.length || row.warnings.length || row.failures.length).length, 0, '검수 중 확인할 문제가 발견됐습니다.');
  } finally { await context.close(); }
}

async function interactions(browser, origin, output) {
  const context = await browser.newContext({ locale: POLICY.locale, reducedMotion: 'no-preference', viewport: { width: 1440, height: 900 } });
  try {
    const page = await context.newPage();
    await initPage(page, {}, 'full');
    await page.goto(origin, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('html').getAttribute('data-motion'), 'full');
    const animation = await page.evaluate(() => getComputedStyle(document.body, '::before').animationName);
    assert.equal(animation, 'rays-spin');
    await page.getByRole('button', { name: '작전 개시', exact: true }).press('Enter');
    await page.waitForURL('**/#/hideout');
    await page.waitForFunction(() => document.getAnimations().every(animation => animation.playState !== 'running' || animation.effect.getComputedTiming().iterations === Infinity));
    await page.getByRole('link', { name: '설정', exact: true }).click();
    await page.waitForURL('**/#/settings');
    await page.waitForFunction(() => document.getAnimations().every(animation => animation.playState !== 'running' || animation.effect.getComputedTiming().iterations === Infinity));
    await page.keyboard.press('Tab');
    const trigger = page.getByRole('button', { name: '모두 지우기', exact: true });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await page.locator('dialog[open]').waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog').evaluate(dialog => dialog.open), false);
    assert(await trigger.evaluate(element => element === document.activeElement));
    writeJson(output, { passed: true, motion: 'full', animation, keyboardNavigation: true, dialogEscapeAndFocus: true });
  } finally { await context.close(); }
}

async function compare(browser, left, right, output) {
  const page = await browser.newPage();
  const rows = [];
  try {
    for (const viewport of widths) {
      for (const sample of cases) {
        const key = `${viewport.width}-${sample.id}`;
        const a = readJson(path.join(left, `${key}.json`)), b = readJson(path.join(right, `${key}.json`));
        const pixels = await compareImages(page, fs.readFileSync(path.join(left, `${key}.png`)), fs.readFileSync(path.join(right, `${key}.png`)));
        const row = { key, ...pixels, computedEqual: same(a.computed, b.computed), geometryEqual: same(a.geometry, b.geometry), keyboardEqual: same(a.keyboard, b.keyboard), accessibilityEqual: same(a.accessibility, b.accessibility) };
        rows.push({ ...row, ...judgeComparison(row) });
      }
    }
  } finally { await page.close(); }
  const result = { cases: rows.length, exactPixels: rows.filter(row => row.differentPixels === 0).length, passed: rows.every(row => row.passed), policy: POLICY, rows };
  writeJson(output, result);
  console.log(JSON.stringify({ cases: result.cases, exactPixels: result.exactPixels, passed: result.passed, failures: rows.filter(row => !row.passed) }, null, 2));
  assert(result.passed, '고정된 기준을 통과하지 못했습니다. 판정 기록을 확인하세요.');
}

async function main() {
  const [mode, flag, directory, refFlag, refValue] = process.argv.slice(2);
  assert(['baseline', 'check'].includes(mode) && flag === '--dir' && directory, '사용법: npm run qa:styles -- baseline|check --dir 경로 [--ref Git참조]');
  assert(refFlag === undefined || (mode === 'baseline' && refFlag === '--ref' && refValue), '지원하지 않는 인자입니다.');
  const folder = path.resolve(root, directory);
  let manifest, reference = null;
  if (mode === 'baseline') {
    assert(!fs.existsSync(folder), '기준 폴더가 이미 있습니다. 새 폴더를 지정하세요.');
    assert.equal(git('status', '--porcelain', '--', 'src'), '', '원본 수집 전에 앱 소스를 커밋하거나 보존하세요.');
    const sourceRef = git('rev-parse', '--verify', '--end-of-options', `${refValue || 'HEAD'}^{commit}`);
    assert.equal(git('diff', sourceRef, '--name-only', '--', 'src'), '', '지정한 기준과 현재 앱 소스가 다릅니다.');
    reference = Object.fromEntries(cssPaths.map(file => [file, execFileSync('git', ['show', `${sourceRef}:${file}`], { cwd: root, encoding: 'utf8' })]));
    fs.mkdirSync(folder, { recursive: true });
    manifest = { version: 1, sourceRef, policy: POLICY, fingerprint: fingerprint(), cases, widths, referenceHashes: Object.fromEntries(Object.entries(reference).map(([file, text]) => [file, hash(text)])), ready: false };
    writeJson(path.join(folder, 'source-css.json'), reference);
    writeJson(path.join(folder, 'manifest.json'), manifest);
  } else {
    manifest = readJson(path.join(folder, 'manifest.json'));
    assert(manifest.ready, '재현성 검증이 완료된 기준이 아닙니다.');
    assert(same(manifest.policy, POLICY) && same(manifest.fingerprint, fingerprint()), '정책·도구·Node·잠금 파일이 바뀌었습니다. 새 기준을 만드세요.');
    assert(same(manifest.cases, cases) && same(manifest.widths, widths), '화면 조건이 바뀌었습니다.');
    const changed = git('diff', manifest.sourceRef, '--name-only', '--', 'src').split('\n').filter(Boolean);
    assert(changed.every(file => cssPaths.includes(file)), '스타일 보존 검수 범위를 벗어난 앱 소스 변경입니다.');
    assert(!fs.existsSync(path.join(folder, 'candidate')), '수정본 기록이 이미 있습니다. 기준과 기존 기록을 보존하세요.');
  }
  let chromium, axePath;
  try {
    ({ chromium } = loadModule('playwright'));
    axePath = loadModule.resolve('axe-core/axe.min.js');
  } catch (error) {
    throw new Error('기존 Playwright·axe-core의 node_modules를 NODE_PATH로 지정하세요. 자동 설치하지 않습니다.', { cause: error });
  }
  const { createServer } = await import('vite');
  const referenceHits = reference ? new Set() : null;
  const paths = Object.fromEntries(cssPaths.map(file => [path.join(root, file).replaceAll('\\', '/'), file]));
  const server = await createServer({ root, logLevel: 'error', server: { host: '127.0.0.1', port: POLICY.port, strictPort: true }, plugins: reference ? [{
    name: 'style-qa-reference', enforce: 'pre',
    load(id) { const file = paths[id.split('?')[0].replaceAll('\\', '/')]; if (file) { referenceHits.add(file); return reference[file]; } },
  }] : [] });
  let browser;
  try {
    await server.listen();
    const origin = `http://127.0.0.1:${POLICY.port}`;
    browser = await chromium.launch({ headless: true });
    if (mode === 'check') assert.equal(browser.version(), manifest.browser, '브라우저 버전이 바뀌었습니다.');
    if (mode === 'baseline') {
      manifest.browser = browser.version();
      await capture(browser, origin, path.join(folder, 'reference-a'), axePath, referenceHits);
      await capture(browser, origin, path.join(folder, 'reference-b'), axePath, referenceHits);
      await compare(browser, path.join(folder, 'reference-a'), path.join(folder, 'reference-b'), path.join(folder, 'reproducibility.json'));
      await interactions(browser, origin, path.join(folder, 'interactions-before.json'));
      manifest.ready = true;
      writeJson(path.join(folder, 'manifest.json'), manifest);
    } else {
      await capture(browser, origin, path.join(folder, 'candidate'), axePath, null);
      await compare(browser, path.join(folder, 'reference-a'), path.join(folder, 'candidate'), path.join(folder, 'comparison.json'));
      await interactions(browser, origin, path.join(folder, 'interactions-after.json'));
    }
    console.log(mode === 'baseline' ? '기준 두 번의 재현성과 모션을 켠 조작 검증이 끝났습니다.' : '고정 기준과의 비교 및 모션을 켠 조작 검증이 끝났습니다.');
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
