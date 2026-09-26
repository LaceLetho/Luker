/**
 * scenarios/cardapp.cjs — record CardApp Studio: AI-driven CardApp editing with diff approval.
 *
 * Flow:
 *  1. Select 深渊行者 (Luker's official CardApp demo card).
 *  2. Open CardApp Studio via the extension's own openCardAppStudio() entry.
 *  3. Wait for the three-panel layout to render (chat / CardApp preview / code editor).
 *  4. Send an in-character CardApp modification request in the AI chat panel.
 *  5. AI proposes a diff. Wait for it to render and hold — this is the star moment.
 *  6. If a diff-approval dialog appears, approve it.
 *  7. Hold on the applied state.
 */
const H = require('./_helpers.cjs');

module.exports.run = async function (page) {
  await page.waitForSelector('#send_but', { timeout: 15000 });
  await page.waitForTimeout(1500);

  await H.dismissFirstRun(page);
  await H.selectCharacter(page, '深渊行者');
  await H.closeCharacterPanel(page);
  await page.waitForTimeout(1500);
  await H.scrubBadgeNow(page);

  // Defensively force non-streaming for this scenario. The upstream OpenAI-compatible
  // proxy in use sometimes truncates streaming tool_call arguments mid-message; that is
  // a proxy behaviour, not a Luker issue, but it would spoil the recording. Non-streaming
  // is already persisted in Default.json so this is a belt-and-braces guard.
  await page.evaluate(async () => {
    const oai = await import('/scripts/openai.js');
    if (oai.oai_settings.stream_openai !== false) {
      oai.oai_settings.stream_openai = false;
    }
  });

  // Open CardApp Studio directly via the module's exported opener.
  // The UI button lives in the CEA extension settings, which is a much longer click path.
  await page.evaluate(async () => {
    const mod = await import('/scripts/extensions/character-editor-assistant/studio/studio.js');
    const api = SillyTavern.getContext().getExtensionApi('card-app');
    const charId = api?.getCharId?.();
    if (charId) await mod.openCardAppStudio(charId);
  });

  // Wait for the three-panel Studio layout to fully mount.
  await page.waitForSelector('#card-app-studio-left .card-app-studio-input', { timeout: 10000 });
  await page.waitForSelector('#card-app-studio-right', { timeout: 10000 });
  await page.waitForTimeout(2500); // let CardApp preview render its status bar / buttons

  // Modest, visually-verifiable modification request. Chinese matches the card's language.
  // Simple value edit — reliably produces a diff proposal within ~90s.
  const prompt = '把 index.js 里 HP 初始值从 100 改成 120';

  await page.evaluate((text) => {
    const ta = document.querySelector('.card-app-studio-input');
    if (!ta) return;
    ta.focus();
    ta.value = text;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }, prompt);

  await page.waitForTimeout(1000); // hold on the composed prompt

  await page.evaluate(() => {
    document.querySelector('button[data-studio-action="send"]')?.click();
  });

  // Wait for the AI to produce a diff approval card. Different builds render
  // the approval UI slightly differently; wait for either the approve button or
  // the diff container to appear.
  await page.waitForFunction(() => {
    // The approve button is inside the diff card. Match multiple selector shapes.
    return !!Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').trim() === 'Approve');
  }, { timeout: 180000 }).catch(() => {});

  // Hold on the diff so the viewer can absorb it before approval.
  await page.waitForTimeout(6000);

  // Approve the diff.
  await page.evaluate(() => {
    const approveBtn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').trim() === 'Approve');
    approveBtn?.click();
  });

  // Hold on the applied state so the GIF ends on the "diff accepted" screen.
  await page.waitForTimeout(6000);
};
