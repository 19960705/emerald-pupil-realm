import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "promo", "overlays");
await fs.mkdir(outDir, { recursive: true });

const overlays = [
  { file: "overlay-title.png", type: "title", title: "翠眸之境", sub: "万物生长，皆因你的一瞥。" },
  { file: "overlay-01.png", type: "subtitle", text: "在灰色荒原中，观察即创造。" },
  { file: "overlay-02.png", type: "subtitle", text: "凝视越久，生命越浓。" },
  { file: "overlay-03.png", type: "subtitle", text: "唤醒封印石，引导水脉回归。" },
  { file: "overlay-04.png", type: "subtitle", text: "一款关于专注、生态与温柔重塑的独立游戏。" },
  { file: "overlay-end.png", type: "end", title: "EMERALD PUPIL'S REALM", sub: "PLAYABLE PROTOTYPE" },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });

for (const item of overlays) {
  const isTitle = item.type === "title";
  const isEnd = item.type === "end";
  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        html, body {
          width: 1080px;
          height: 1920px;
          margin: 0;
          background: transparent;
          overflow: hidden;
          font-family: "STHeiti", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
        }
        .wrap {
          position: absolute;
          left: 72px;
          right: 72px;
          ${isTitle ? "top: 560px; text-align: center;" : isEnd ? "bottom: 152px; text-align: center;" : "bottom: 205px; text-align: center;"}
          color: #f2fff7;
          text-shadow: 0 2px 18px rgba(0,0,0,.72), 0 0 28px rgba(86,255,174,.24);
        }
        h1 {
          margin: 0;
          font-size: ${isEnd ? 42 : 92}px;
          line-height: 1.05;
          letter-spacing: 0;
          font-weight: 800;
        }
        p {
          margin: ${isTitle ? 26 : 12}px 0 0;
          font-size: ${isTitle ? 40 : isEnd ? 28 : 43}px;
          line-height: 1.52;
          color: ${isEnd ? "#a8ffd1" : "#e7faee"};
          font-weight: 500;
        }
        .bar {
          width: ${isTitle ? 154 : 92}px;
          height: 2px;
          margin: ${isTitle ? 30 : 18}px auto 0;
          background: linear-gradient(90deg, transparent, #a8ffd1, #fff2aa, transparent);
          box-shadow: 0 0 18px rgba(116,255,194,.64);
        }
      </style>
    </head>
    <body>
      <div class="wrap">
        ${item.title ? `<h1>${item.title}</h1>` : ""}
        ${item.text ? `<p>${item.text}</p>` : ""}
        ${item.sub ? `<p>${item.sub}</p>` : ""}
        <div class="bar"></div>
      </div>
    </body>
  </html>`;
  await page.setContent(html);
  await page.screenshot({ path: path.join(outDir, item.file), omitBackground: true });
}

await browser.close();
console.log(outDir);
