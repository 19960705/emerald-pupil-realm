import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "promo", "remotion", "public", "keyframes");
await fs.mkdir(outDir, { recursive: true });

const url = process.argv[2] ?? "http://127.0.0.1:4186/";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(url, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "进入荒原" }).click();
await page.addStyleTag({
  content: ".hud,.focus-button,.crosshair{display:none!important}.vignette{opacity:.82}.grain{opacity:.08}",
});
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(outDir, "01-barren-wide.png") });

await page.keyboard.down("Space");
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(outDir, "02-gaze-beam.png") });
await page.waitForTimeout(2600);
await page.keyboard.up("Space");
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(outDir, "03-first-bloom.png") });

await page.keyboard.down("KeyW");
await page.waitForTimeout(1200);
await page.keyboard.up("KeyW");
await page.mouse.move(960, 540);
await page.mouse.down();
await page.mouse.move(1340, 520, { steps: 32 });
await page.mouse.up();
await page.waitForTimeout(300);
await page.keyboard.down("Space");
await page.waitForTimeout(3200);
await page.keyboard.up("Space");
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(outDir, "04-forest-orbit.png") });

await page.mouse.move(960, 540);
await page.mouse.down();
await page.mouse.move(610, 500, { steps: 30 });
await page.mouse.up();
await page.waitForTimeout(300);
await page.keyboard.down("Space");
await page.waitForTimeout(2500);
await page.keyboard.up("Space");
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(outDir, "05-emerald-finale.png") });

const debug = await page.evaluate(() => window.__emeraldDebug?.());
await browser.close();
console.log(JSON.stringify({ outDir, errors, debug }, null, 2));
