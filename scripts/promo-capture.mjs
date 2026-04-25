import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const captureDir = path.join(root, "promo", "capture");
const url = process.argv[2] ?? "http://127.0.0.1:4186/";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1080, height: 1920 },
  deviceScaleFactor: 1,
  recordVideo: {
    dir: captureDir,
    size: { width: 1080, height: 1920 },
  },
});

const page = await context.newPage();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.getByRole("button", { name: "进入荒原" }).click();
await page.waitForTimeout(900);

await page.keyboard.down("Space");
await page.waitForTimeout(3900);
await page.keyboard.up("Space");

await page.keyboard.down("KeyW");
await page.waitForTimeout(1200);
await page.keyboard.up("KeyW");

await page.mouse.move(540, 960);
await page.mouse.down();
await page.mouse.move(780, 980, { steps: 24 });
await page.waitForTimeout(300);
await page.mouse.up();

await page.keyboard.down("Space");
await page.waitForTimeout(3200);
await page.keyboard.up("Space");

await page.keyboard.down("KeyD");
await page.waitForTimeout(950);
await page.keyboard.up("KeyD");

await page.mouse.move(540, 960);
await page.mouse.down();
await page.mouse.move(260, 920, { steps: 28 });
await page.waitForTimeout(300);
await page.mouse.up();

await page.keyboard.down("Space");
await page.waitForTimeout(3900);
await page.keyboard.up("Space");

await page.waitForTimeout(2600);

const debug = await page.evaluate(() => window.__emeraldDebug?.());
const video = page.video();
await context.close();
await browser.close();

const videoPath = video ? await video.path() : "";
console.log(JSON.stringify({ videoPath, errors, debug }, null, 2));
