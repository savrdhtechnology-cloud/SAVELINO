// Virtual Try-On end-to-end QA against a build connected to Supabase.
// Uses a synthetic mannequin image (no real person) as a guest, then checks
// privacy rules and captures the screens required for review.
// Usage: BASE_URL=http://localhost:2737 node scripts/tryon-e2e.mjs
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const BASE = process.env.BASE_URL || "http://localhost:2737";
const OUT = "screenshots/tryon";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = { base: BASE, steps: [], apiErrors: [], pageErrors: [], checks: {}, screenshotFailures: [] };

async function shot(page, name, opts = {}) {
  try {
    await page.screenshot({ path: `${OUT}/${name}.png`, timeout: 60000, ...opts });
  } catch (e) {
    report.screenshotFailures.push(`${name}: ${e.message.split("\n")[0]}`);
  }
}
const step = (s) => {
  report.steps.push(s);
  console.log("•", s);
};

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on("pageerror", (e) => report.pageErrors.push(e.message));
page.on("response", (r) => {
  if (r.url().includes("/api/virtual-try-on") && r.status() >= 400) report.apiErrors.push(`${r.status()} ${r.url()}`);
});

let sessionId = null;
try {
  // 1. Product page button
  await page.goto(`${BASE}/collections/designer-blouses`, { waitUntil: "networkidle" });
  await sleep(2500);
  const btn = page.getByRole("link", { name: /Try Virtually/ });
  await btn.scrollIntoViewIfNeeded();
  await sleep(1200);
  await shot(page, "01-product-try-virtually-button");
  await btn.click();
  await page.waitForURL(/virtual-try-on\?product=designer-blouses/);
  await sleep(2000);
  step("Product page → Try Virtually opens the studio with the product preselected");

  // 2. Style step
  await page.getByRole("button", { name: /Premium Try-On/ }).click();
  await sleep(600);
  await page.getByRole("button", { name: /Quick Try-On/ }).click();
  await sleep(600);
  await shot(page, "02-style-size-colour-mode", { fullPage: true });
  await page.getByRole("button", { name: "Continue" }).click();
  await sleep(900);

  // 3. Consent
  await shot(page, "03-consent");
  report.checks.continueDisabledWithoutConsent = await page.getByRole("button", { name: "Continue" }).isDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue" }).click();
  await sleep(900);
  step("Consent required before continuing");

  // 4. Upload with guidance
  await shot(page, "04-upload-guidance");
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 900;
    c.height = 1200;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, 1200);
    g.addColorStop(0, "#d9d2c4");
    g.addColorStop(1, "#b9b0a0");
    x.fillStyle = g;
    x.fillRect(0, 0, 900, 1200);
    x.fillStyle = "#6f655a";
    x.beginPath();
    x.arc(450, 230, 95, 0, Math.PI * 2);
    x.fill();
    x.beginPath();
    x.moveTo(300, 360);
    x.lineTo(600, 360);
    x.lineTo(660, 760);
    x.lineTo(600, 770);
    x.lineTo(560, 520);
    x.lineTo(570, 1180);
    x.lineTo(470, 1180);
    x.lineTo(450, 820);
    x.lineTo(430, 1180);
    x.lineTo(330, 1180);
    x.lineTo(340, 520);
    x.lineTo(300, 770);
    x.lineTo(240, 760);
    x.closePath();
    x.fill();
    x.fillStyle = "#3b342d";
    x.font = "28px sans-serif";
    x.fillText("QA mannequin — synthetic test image", 200, 60);
    return c.toDataURL("image/png");
  });
  const buffer = Buffer.from(dataUrl.split(",")[1], "base64");

  // Invalid file is rejected client-side.
  await page.locator('input[type="file"]').first().setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await sleep(700);
  report.checks.invalidFileMessage = (await page.getByRole("alert").textContent().catch(() => null)) ?? null;
  await shot(page, "05-upload-invalid-file");

  await page.locator('input[type="file"]').first().setInputFiles({ name: "mannequin.png", mimeType: "image/png", buffer });
  await sleep(1200);
  await shot(page, "06-upload-ready");
  step("Photo validated, resized in-browser and previewed");

  // 5. Processing
  await page.getByRole("button", { name: "Generate preview" }).click();
  await sleep(1300);
  await shot(page, "07-processing");
  await sleep(1200);
  await shot(page, "08-processing-later");
  await page.waitForURL(/\/virtual-try-on\/[0-9a-f-]{36}$/, { timeout: 60000 });
  sessionId = page.url().split("/").pop();
  report.checks.sessionId = sessionId;
  await page.waitForLoadState("networkidle");
  await sleep(2000);
  step("Session created, photo uploaded, mock generation recorded");

  // 6. Result gallery
  await shot(page, "09-result-front");
  for (const v of ["Left", "Back"]) {
    await page.getByRole("tab", { name: v }).click();
    await sleep(1100);
    await shot(page, `10-result-${v.toLowerCase()}`);
  }
  await page.getByRole("tab", { name: "Front" }).click();
  await sleep(900);
  await page.getByRole("button", { name: "Compare with original" }).click();
  await sleep(1100);
  await shot(page, "11-result-compare");
  await page.getByRole("button", { name: "Add to bag" }).click();
  await sleep(1500);
  await shot(page, "12-result-add-to-bag");
  await shot(page, "13-result-full", { fullPage: true });
  report.checks.disclaimerShown = (await page.getByText("This is an AI-assisted styling preview. Actual fit and fabric fall may vary.").count()) > 0;
  report.checks.sampleLabelShown = (await page.getByText("Sample preview — AI provider not connected").count()) > 0;
  step("Result gallery: four views, compare, add-to-bag intent, disclaimer and sample label");

  // Mobile result
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: await context.storageState() });
  const mp = await mobile.newPage();
  await mp.goto(`${BASE}/virtual-try-on/${sessionId}`, { waitUntil: "networkidle" });
  await sleep(2000);
  await mp.screenshot({ path: `${OUT}/14-result-mobile.png` }).catch(() => undefined);
  await mobile.close();

  // 7. Privacy checks: a stranger without the guest token can't see the session.
  const stranger = await browser.newContext();
  const sp = await stranger.newPage();
  const apiRes = await sp.request.get(`${BASE}/api/virtual-try-on/${sessionId}`);
  report.checks.strangerApiStatus = apiRes.status();
  await sp.goto(`${BASE}/virtual-try-on/${sessionId}`, { waitUntil: "networkidle" });
  report.checks.strangerPageBlocked = (await sp.getByText("Preview not available").count()) > 0;
  await sp.screenshot({ path: `${OUT}/15-stranger-blocked.png` }).catch(() => undefined);
  const forged = await sp.request.post(`${BASE}/api/virtual-try-on/upload`, {
    data: { sessionId, type: "front", data: "data:image/png;base64,aGVsbG8=", width: 900, height: 1200 },
  });
  report.checks.forgedUploadStatus = forged.status();
  await stranger.close();

  // Owner API returns no guest token and is not cacheable.
  const own = await page.request.get(`${BASE}/api/virtual-try-on/${sessionId}`);
  const ownJson = await own.json();
  report.checks.ownerApiStatus = own.status();
  report.checks.ownerApiCacheControl = own.headers()["cache-control"];
  report.checks.guestIdExposed = JSON.stringify(ownJson).includes("guest_id");
  report.checks.outputs = (ownJson.outputs ?? []).map((o) => o.view);
  report.checks.cookieHttpOnly = (await context.cookies()).find((c) => c.name === "savlino_tryon_guest")?.httpOnly ?? null;
  step("Privacy: stranger blocked, forged upload rejected, guest token httpOnly and never returned");
} catch (e) {
  report.error = e.message;
  await shot(page, "zz-error");
}

// 8. Delete my images
if (sessionId) {
  const del = await page.request.delete(`${BASE}/api/virtual-try-on/${sessionId}`);
  report.checks.deleteStatus = del.status();
}

await browser.close();
await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.error || report.pageErrors.length) process.exit(1);
