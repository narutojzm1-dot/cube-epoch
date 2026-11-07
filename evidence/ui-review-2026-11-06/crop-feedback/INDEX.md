# UI-012 白天未成熟麦苗说明

源码依据：a11106c 的画布提示只覆盖成熟 `T.CROP`；阶段0/1没有解释。隔离320原生触屏实际播种、自然等到两个阶段并长按：种子从2到1，麦保持0，prompt为空。已有成熟“收麦”、空田“播种”提示正确，不重做。

产品只加一条白天未成熟麦苗提示：“麦苗还在长，成熟后再收。”不改渲染/生长阶段/速度/配方/收获/消耗/地图/职业/昼夜/胜负，不改输入或详情面板。夜里仍按既有战斗提示处理，避免用生长说明替换守火操作。

22张真实首屏原图：萌芽/生长两态 × 320×568、390×844、844×390原生触屏、1280×800桌面 × 前后，共16图；另补三触屏视口自然成熟及实际收获后6图。不重拍未变全图集。Web/Chromium，中文，100%缩放、DPR1；原图未缩放，真实画布 CSS/像素矩形逐项记录，逻辑视口320×192。

前图为真实a11106c未改产品工作区，hash `5b3fb087`；后图为同SHA加本片game.js dirty构建，hash `f854c81c`。不切换或覆盖工作区。

隔离fixture仅设置玩家(30,25)面北、附近5×5草地与(30,24)空田；库存保留初始值。正常选骑士、真实交互播种扣1种子，正常等待萌芽/生长/成熟，真实长按采集。**没有注入资源、作物阶段或快进生长时钟**；仅拍照冻结模拟。随后独立的未拍夜战优先测试会注入夜间/阶段1/远处零伤害怪，明确不是自然夜守或三夜通关。

| 状态/视口 | 前原图 | 后原图 |
|---|---|---|
| 萌芽 / 320触屏 | [前](images/sprout--320x568--before--5b3fb087.png) | [后](images/sprout--320x568--after--f854c81c.png) |
| 生长 / 320触屏 | [前](images/growing--320x568--before--5b3fb087.png) | [后](images/growing--320x568--after--f854c81c.png) |
| 萌芽 / 390触屏 | [前](images/sprout--390x844--before--5b3fb087.png) | [后](images/sprout--390x844--after--f854c81c.png) |
| 生长 / 390触屏 | [前](images/growing--390x844--before--5b3fb087.png) | [后](images/growing--390x844--after--f854c81c.png) |
| 萌芽 / 844横屏 | [前](images/sprout--844x390--before--5b3fb087.png) | [后](images/sprout--844x390--after--f854c81c.png) |
| 生长 / 844横屏 | [前](images/growing--844x390--before--5b3fb087.png) | [后](images/growing--844x390--after--f854c81c.png) |
| 萌芽 / 1280桌面 | [前](images/sprout--1280x800--before--5b3fb087.png) | [后](images/sprout--1280x800--after--f854c81c.png) |
| 生长 / 1280桌面 | [前](images/growing--1280x800--before--5b3fb087.png) | [后](images/growing--1280x800--after--f854c81c.png) |

| 触屏视口 | 自然成熟 | 实际收获后 |
|---|---|---|
| 320×568 | [原图](images/ripe--320x568--after--f854c81c.png) | [原图](images/harvested--320x568--after--f854c81c.png) |
| 390×844 | [原图](images/ripe--390x844--after--f854c81c.png) | [原图](images/harvested--390x844--after--f854c81c.png) |
| 844×390 | [原图](images/ripe--844x390--after--f854c81c.png) | [原图](images/harvested--844x390--after--f854c81c.png) |

[逐图源码/实际输入/库存与作物状态](screenshots.json) · [前后20检查及夜战fixture限制](validation.json) · [检查及捕获器修正](checks.log)。

最终 `node --check game.js`、现有 `npm test`（含20麦苗检查）及只读覆盖检查通过；独立只读审查未发现重要问题。保留旧172基线/305历史，累计追加316图，不是新版本全量重拍或视觉批准。

采集按既有阈值完成、掉落实际拾取后才核对库存：骑士得麦1、返种1；若原长按继续触发原地续种，则仍按原规则扣种1。此行为未修改，照片中的实际田/作物及库存原样记录。未成熟长按无产出/额外扣料；触控释放、不滚动、≥44px核心目标与限高提示已针对性验证。

本地截图/触控使用Chromium原生触点/CDP长按，桌面使用E/Space。现有WebKit e2e采用原生触屏E及键盘Space长按回归，不冒称WebKit长按是原生触点。无用户存档读写；未真机、未重打三夜、未获协调人本批视觉批准。旧a342ef0、PR6/7/8、自然证据及本地诊断保留，不合并或发布。
