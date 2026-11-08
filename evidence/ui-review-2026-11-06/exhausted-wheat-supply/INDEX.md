# UI-036 缺麦、无种、无苗时的补给路径

**54张当前原尺寸前后图**：320x568、390x844真实触屏模拟，1280x800键鼠；另保留54张夹具启动瞬态历史图，不作为自然第三黎明问题证据。Web / 中文 / DPR1 / UI100%，各图真实CSS画布矩形、时间、触点与源码见 [screenshots.json](screenshots.json)，实际路线及库存见 [validation.json](validation.json)。视觉待用户/父协调逐图确认，不以测试通过代替。

基线 `a09aaa5de95fc7af473abb156fbb8a4aa9eaf600`；before为该提交Git字节、dirty=false，after为同HEAD、dirty=true且产品三文件SHA256 `3d28b5ffe3f4f34e24ca5b51a19a54ad6d6ac02b4d6253dfe9e97452b270691b`。后续提交SHA不倒填到原图。

## 问题与最小修复

木4石5金3、麦1、种0、无作物/可拾麦种、营地四墙且白天：原地图指工作台，展开教程让合成，但真实走近交互只会拒绝缺麦。仅在此耗尽补给状态统一当前目标/教程/桌面提示为「缺麦没种：夜守篝火打怪，可能掉麦或种子。」，金框改指篝火。不改任何采收、掉落、配方、建造、时长、胜负或存档。

成熟麦、未熟苗、有种能播、原配方就绪工作台和已有心祭坛控制保留；夜间/缺其他材料/缺墙/可拾补给不进入新谓词。原首夜文件与断言未改。教程阶段进度仍沿原流程，不扩新教程。

## 可达性不是造出“无种无苗”

[reachable-state.json](reachable-state.json) 保留原三株成熟麦并实际采完，骑士默认2种没有注入/清零。**9次原生鼠标长按采收、6次E播种、2次H吃收获麦**；遗落补给按原吸引/18秒寿命自然处理。成功终态time90.7605、首夜、麦1种0作物0、HP165/营火100。位置边界、局部地形/四墙/其他材料/受伤为明示初始夹具；后续不改RNG、种/麦/苗阶段、掉落life或时钟。

该证明不是连续自然走位或自然三夜通关。UI链复用真实耗尽库存/空作物快照，仅固定第三白天/出生点与教程；真实展开/关闭、方向按住走近原工作台、交互拒绝缺麦、走回篝火，库存不变。首次54图中的新局采树toast是恢复夹具的启动瞬态；仅取证模式等其正常过期后补54图，不修改产品toast。

`reach-safe.log` 原console的harvests=11把2次H动作的“harvested”也计入；原始JSON实际为9次鼠标采收。只纠正未来console计数，不重跑随机成功样本或抹掉旧记录。

## 夜间补给是机会，不是保证

原击杀代码独立麦45%、种20%保持。明确已结束首夜波/20HP受伤史莱姆/零速零伤害位置夹具，真实Space击杀：随机极值两例仅验证原麦/种存在和可无掉落分支；其他样本不改RNG。表中仅计未改RNG样本，不用极值当自然概率证据：

| 原始记录 | 引擎 | 未改RNG击杀 | 掉麦事件 | 掉种事件 |
|---|---|---|---|---|
| [night-supply-01b34a18.json](night-supply-01b34a18.json) | chromium | 16 | 6 | 2 |
| [night-supply-72476922.json](night-supply-72476922.json) | not in original file; Chromium caller recorded in after.log | 8 | 2 | 0 |
| [night-supply-74041f53.json](night-supply-74041f53.json) | chromium | 16 | 9 | 5 |
| [night-supply-ad04e841.json](night-supply-ad04e841.json) | webkit | 16 | 10 | 3 |

WebKit后续16样本实际见麦与种；初次Chromium8样本只见麦2/种0的旧记录仍保留。样本不是掉落保证，也不是自然三夜通关。

## 检查与边界

静态 [static.log](static.log)，新WebKit控制 [webkit-controls.log](webkit-controls.log)，原完整plain WebKit [e2e-checked.log](e2e-checked.log)，独立审查 [review.log](review.log)；失败/夹具修复明细在validation，原日志不覆盖。旧seedless格内惯性修复只改原生输入夹具，保留5秒预算和原采收/库存断言；本片新成熟等待复用现有默认30秒并增加模拟时间至少14秒断言，不加速生长，不放宽原首夜。

不重拍未变全界面/横屏，复用旧矩阵并只读检查覆盖；本片新320/390/桌面图不冒作横屏证据。未覆盖实体设备、系统安全区、完整自然通关；无中英文切换。#25–32保持开放/原head，旧诊断保留；不合并或部署Pages/腾讯云。各自D盘root关闭浏览器后精确清理，详见cleanup日志。

## 当前逐图清单

| screen_id / state | 阶段 | 视口 | 原图 | status |
|---|---|---|---|---|
| exhausted-at-camp | before | 320x568 | [原图](images/exhausted-at-camp--320x568--before--43213eb3--01b34a18.png) | 已截，待审 |
| exhausted-guide | before | 320x568 | [原图](images/exhausted-guide--320x568--before--43213eb3--01b34a18.png) | 已截，待审 |
| bench-missing-wheat | before | 320x568 | [原图](images/bench-missing-wheat--320x568--before--43213eb3--01b34a18.png) | 已截，待审 |
| returned-to-camp | before | 320x568 | [原图](images/returned-to-camp--320x568--before--43213eb3--01b34a18.png) | 已截，待审 |
| control-seed-available | before | 320x568 | [原图](images/control-seed-available--320x568--before--43213eb3--01b34a18.png) | 已截，待审 |
| control-growing | before | 320x568 | [原图](images/control-growing--320x568--before--43213eb3--01b34a18.png) | 已截，待审 |
| control-ripe | before | 320x568 | [原图](images/control-ripe--320x568--before--43213eb3--01b34a18.png) | 已截，待审 |
| control-recipe-ready | before | 320x568 | [原图](images/control-recipe-ready--320x568--before--43213eb3--01b34a18.png) | 已截，待审 |
| control-heart-ready | before | 320x568 | [原图](images/control-heart-ready--320x568--before--43213eb3--01b34a18.png) | 已截，待审 |
| exhausted-at-camp | before | 390x844 | [原图](images/exhausted-at-camp--390x844--before--43213eb3--01b34a18.png) | 已截，待审 |
| exhausted-guide | before | 390x844 | [原图](images/exhausted-guide--390x844--before--43213eb3--01b34a18.png) | 已截，待审 |
| bench-missing-wheat | before | 390x844 | [原图](images/bench-missing-wheat--390x844--before--43213eb3--01b34a18.png) | 已截，待审 |
| returned-to-camp | before | 390x844 | [原图](images/returned-to-camp--390x844--before--43213eb3--01b34a18.png) | 已截，待审 |
| control-seed-available | before | 390x844 | [原图](images/control-seed-available--390x844--before--43213eb3--01b34a18.png) | 已截，待审 |
| control-growing | before | 390x844 | [原图](images/control-growing--390x844--before--43213eb3--01b34a18.png) | 已截，待审 |
| control-ripe | before | 390x844 | [原图](images/control-ripe--390x844--before--43213eb3--01b34a18.png) | 已截，待审 |
| control-recipe-ready | before | 390x844 | [原图](images/control-recipe-ready--390x844--before--43213eb3--01b34a18.png) | 已截，待审 |
| control-heart-ready | before | 390x844 | [原图](images/control-heart-ready--390x844--before--43213eb3--01b34a18.png) | 已截，待审 |
| exhausted-at-camp | before | 1280x800 | [原图](images/exhausted-at-camp--1280x800--before--43213eb3--01b34a18.png) | 已截，待审 |
| exhausted-guide | before | 1280x800 | [原图](images/exhausted-guide--1280x800--before--43213eb3--01b34a18.png) | 已截，待审 |
| bench-missing-wheat | before | 1280x800 | [原图](images/bench-missing-wheat--1280x800--before--43213eb3--01b34a18.png) | 已截，待审 |
| returned-to-camp | before | 1280x800 | [原图](images/returned-to-camp--1280x800--before--43213eb3--01b34a18.png) | 已截，待审 |
| control-seed-available | before | 1280x800 | [原图](images/control-seed-available--1280x800--before--43213eb3--01b34a18.png) | 已截，待审 |
| control-growing | before | 1280x800 | [原图](images/control-growing--1280x800--before--43213eb3--01b34a18.png) | 已截，待审 |
| control-ripe | before | 1280x800 | [原图](images/control-ripe--1280x800--before--43213eb3--01b34a18.png) | 已截，待审 |
| control-recipe-ready | before | 1280x800 | [原图](images/control-recipe-ready--1280x800--before--43213eb3--01b34a18.png) | 已截，待审 |
| control-heart-ready | before | 1280x800 | [原图](images/control-heart-ready--1280x800--before--43213eb3--01b34a18.png) | 已截，待审 |
| exhausted-at-camp | after | 320x568 | [原图](images/exhausted-at-camp--320x568--after--3d28b5ff--74041f53.png) | 已截，待审 |
| exhausted-guide | after | 320x568 | [原图](images/exhausted-guide--320x568--after--3d28b5ff--74041f53.png) | 已截，待审 |
| bench-missing-wheat | after | 320x568 | [原图](images/bench-missing-wheat--320x568--after--3d28b5ff--74041f53.png) | 已截，待审 |
| returned-to-camp | after | 320x568 | [原图](images/returned-to-camp--320x568--after--3d28b5ff--74041f53.png) | 已截，待审 |
| control-seed-available | after | 320x568 | [原图](images/control-seed-available--320x568--after--3d28b5ff--74041f53.png) | 已截，待审 |
| control-growing | after | 320x568 | [原图](images/control-growing--320x568--after--3d28b5ff--74041f53.png) | 已截，待审 |
| control-ripe | after | 320x568 | [原图](images/control-ripe--320x568--after--3d28b5ff--74041f53.png) | 已截，待审 |
| control-recipe-ready | after | 320x568 | [原图](images/control-recipe-ready--320x568--after--3d28b5ff--74041f53.png) | 已截，待审 |
| control-heart-ready | after | 320x568 | [原图](images/control-heart-ready--320x568--after--3d28b5ff--74041f53.png) | 已截，待审 |
| exhausted-at-camp | after | 390x844 | [原图](images/exhausted-at-camp--390x844--after--3d28b5ff--74041f53.png) | 已截，待审 |
| exhausted-guide | after | 390x844 | [原图](images/exhausted-guide--390x844--after--3d28b5ff--74041f53.png) | 已截，待审 |
| bench-missing-wheat | after | 390x844 | [原图](images/bench-missing-wheat--390x844--after--3d28b5ff--74041f53.png) | 已截，待审 |
| returned-to-camp | after | 390x844 | [原图](images/returned-to-camp--390x844--after--3d28b5ff--74041f53.png) | 已截，待审 |
| control-seed-available | after | 390x844 | [原图](images/control-seed-available--390x844--after--3d28b5ff--74041f53.png) | 已截，待审 |
| control-growing | after | 390x844 | [原图](images/control-growing--390x844--after--3d28b5ff--74041f53.png) | 已截，待审 |
| control-ripe | after | 390x844 | [原图](images/control-ripe--390x844--after--3d28b5ff--74041f53.png) | 已截，待审 |
| control-recipe-ready | after | 390x844 | [原图](images/control-recipe-ready--390x844--after--3d28b5ff--74041f53.png) | 已截，待审 |
| control-heart-ready | after | 390x844 | [原图](images/control-heart-ready--390x844--after--3d28b5ff--74041f53.png) | 已截，待审 |
| exhausted-at-camp | after | 1280x800 | [原图](images/exhausted-at-camp--1280x800--after--3d28b5ff--74041f53.png) | 已截，待审 |
| exhausted-guide | after | 1280x800 | [原图](images/exhausted-guide--1280x800--after--3d28b5ff--74041f53.png) | 已截，待审 |
| bench-missing-wheat | after | 1280x800 | [原图](images/bench-missing-wheat--1280x800--after--3d28b5ff--74041f53.png) | 已截，待审 |
| returned-to-camp | after | 1280x800 | [原图](images/returned-to-camp--1280x800--after--3d28b5ff--74041f53.png) | 已截，待审 |
| control-seed-available | after | 1280x800 | [原图](images/control-seed-available--1280x800--after--3d28b5ff--74041f53.png) | 已截，待审 |
| control-growing | after | 1280x800 | [原图](images/control-growing--1280x800--after--3d28b5ff--74041f53.png) | 已截，待审 |
| control-ripe | after | 1280x800 | [原图](images/control-ripe--1280x800--after--3d28b5ff--74041f53.png) | 已截，待审 |
| control-recipe-ready | after | 1280x800 | [原图](images/control-recipe-ready--1280x800--after--3d28b5ff--74041f53.png) | 已截，待审 |
| control-heart-ready | after | 1280x800 | [原图](images/control-heart-ready--1280x800--after--3d28b5ff--74041f53.png) | 已截，待审 |

54张历史图在screenshots.json的historical_screenshots逐项列出，原图与启动瞬态说明保留，非当前视觉验收。每张当前图完整language/build/source/repro_steps/issue_ids与原生像素/画布/输入均在同目录JSON。
