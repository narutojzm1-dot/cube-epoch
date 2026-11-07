# UI-011 已制成方块之心的阶段反馈

源码依据：d2bc02e 的工作台 prompt 将 `materialsReady() || inv.heart` 都显示为合成；`craft()` 已有成品分支不检查昼夜/夜数，直接提示去祭坛。320原生触控隔离局实测：心1、首日夜数0与第三夜夜间都仍提示合成/去祭坛。

本片只修改已持有成品时的反馈：白天未守够三夜说明还要守几夜，夜里说明守火等天亮，可献祭时说明去北边祭坛。工作台 prompt、重复交互 toast 和已持有心的交付教程/桌面快捷提示保持一致。不改制作/配方/扣料/已有成品优先、献祭条件、胜负、时间或任何地图规则；不重复修材料差额、设备措辞或宽屏布局。

32张真实首屏原图：320×568、390×844、844×390五状态前后30图，1280×800鼠标键盘可交付态前后2图。Web/WebKit，中文，100%缩放，DPR1；实际游戏画布 CSS 矩形与逻辑320×192逐图记录，无全页缩图。

前三状态前图在未修改产品的真实d2bc02e工作区捕获，产品hash `089fda92`；后图为d2bc02e加本片game.js dirty构建，hash `5b817741`。独立审查后修正第一/二夜不能承诺下次天亮可献：这两态前图内存route提供d2bc02e原Git字节（hash `5a9909d6`），后图为最终dirty构建 `5b3fb087`。前三状态文案未变，复用原图/原版本记录，不冒称它们由最终构建重拍；最终代码五态均执行检查。不切换/覆盖工作区。

全部是明示隔离fixture，不代表自然三夜：骑士、工作台南12px、心1且仍有全配方库存、营火四邻墙、进度标记和昼夜/夜数按状态设置。正常运行中触屏点交互两次或键盘E两次；仅拍图时冻结模拟，不读写用户存档。

| 状态/视口 | 前原图 | 后原图 |
|---|---|---|
| 首日心已备好 / 320 | [前](images/stored-before-nights--320x568--before--089fda92.png) | [后](images/stored-before-nights--320x568--after--5b817741.png) |
| 首日心已备好 / 390 | [前](images/stored-before-nights--390x844--before--089fda92.png) | [后](images/stored-before-nights--390x844--after--5b817741.png) |
| 首日心已备好 / 844横屏 | [前](images/stored-before-nights--844x390--before--089fda92.png) | [后](images/stored-before-nights--844x390--after--5b817741.png) |
| 第三夜夜间 / 320 | [前](images/stored-third-night--320x568--before--089fda92.png) | [后](images/stored-third-night--320x568--after--5b817741.png) |
| 第三夜夜间 / 390 | [前](images/stored-third-night--390x844--before--089fda92.png) | [后](images/stored-third-night--390x844--after--5b817741.png) |
| 第三夜夜间 / 844横屏 | [前](images/stored-third-night--844x390--before--089fda92.png) | [后](images/stored-third-night--844x390--after--5b817741.png) |
| 三夜后白天 / 320 | [前](images/stored-ready--320x568--before--089fda92.png) | [后](images/stored-ready--320x568--after--5b817741.png) |
| 三夜后白天 / 390 | [前](images/stored-ready--390x844--before--089fda92.png) | [后](images/stored-ready--390x844--after--5b817741.png) |
| 三夜后白天 / 844横屏 | [前](images/stored-ready--844x390--before--089fda92.png) | [后](images/stored-ready--844x390--after--5b817741.png) |
| 三夜后白天 / 1280鼠标键盘 | [前](images/stored-ready--1280x800--before--089fda92.png) | [后](images/stored-ready--1280x800--after--5b817741.png) |
| 第一夜夜间 / 320 | [前](images/stored-first-night--320x568--before--5a9909d6.png) | [后](images/stored-first-night--320x568--after--5b3fb087.png) |
| 第一夜夜间 / 390 | [前](images/stored-first-night--390x844--before--5a9909d6.png) | [后](images/stored-first-night--390x844--after--5b3fb087.png) |
| 第一夜夜间 / 844横屏 | [前](images/stored-first-night--844x390--before--5a9909d6.png) | [后](images/stored-first-night--844x390--after--5b3fb087.png) |
| 第二夜夜间 / 320 | [前](images/stored-second-night--320x568--before--5a9909d6.png) | [后](images/stored-second-night--320x568--after--5b3fb087.png) |
| 第二夜夜间 / 390 | [前](images/stored-second-night--390x844--before--5a9909d6.png) | [后](images/stored-second-night--390x844--after--5b3fb087.png) |
| 第二夜夜间 / 844横屏 | [前](images/stored-second-night--844x390--before--5a9909d6.png) | [后](images/stored-second-night--844x390--after--5b3fb087.png) |

[逐图来源/状态/实际画布](screenshots.json) · [前后输入及库存](validation.json) · [适用检查与独立审查](checks.log)。

最终 `node --check game.js`、`npm test`（静态/e2e含20新场景）、只读覆盖检查均通过；旧基线172/172、历史305、本轮累计追加294图，不是新版本全量重拍。独立审查指出的第一/二夜误导已修正，并完成针对性及适用现有回归；不把测试通过或本机自看当作协调人视觉批准。

20针对性场景覆盖首日/第一夜/第二夜/第三夜/三夜后白天 × 四视口；重复交互不扣任何材料、不重复制作、不在工作台触发胜利。手机与横屏核心触点≥44px、实际点中、不滚动/不粘住，toast与prompt同时位于原限高反馈区。无心缺料/材料足够制作及真实献祭条件沿用适用的现有e2e回归。

限制：全部为浏览器隔离fixture，未真机验收、未重打自然三夜；手机交付教程展开态未另拍，桌面可交付态原图覆盖可见教程/快捷提示。现有详情展开遮挡行为未改变。本批待协调人逐图审查，测试通过不等于视觉通过。旧a342ef0、自然证据、PR6/7及本地未提交诊断保持；不合并/部署。
