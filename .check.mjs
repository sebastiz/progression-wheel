import { chromium } from "playwright";
import { readFileSync } from "fs";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage();
const problems = [];
page.on("pageerror", e => problems.push("pageerror: " + e.message));
page.on("console", m => {
  const t = m.text();
  if (m.type() === "error" && !/Failed to load resource/.test(t)) problems.push("console: " + t);
});
await page.route("**/cdnjs.cloudflare.com/**", r => r.fulfill({ status: 200,
  contentType: "application/javascript",
  body: readFileSync("/home/user/progression-wheel/node_modules/" +
    (r.request().url().includes("react-dom") ? "react-dom/umd/react-dom.production.min.js"
                                             : "react/umd/react.production.min.js"), "utf8") }));
await page.goto("file:///home/user/progression-wheel/index.html");
await page.waitForSelector(".panel", { timeout: 15000 });

const selBy = l => page.locator(`label.selwrap:has(span.lbl:text-is("${l}"))`).locator("select");

// open a section's melody grid
const melToggle = page.locator("button", { hasText: /melody/i });
for (let i = 0; i < await melToggle.count(); i++) {
  await melToggle.nth(i).click().catch(() => {});
  await page.waitForTimeout(200);
  if (await page.locator(".mbar").count()) break;
}
if (!await page.locator(".mbar").count()) problems.push("could not open a melody grid");

const partBtns = () => page.locator("button.lybtn");
const partLabels = async () => (await partBtns().allTextContents()).map(t => t.trim());

console.log(`parts on open: ${JSON.stringify(await partLabels())}`);

// add parts up to the cap and check each appears with its own colour
const inks = new Set();
for (let n = 0; n < 7; n++) {
  const add = page.locator("button.lybtn", { hasText: "part" }).first();
  if (!await add.count()) break;
  await add.click();
  await page.waitForTimeout(220);
}
const labels = await partLabels();
const named = labels.filter(l => /^[A-F]$/.test(l));
console.log(`after adding: ${JSON.stringify(labels)}`);
if (named.length !== 6) problems.push(`expected 6 parts at the cap, got ${named.length}`);
if (labels.some(l => l.includes("part"))) problems.push("the add-part button is still offered at the cap");

// each part button must have a distinct colour
for (let i = 0; i < named.length; i++) {
  const bg = await partBtns().nth(i).evaluate(n => getComputedStyle(n).backgroundColor);
  inks.add(bg);
}
if (inks.size !== named.length) problems.push(`parts share colours: ${[...inks].join(" / ")}`);
console.log(`part colours: ${inks.size} distinct`);

// write a note on part C and confirm the cell takes C's colour, not A's
await partBtns().nth(2).click();
await page.waitForTimeout(200);
const cell = page.locator(".mcell").nth(3);
await cell.click();
await page.waitForTimeout(250);
const onCells = page.locator(".mcell.on");
if (!await onCells.count()) problems.push("writing a note on part C produced no filled cell");
else {
  const bg = await onCells.first().evaluate(n => getComputedStyle(n).backgroundColor);
  console.log(`note written on part C → cell colour ${bg}`);
  const aInk = "rgb(84, 183, 157)";
  if (bg === aInk) problems.push("a note written on part C was drawn in part A's colour");
}

// removing a part must be possible for C but not for A. Match the part-remove button exactly —
// the page has an unrelated "🗑 Remove" elsewhere that a loose selector picks up.
const partTrash = () => page.locator("button.mini").filter({ hasText: /^🗑 [A-F]$/ });
if (!await partTrash().count()) problems.push("no remove-part control for a non-lead part");
await partBtns().nth(0).click();
await page.waitForTimeout(200);
if (await partTrash().count()) problems.push("part A offers a remove control (it should not)");
// and removing part C should drop the count back to five
await partBtns().nth(2).click();
await page.waitForTimeout(200);
await partTrash().first().click();
await page.waitForTimeout(300);
const left = (await partLabels()).filter(l => /^[A-F]$/.test(l));
if (left.length !== 5) problems.push(`removing a part left ${left.length} parts, want 5`);
console.log(`after removing part C: ${JSON.stringify(left)}`);

// playback with several parts
const play = page.locator("button", { hasText: /^▶|Play/ }).first();
await play.click(); await page.waitForTimeout(1800); await play.click();
console.log("multi-part playback: ran without error");

if (problems.length) console.log(`\n✗ ${problems.length} PROBLEM(S):\n` + problems.map(p => "  - " + p).join("\n"));
else console.log("\n✓ stage 3 browser checks passed");
await browser.close();
process.exit(problems.length ? 1 : 0);
