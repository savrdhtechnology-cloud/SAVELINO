// Browser functionality tests for the Design & Production Studio (preview build).
// Database rules are verified separately in supabase/tests/atelier_workflow.test.sql.
// Usage: BASE_URL=http://localhost:2736 node scripts/atelier-e2e.mjs
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const BASE = process.env.BASE_URL || "http://localhost:2736";
const OUT = "screenshots/atelier";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = { base: BASE, results: [], pageErrors: [] };

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on("pageerror", (e) => report.pageErrors.push(e.message));

async function shot(name, opts = {}) {
  await page.screenshot({ path: `${OUT}/${name}.png`, timeout: 60000, ...opts }).catch(() => undefined);
}
async function test(name, fn) {
  try {
    await fn();
    report.results.push({ name, ok: true });
    console.log("PASS", name);
  } catch (e) {
    report.results.push({ name, ok: false, error: e.message.split("\n")[0] });
    console.log("FAIL", name, e.message.split("\n")[0]);
    await shot(`fail-${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`);
  }
}
const expectText = async (text, timeout = 8000) => page.getByText(text, { exact: false }).first().waitFor({ timeout });
const nav = async (label) => {
  await page.getByRole("link", { name: label, exact: true }).first().click();
  await sleep(1500);
};

await page.goto(`${BASE}/admin/design-studio`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.getByRole("button", { name: "+ New design" }).first().waitFor({ timeout: 30000 });
await sleep(2000);
await shot("01-design-studio");

await test("design creation", async () => {
  await page.getByRole("button", { name: "+ New design" }).first().click();
  await expectText("Untitled blouse");
  await page.getByLabel("Design name").fill("QA Test blouse");
  await page.locator("select").filter({ hasText: "Sweetheart" }).first().selectOption("v");
  await page.getByRole("tab", { name: "Back" }).first().click();
  await sleep(700);
  await shot("02-design-edit-back");
});

await test("save creates new version", async () => {
  await page.getByRole("button", { name: /Save as v2/ }).first().click();
  await expectText("Saved as version 2");
  await expectText("v2");
});

await test("design approval locks spec", async () => {
  await page.getByRole("button", { name: "Approve design" }).first().click();
  await expectText("Approved designs are locked");
  await shot("03-design-approved");
});

await test("size charts & grading", async () => {
  await nav("Size Charts");
  await expectText("Bust");
  await shot("04-size-chart");
  await page.getByRole("tab", { name: "Grading" }).first().click();
  await expectText("Grade rules");
  await shot("05-size-grading");
});

await test("pattern library approve in-review piece", async () => {
  await nav("Pattern Library");
  await expectText("Size-wise library");
  await page.getByLabel("Design", { exact: true }).selectOption({ label: "Rani princess-cut blouse (approved)" });
  await sleep(800);
  await page.getByRole("button", { name: "Size 38" }).first().click();
  await sleep(800);
  await page.getByRole("button", { name: "Approve", exact: true }).first().click();
  await expectText("Pattern approved for production");
  await shot("06-pattern-approved");
});

await test("approve all size-38 pieces", async () => {
  for (const label of ["Back bodice", "Sleeve", "Front neck facing", "Lining · front", "Lining · back"]) {
    const btn = page.getByRole("button", { name: label, exact: true });
    if (await btn.count()) {
      await btn.first().click();
      await sleep(300);
      const approve = page.getByRole("button", { name: "Approve", exact: true });
      if (await approve.count()) await approve.click();
      await sleep(300);
    }
  }
});

await test("grade nest view", async () => {
  await page.getByLabel("Grade nest (all sizes)").check();
  await sleep(900);
  await shot("07-pattern-grade-nest");
});

await test("draft new size pattern set", async () => {
  await page.getByRole("button", { name: "Size 40" }).first().click();
  await sleep(500);
  await page.getByRole("button", { name: /Draft pattern set · size 40/ }).first().click();
  await expectText("draft pieces created");
  await page.getByRole("button", { name: "Submit all drafts for review" }).first().click();
  await expectText("Sent for Pattern Master review");
  await shot("08-pattern-size40-review");
});

await test("fabric calculator estimate vs verified", async () => {
  await nav("Fabric Calculator");
  await page.getByLabel("Design", { exact: true }).selectOption({ label: "Rani princess-cut blouse" });
  await sleep(800);
  await expectText("Planning estimate");
  await expectText("Confirmed cutting requirement");
  await shot("09-fabric-calculator");
  await page.locator("select").nth(1).selectOption("38");
  await expectText("No verified marker for size 38");
  await page.getByRole("button", { name: "Verify" }).first().click();
  await expectText("Marker verified");
  await shot("10-fabric-verified-38");
});

await test("bill of materials", async () => {
  await nav("Bill of Materials");
  await expectText("BOM · ");
  await shot("11-bom");
});

await test("batch approval blocked without approved patterns", async () => {
  await nav("Production Batches");
  await expectText("Production Batches");
  await shot("12-production-board");
  await page.getByRole("button", { name: /PB-261005/ }).first().click();
  await sleep(800);
  await page.getByRole("button", { name: "Start cutting" }).first().click();
  await expectText("Start cutting — done");
  await page.getByRole("button", { name: "Move to stitching" }).first().click();
  await expectText("Finish all job cards for this stage first");
  await shot("13-batch-detail-blocked");
  await page.keyboard.press("Escape");
  await sleep(600);
});

await test("create batch and approve with job cards", async () => {
  await page.getByRole("button", { name: "+ New batch" }).first().click();
  await sleep(600);
  await page.getByLabel("Approved design").selectOption({ label: "Rani princess-cut blouse (DS-RANI01)" });
  await page.getByRole("button", { name: "Create draft batch" }).first().click();
  await expectText("Draft batch created");
  await sleep(800);
  await page.getByRole("button", { name: "Approve & generate job cards" }).first().click();
  await expectText("Approve & generate job cards — done");
  await expectText("Job cards");
  await shot("14-batch-approved-jobcards");
  await page.keyboard.press("Escape");
  await sleep(600);
});

await test("quality control approval", async () => {
  await nav("Quality Control");
  await expectText("Inspection checklist");
  await shot("15-qc-checklist");
  const passes = page.getByRole("button", { name: "Pass" });
  for (let i = 0; i < (await passes.count()); i++) await passes.nth(i).click();
  await page.getByRole("button", { name: "Record inspection" }).first().click();
  await expectText("pieces approved");
});

await test("receive QC-approved stock", async () => {
  await nav("Production Batches");
  await page.getByRole("button", { name: /PB-260924/ }).first().click();
  await sleep(700);
  await page.getByLabel("Finished stock variant").last().selectOption({ label: "SAV-RANI-36-WINE" });
  await sleep(500);
  await page.getByRole("button", { name: "Receive QC-approved stock" }).first().click();
  await expectText("added to finished inventory");
  await shot("16-stock-received");
  await page.keyboard.press("Escape");
});

await test("worker task board", async () => {
  await nav("Worker Tasks");
  await expectText("Needs your attention");
  await shot("17-worker-task-board");
});

await test("worker portal task flow", async () => {
  await page.goto(`${BASE}/worker`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await expectText("Assigned to me", 20000);
  await sleep(1000);
  await shot("18-worker-portal");
  await page.getByRole("button", { name: /Rani princess-cut blouse/ }).first().click();
  await sleep(800);
  await shot("19-worker-task-detail");
  await page.getByRole("tab", { name: "Cutting pattern" }).first().click();
  await sleep(900);
  await shot("20-worker-cutting-pattern");
  await page.getByRole("tab", { name: "Design" }).first().click();
  await sleep(700);
  await shot("21-worker-design");
  await page.getByRole("tab", { name: "Messages" }).first().click();
  await page.getByLabel("Message").fill("Confirm piping colour please");
  await page.getByRole("button", { name: "Send question" }).first().click();
  await expectText("Question sent");
  const start = page.getByRole("button", { name: /Start task|Resume/ });
  if (await start.count()) await start.first().click();
  await sleep(500);
  await page.getByRole("button", { name: "Pause" }).first().click();
  await expectText("Paused");
  await page.getByRole("button", { name: "Resume" }).first().click();
  await sleep(400);
  await page.getByRole("button", { name: "Mark complete" }).first().click();
  await expectText("Completed — thank you");
  await shot("22-worker-completed");
});

await test("worker portal mobile", async () => {
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await m.newPage();
  await mp.goto(`${BASE}/worker`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(1500);
  await mp.screenshot({ path: `${OUT}/23-worker-mobile.png` });
  await m.close();
});

await browser.close();
const failed = report.results.filter((r) => !r.ok);
report.summary = { passed: report.results.length - failed.length, failed: failed.length };
await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary));
if (failed.length || report.pageErrors.length) process.exit(1);
