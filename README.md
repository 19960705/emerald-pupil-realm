# 翠眸之境 (Emerald Pupil's Realm)

一个基于创意文档制作的 Three.js 3D 浏览器游戏原型。玩家扮演失忆的造物主，在灰色荒原中用凝视让植物生长，并寻找五枚封印石唤醒水脉。

## 玩法

- 拖动鼠标：旋转视角
- `WASD` / 方向键：移动
- 按住鼠标或空格：凝视，让目标区域生长
- 手机端：使用右下角「凝视」按钮

## 本地运行

```bash
npm install
npm run dev -- --port 4186
```

打开 `http://127.0.0.1:4186/`。

## 验证记录

- `npm run build` 通过
- Playwright 桌面测试通过：进入游戏、按住空格凝视、生长斑块生成
- Playwright 手机视口测试通过：HUD 与凝视按钮可见
- 截图输出在 `test-artifacts/`

## 宣传视频

- 竖屏成片：`promo/output/emerald-pupil-promo-vertical.mp4`
- 规格：1080x1920, 30fps, 21s, H.264 + AAC
- 素材：Playwright 实机录制 + 透明字幕层 + FFmpeg 合成环境音乐

## 横屏 Remotion PV

- 横屏成片：`promo/remotion/renders/emerald-pupil-landscape-remotion.mp4`
- 规格：1920x1080, 30fps, 28s, H.264 + AAC
- 工作流：Playwright 抓取干净实机 keyframes，Remotion 编排镜头推拉、交叉淡入、字幕与氛围声
- 关键文件：
  - `scripts/capture-landscape-keyframes.mjs`
  - `promo/remotion/src/video.tsx`
  - `promo/remotion/public/keyframes/`
