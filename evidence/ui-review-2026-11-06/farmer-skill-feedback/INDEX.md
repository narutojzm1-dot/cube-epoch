# UI-013 丰收术实际结果反馈

问题依据：557c41e 的 `useSkill()` 农夫分支无条件说“田里的麦子一下熟了。”正常320农夫首局真实点技能，三田阶段均为2、生命100/100，施放后仍完全相同但进入冷却；没有任何状态注入。空田受伤时同样没有麦苗可催熟，原技能却会回血，旧提示不解释这一实际效果。

只统计施放前阶段小于2的田数，并据实际生命变化说“回复生命”或“生命已满”。零待熟麦苗明确说明；不虚报固定回复24或已经回满。**不改全局催熟/成熟田特效与grow重置、回血24及上限、冷却11秒、无效果仍消耗冷却、库存、其他职业、输入、布局、昼夜或胜负。**

28张清晰原图，均为真实viewport首屏，非全页/缩放替代：四状态 × 320×568、390×844、844×390触屏 × 前后24图；1280×800鼠标布局的正常首局/夜间受伤两态前后4图。Web/WebKit，中文zh-CN，DPR1、UI缩放100%。实际画布分别308×184.8、378×226.8、333.3×200、796×477.6 CSS px；逻辑视口320×192，backing及精确矩形逐图保留。

前图：真实557c41e未改产品，served-byte SHA256 `f854c81c0b1ba44a94cae652f8bfc7c5f3eb82c17ea8528429971fe5c5fe092f`。后图：同SHA加本片game.js dirty，hash `51a0cbc70ebe7ba282df9ce2f70aaaf12fc1e8f66bbd6185bf5e7fcad0612cb7`。未切换/覆盖产品工作区。逐图截图时间、源码、输入和复现步骤见[screenshots.json](screenshots.json)。

| 状态 / 视口 | 前原图 | 后原图 |
|---|---|---|
| 已熟满血 / 320触屏 | [前](images/ripe-full--320x568--before--f854c81c.png) | [后](images/ripe-full--320x568--after--51a0cbc7.png) |
| 空田伤血 / 320触屏 | [前](images/empty-hurt--320x568--before--f854c81c.png) | [后](images/empty-hurt--320x568--after--51a0cbc7.png) |
| 新苗满血 / 320触屏 | [前](images/growing-full--320x568--before--f854c81c.png) | [后](images/growing-full--320x568--after--51a0cbc7.png) |
| 新苗夜间伤血 / 320触屏 | [前](images/growing-hurt-night--320x568--before--f854c81c.png) | [后](images/growing-hurt-night--320x568--after--51a0cbc7.png) |
| 已熟满血 / 390触屏 | [前](images/ripe-full--390x844--before--f854c81c.png) | [后](images/ripe-full--390x844--after--51a0cbc7.png) |
| 空田伤血 / 390触屏 | [前](images/empty-hurt--390x844--before--f854c81c.png) | [后](images/empty-hurt--390x844--after--51a0cbc7.png) |
| 新苗满血 / 390触屏 | [前](images/growing-full--390x844--before--f854c81c.png) | [后](images/growing-full--390x844--after--51a0cbc7.png) |
| 新苗夜间伤血 / 390触屏 | [前](images/growing-hurt-night--390x844--before--f854c81c.png) | [后](images/growing-hurt-night--390x844--after--51a0cbc7.png) |
| 已熟满血 / 844横屏 | [前](images/ripe-full--844x390--before--f854c81c.png) | [后](images/ripe-full--844x390--after--51a0cbc7.png) |
| 空田伤血 / 844横屏 | [前](images/empty-hurt--844x390--before--f854c81c.png) | [后](images/empty-hurt--844x390--after--51a0cbc7.png) |
| 新苗满血 / 844横屏 | [前](images/growing-full--844x390--before--f854c81c.png) | [后](images/growing-full--844x390--after--51a0cbc7.png) |
| 新苗夜间伤血 / 844横屏 | [前](images/growing-hurt-night--844x390--before--f854c81c.png) | [后](images/growing-hurt-night--844x390--after--51a0cbc7.png) |
| 已熟满血 / 1280桌面 | [前](images/ripe-full--1280x800--before--f854c81c.png) | [后](images/ripe-full--1280x800--after--51a0cbc7.png) |
| 新苗夜间伤血 / 1280桌面 | [前](images/growing-hurt-night--1280x800--before--f854c81c.png) | [后](images/growing-hurt-night--1280x800--after--51a0cbc7.png) |

正常首局无注入；其余隔离fixture设置远离营火的玩家/草地/空田和伤血，不注入资源或作物阶段。空田态把原三成熟田改回空田并清作物Map；新苗态用原生交互实际播种扣初始种子，再点技能。两苗数量回归同样真实播种两次，仅在两块田前定位，不凑截图。夜间态单独注入第二夜26秒/波1/3及远处静止零伤害怪，**不代表自然夜守**。只有拍照瞬间冻结模拟，不快进生长。

前后各20针对性场景（五状态×四视口）：零/一/二待熟田，满血/90→100截断回血/60→84仍未回满，原冷却11秒及重复输入不回血/不重启冷却、不收获或扣料；所有田仍按原全局效果stage2/grow0。实际触屏原生E/技能tap，桌面E/Q；沿用粗指针OR窄屏touchLayout，不假装最后输入设备检测。scroll=(0,0)、核心触控≥44px且可命中，新toast完整落在限高反馈区。

[前后库存/生命/田状态与矩形检查](validation.json) · [本地原始结果及审查](checks.log)。语法/静态、新场景及仓库要求的一次现有完整e2e集成检查通过；独立只读reviewer未发现重要问题。未重拍旧图集或重打自然三夜；原172基线/305历史、各旧片原图不变，累计追加344图只表示文件覆盖。

**限制：待协调人实际逐图审查，非视觉批准/真机验收。** 夜间原限高区的次提示可能需要内部滚动才能完整读到；新技能结果、波次和核心操作可见，本片未扩大布局范围。未检查手机教程展开，详情既有遮挡限制不抹掉。用户存档及本地natural诊断保留；旧a342候选与PR6/7/8/9保持独立，不合并、不发布Pages/腾讯云。
