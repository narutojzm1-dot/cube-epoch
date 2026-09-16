# 方块纪元 · Cube Epoch

像素沙盒网页小游戏。白天采集、围栅栏、点火把；夜里守住篝火；撑过三夜，天亮把方块之心送到祭坛。

四个角色：矿工阿石、农夫麦麦、法师星萤、骑士方盾。

## 怎么玩

本地任意静态服务即可：

```bash
python3 -m http.server 8765
```

打开 http://127.0.0.1:8765

| 操作 | 按键 |
| --- | --- |
| 移动 | WASD / 方向键 |
| 砍树、挖矿、攻击 | 对准目标，按住左键 |
| 栅栏 / 火把 / 田 | `1` `2` `3`，再点空地；点坏墙可修 |
| 合成、献祭、播种 | E |
| 技能 | Q 或右键 |
| 吃麦回血 | 点背包「麦」或 H |

点树一定是砍，不会变成放栅栏。自己能穿过栅栏，怪不能。祭坛只在天亮、且守过三夜后才能献。

## 测试、PR 与发布

改完先本地测，再开 PR。`main` 只接受合入；CI 绿了才能合并，合并后 GitHub Pages 自动部署。

```bash
npm install
npm test
git checkout -b <topic>
git push -u origin HEAD
gh pr create --base main
```

GitHub Actions：`Test`（static + e2e）跑在 PR 和 `main` 上；`Deploy Pages` 只在 `main`。

`tests/static.mjs` 不需要浏览器。`tests/e2e.mjs` 需要 Playwright WebKit。

闸门：`.grok/skills/ship-gate/SKILL.md`

## 文件

纯前端，没有后端。

- `index.html` / `style.css` / `game.js`
- `assets/` 四张角色立绘
- `tests/` 静态契约 + 进游戏 e2e
