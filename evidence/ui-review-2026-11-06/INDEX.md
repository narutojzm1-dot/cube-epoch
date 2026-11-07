# Cube Epoch UI review · 2026-11-06

## 独立维护批次：UI-021 暂停帮助随时返回

[20张四视口前后原图](build-help-return/INDEX.md) · [真实上滑/首屏继续/取消再放/暂停安全](build-help-return/validation.json) · [源码与矩形](build-help-return/screenshots.json) · [检查](build-help-return/checks.log)。

普通触屏320/390/844原继续需上滑438/85/360px才出现。仅暂停帮助正文独立滚动，原44px继续/回选角始终可见，重新打开从顶部显示当前步骤。原建造全文、核心画布和暂停回调保留；夜间图明确夹具，不称自然夜守。20图待协调逐图审查，旧批次/候选/诊断保留。

## 独立维护批次：UI-020 白天建造完整步骤入口

[16张四视口前后原图](build-guidance/INDEX.md) · [正常采集/成品优先/原生滚动/帮助/取消/再放置](build-guidance/validation.json) · [真实源码/矩形](build-guidance/screenshots.json) · [检查](build-guidance/checks.log)。

320取消尾行原生滑动可达、同项取消可用，但普通帮助缺手机取消步骤。白天触控选中建造时现有44px帮助标“建造说明”，首屏从原说明分句列名称、成本、放置及取消。画布/60px原反馈和滚动保留：是可达完整步骤改进，不声称原限高裁切已消失。1280键鼠/夜战原语义保留，16图待协调审查，旧候选/诊断不混入。

## 独立维护批次：UI-019 快速触屏点图候选恢复

[16张四视口同状态前后原图](map-placement/INDEX.md) · [正常输入/候选/真实落点与库存](map-placement/validation.json) · [源码/观测桥/画布矩形](map-placement/screenshots.json) · [检查](map-placement/checks.log)。

正常844挖石后面朝东点左侧(32,16)，按下映射正确却被松手后的兼容mouseleave丢失候选，实际放在(34,16)。本片保留待消费触屏点位，实际落回(32,16)，保留两格选择/沿指向近身回退、原扣料与输入优先。320/390/1280正常状态亦保留；只读调试观测桥与合成生命周期边界明确标注，不称真机或生产字节全图验收。待协调逐图审查；旧批次/候选/本地诊断保留。

## 独立维护批次：UI-018 补料后的放置成功反馈

[23张同状态前后原图](build-success-feedback/INDEX.md) · [正常采集/缺料/补料的实际输入](build-success-feedback/validation.json) · [来源/原生视口](build-success-feedback/screenshots.json) · [检查](build-success-feedback/checks.log)。

正常矿工采木、缺石、挖石后成功放火把，已实际扣料却仍显示“材料还差石1”。本片只在原漏报的成功分支确认火把/田/普通栅栏已放好，保留原围营进度和配方/成品优先/输入/夜折叠。正常路径与夹具分开；另行观察的844挖矿后逆向点图落点现象未修复、有限制，不声称瞄准全面通过。待协调人逐图审查；旧候选/证据与本地诊断保留。

## 独立维护批次：UI-017 夜战次级指引完整收起

[四视口32张同状态前后首屏原图](night-notice-fold/INDEX.md) · [真实输入/矩形/源码](night-notice-fold/screenshots.json) · [前后行为](night-notice-fold/validation.json) · [检查](night-notice-fold/checks.log)。

320真实触屏夜间波次+缺法力反馈后，44px操作指引只露12px。现在触屏夜战次级指引/建造说明完整隐藏，波次和当前反馈优先；现有44px「怎么玩」主动打开原暂停帮助查看当时全文，反馈过期后显示入口说明。保留首屏核心控制及原长反馈滚动，不改规则/存档。夹具与真实触控分开标注，未重打自然三夜；本批待协调人逐图审查，旧图/候选保留。

## 独立维护批次：UI-016 夜战法力可用量/恢复说明

[四视口8张同状态首屏前后图](mana-feedback/INDEX.md) · [真实耗法力/释放/自然恢复/再攻击](mana-feedback/validation.json) · [源码及输入/矩形](mana-feedback/screenshots.json) · [检查](mana-feedback/checks.log)。

实际法力约0.87时不能普通射击，旧HUD却四舍五入成1/8；现在显示完整可用量0/8，原不足提示补“会自动恢复”。仅显示/说明，不改消耗或恢复速度。真实触屏长按/释放、自然恢复后再攻击和原星爆均有证据；夜间高血量零伤害靶是明示夹具，非自然守夜或平衡验收。本批待协调人逐图审查。

## 独立维护批次：UI-015 用户开启声音时恢复音频上下文

[14张声音设置同视口前后原图](audio-recovery/INDEX.md) · [真实上下文/音频时钟/节点行为](audio-recovery/validation.json) · [检查及环境限制](audio-recovery/checks.log)。

实际Chromium上下文被挂起后，按钮切到仅音效/声音开但音频仍停；现在仅在用户明确启用音乐或音效时复用ensureAudio恢复。静音不恢复、不改变原增益或内容。原生挂起模拟不是实际来电/后台事件；图片不证明听感，Chromium节点执行记录与WebKit无API兼容检查严格区分，待协调人审查。

## 独立维护批次：UI-014 空田缺种拒绝反馈

[14张同视口首屏前后图](planting-feedback/INDEX.md) · [原生交互/实际耗种/源码与矩形](planting-feedback/screenshots.json) · [检查及中断恢复记录](planting-feedback/checks.log)。

初始两粒种子真实播完后，再对空田交互，原专用“没有种子了”提示被通用说明覆盖；现在空田分支保留plant的结果，不改plant返回值、播种消耗/生长、采集入口或工作台/祭坛优先。协调人11:30复看320白天及已开过同served-byte的390夜间/844白天图，所看状态局部通过，不代表14图全量批准；夜间次提示内滚限制保留。

## 独立维护批次：UI-013 丰收术实际结果

[28张同视口首屏前后原图](farmer-skill-feedback/INDEX.md) · [逐图来源/库存/生命/作物及输入](farmer-skill-feedback/screenshots.json) · [适用检查](farmer-skill-feedback/checks.log)。

正常农夫首局三田已熟、满血时仍声称“麦子一下熟了”；现在按实际待熟田数及回血结果反馈。保留全局催熟/特效、24回血上限、11秒冷却、无效果也进入冷却的既有规则。协调人10:30已看320已熟满血、390新苗夜伤血两图，所看状态局部通过；不是全部28图/教程展开/真机通过，原次提示裁切/内滚限制保留。

## 独立维护批次：UI-012 白天未成熟麦苗说明

[22张真实首屏原图及正常等待生长/收获](crop-feedback/INDEX.md) · [逐图来源/原生输入/库存](crop-feedback/screenshots.json) · [适用检查及限制](crop-feedback/checks.log)。

只补白天对准阶段0/1麦苗的“还在长，成熟后再收”，保持成熟提示、原生长/收获/消耗及夜战优先。空田fixture后实际播种，自然等熟并长按采集；不注资源、阶段或快进生长。夜战优先检查另用明示fixture。协调人10:02已看320萌芽、390自然成熟两图，所看状态局部通过；不是22图全量通过或真机验收，其余待审。

## 独立维护批次：UI-011 已成心的守夜/交付反馈

[五阶段32张真实首屏前后图](heart-delivery/INDEX.md) · [逐图来源/库存/实际画布](heart-delivery/screenshots.json) · [针对性输入/检查](heart-delivery/checks.log)。

已有心不再在工作台提示继续合成，按实际昼夜/守夜数说明等待或去祭坛；交付教程与桌面提示按已持有成品对齐。仅文案，不改制作、扣料或献祭条件。协调人09:28已看第三夜320、第一夜390、可交付白天320三图，所看状态局部通过；未全看32图/手机教程展开，不外推真机或自然三夜验收。

## 独立维护批次：UI-010 宽屏粗指针核心首屏

[1280触屏五状态同视口前后图与其他四视口抽样](wide-touch-layout/INDEX.md) · [原图/实际媒体条件/矩形](wide-touch-layout/screenshots.json) · [真实选栏取消及原生移动采集验证](wide-touch-layout/checks.log)。

原01f宽屏选栏使页面scrollY160、画布顶部被裁；本片仅分配宽屏粗指针布局空间，画布与44px核心控件回到首屏、详细信息仍按需展开。14张原图，原五张前图复用，无自然三夜重跑。协调人09:00已实际看1280粗指针选栏前后，所看状态局部通过；不是14图全量批准/真机验收，详情既有遮挡保留。旧候选及4cf/01f证据保留，不合并或部署。

## 独立维护批次：UI-009 设备相符操作反馈

[四视口建设/修墙/取消40张前后图及其他提示36张后图](device-hints/INDEX.md) · [实际touchLayout/输入/源码逐图记录](device-hints/screenshots.json) · [针对性检查与边界限制](device-hints/validation.json)。

触屏建设明确点地图空地、再点同一背包项取消；桌面保留鼠标/键盘。火把/田不再误称可修墙，取消增加短确认；已有正确触屏引导不重做。只补受影响提示状态，旧基线、4cf83fd材料缺口与自然三夜证据保持，不外推旧片所看状态的局部视觉批准。

## 独立维护批次：UI-008 材料缺口反馈

[320/390九状态36张真实首屏前后原图](material-feedback/INDEX.md) · [逐图构建与复现](material-feedback/screenshots.json) · [30个针对性后版本场景](material-feedback/validation.json) · [检查和归档错误记录](material-feedback/checks.log)。

已有1木、法师栅栏需2木时提示「材料还差：木 1」；修墙明确还差1木，方块之心原正确缺口文案不变。共享实际库存/配方派生规则，不改配方或资源消耗，既有成品仍优先。仅追加本片证据，产品a342ef0/自然证据d80f0e8和本地诊断result保留；不称新反馈已获视觉批准、全界面重拍或已上线。

## 自然主循环维护：源码候选 a342ef0

[骑士自然采集 / 建设种植 / 三夜 / 天亮交付证据](natural-loop-a342ef0/INDEX.md) · [20张真实首屏元数据](natural-loop-a342ef0/screenshots.json) · [原始事件与成败](natural-loop-a342ef0/result.json)。

390×844 隔离新局，普通触控输入、只读定位遥测；游戏 4:48 自然通关，18击杀、生命与篝火满值，没有资源/胜利注入或快进。执行器胜利后收尾报错、部分录像缺最后约9秒均如实保留，不能称全程零错误或完整通关录像。自然实玩图待协调人看。

## 当前可审查批次：核心触控首屏 / 统一提示

[四视口 80 张真实首屏前后图 + 4 张全页补图](core-layout/INDEX.md) · [逐图来源与实测](core-layout/screenshots.json) · [本地检查](core-layout/checks.log) · [原生双触点手势](core-layout/touch-gestures.log)。

手机画布与移动/采集/交互/技能同屏，核心触点不小于 44px；教程/背包可展开，选择建造自动收起。白天、夜战、桌面反馈改为独立限高可滚动区域；同时补首次预演、暂停、失败和胜利首屏。协调人已看320第三夜、390清晨、844横屏首日、320详情、390暂停、320胜利、1280首日：指定普通态局部通过，详情遮主控按限制记录，**不将84图全部标通过**。a342ef0 可作 ready_for_user_playtest **源码候选，不等于腾讯云包**；原core-layout夹具图本身不代表自然三夜实玩。

## 重启后接续：UI-006 / UI-007 夜战整改

[四视口同状态前后图与限制](night-followup/INDEX.md) · [逐图元数据](night-followup/screenshots.json) · [检查输出](night-followup/checks.log) · [恢复与交付记录](night-followup/validation.json)。

本页以下是 **6342093 原批次**的 172 张完整基线；原 305 张图片与历史记录保留不动，不冒称新版本重拍。night-followup 追加夜战、破墙、第三夜后天亮和第四夜状态；未变界面复用旧记录。协调人已打开该批 320 第三夜前后图和 390 第三天清晨后图，UI-006/007 夜间局部视觉复核通过；**不代表当前 core-layout 批次或全局布局通过**。

覆盖：172/172。视觉审查：**待用户逐图审查，未通过**。

- Web / WebKit，中文 zh-CN；项目无英文切换、独立设置页或手动存读档界面，声音开关和暂停操作说明即现有设置入口。
- 独立临时 browser context；不读写用户浏览器存档。normal 从正常选角/开场进入；fixture 明确使用 window.CUBE 测试接口和临时状态，不代表自然通关或平衡验证。
- deviceScaleFactor=1，浏览器缩放 100%，原图未缩放；full_page=true 可能高于视口。viewport 是真实 layout viewport，game_viewport_css 是 canvas 实测尺寸，游戏逻辑视口为 320x192。
- 已截仅表示证据已保存，不表示视觉审查通过。所有图待用户/父协调会话逐图审查；未变且已覆盖的图复用，不重复刷图。持续会话每 4 小时核对一次覆盖，不创建无人值守定时进程。
- 修复前 day-before 从 git 7c22ec5 内存服务渲染；未切换、覆盖或暂存当前工作区。修复后 dirty 构建以三个产品源码文件的 SHA-256 区分。
- 无腾讯云、Pages 上传或部署；只运行本机临时 HTTP 服务。触屏为浏览器模拟，尚未真机验证。
- history 保留中间构建；部分早期归档元数据从原文件名恢复并明确标注缺失的旧 canvas 测量/精确注入参数。当前矩阵的 172 张图保留完整真实测量与复现步骤。

复现命令：`node tests\ui-review.mjs --touch-only`（首批）或 `node tests\ui-review.mjs`（全量）；`node tests\ui-review.mjs --check-coverage` 只核查覆盖与文件，不刷图。
截图及生成器在主题分支；截图完整元数据见 screenshots.json。

检查与限制：[validation.json](validation.json)；原始结果：[local-checks.log](local-checks.log)、[coverage-check.log](coverage-check.log)。

## 优先审查：触屏入口 / 主 HUD 前后图

| 视口 | 基线 7c22ec5 | 当前触屏 / HUD | 小屏暂停修复前 | 当前暂停按钮 |
|---|---|---|---|---|
| desktop-1280x800 | [原图](images/day-before--desktop-1280x800--4eec7720.png) | [原图](images/day-first--desktop-1280x800--d4fcb73d.png) | [原图](images/pause-help--desktop-1280x800--b968823a.png) | [原图](images/pause-actions--desktop-1280x800--d4fcb73d.png) |
| phone-390x844 | [原图](images/day-before--phone-390x844--4eec7720.png) | [原图](images/day-first--phone-390x844--d4fcb73d.png) | [原图](images/pause-help--phone-390x844--b968823a.png) | [原图](images/pause-actions--phone-390x844--d4fcb73d.png) |
| phone-320x568 | [原图](images/day-before--phone-320x568--4eec7720.png) | [原图](images/day-first--phone-320x568--d4fcb73d.png) | [原图](images/pause-help--phone-320x568--b968823a.png) | [原图](images/pause-actions--phone-320x568--d4fcb73d.png) |
| landscape-844x390 | [原图](images/day-before--landscape-844x390--4eec7720.png) | [原图](images/day-first--landscape-844x390--d4fcb73d.png) | — | [原图](images/pause-actions--landscape-844x390--d4fcb73d.png) |

## 界面问题 / 前后图

- **UI-001** 触屏无移动/技能/交互入口：已修复，待用户审查。前图 day-before，当前图 day-first；旧图仍保留在 screenshots.json 的 history。
- **UI-002** 手机引导遮挡画布：已移出画布，待用户审查。前图 day-before，当前图 day-first；旧图仍保留在 screenshots.json 的 history。
- **UI-003** 横屏画布过高，操作时看不到角色/篝火：已改并排布局，待用户审查。前图 0fc9c92a，当前图 day-first；旧图仍保留在 screenshots.json 的 history。
- **UI-004** 320x568 暂停长说明使继续按钮在视口外且不可滚动：已增加面板滚动，待用户审查。前图 b968823a，当前图 pause-actions；旧图仍保留在 screenshots.json 的 history。
- **UI-005** 小屏核心触控需要页面滚动：本轮已改为画布与核心触控同屏，次要背包可展开；见 core-layout 前后首屏，待协调人复看。
- **UI-006** 第三夜夜间引导提前献祭：9c06379 已修复，协调人看过 night-followup 指定状态并局部通过；原 night-wave 保留作历史证据。
- **UI-007** 夜战波次与操作提示重叠：9c06379 夜间局部通过；本轮继续统一白天/夜间/桌面提示分区，见 core-layout，当前批次待复看。

| screen_id | 状态 | 视口 | 来源 | 证据 | 覆盖状态 |
|---|---|---|---|---|---|
| day-before | 触屏修复前的首局 HUD | desktop-1280x800 | baseline | [原图](images/day-before--desktop-1280x800--4eec7720.png) | 已截 |
| day-before | 触屏修复前的首局 HUD | phone-390x844 | baseline | [原图](images/day-before--phone-390x844--4eec7720.png) | 已截 |
| day-before | 触屏修复前的首局 HUD | phone-320x568 | baseline | [原图](images/day-before--phone-320x568--4eec7720.png) | 已截 |
| day-before | 触屏修复前的首局 HUD | landscape-844x390 | baseline | [原图](images/day-before--landscape-844x390--4eec7720.png) | 已截 |
| title-empty | 首次选角，开始按钮禁用 | desktop-1280x800 | normal | [原图](images/title-empty--desktop-1280x800--d4fcb73d.png) | 已截 |
| title-empty | 首次选角，开始按钮禁用 | phone-390x844 | normal | [原图](images/title-empty--phone-390x844--d4fcb73d.png) | 已截 |
| title-empty | 首次选角，开始按钮禁用 | phone-320x568 | normal | [原图](images/title-empty--phone-320x568--d4fcb73d.png) | 已截 |
| title-empty | 首次选角，开始按钮禁用 | landscape-844x390 | normal | [原图](images/title-empty--landscape-844x390--d4fcb73d.png) | 已截 |
| title-selected | 骑士选中，开始按钮启用 | desktop-1280x800 | normal | [原图](images/title-selected--desktop-1280x800--d4fcb73d.png) | 已截 |
| title-selected | 骑士选中，开始按钮启用 | phone-390x844 | normal | [原图](images/title-selected--phone-390x844--d4fcb73d.png) | 已截 |
| title-selected | 骑士选中，开始按钮启用 | phone-320x568 | normal | [原图](images/title-selected--phone-320x568--d4fcb73d.png) | 已截 |
| title-selected | 骑士选中，开始按钮启用 | landscape-844x390 | normal | [原图](images/title-selected--landscape-844x390--d4fcb73d.png) | 已截 |
| intro-1 | 开场故事第 1 页完整长文字 | desktop-1280x800 | normal | [原图](images/intro-1--desktop-1280x800--d4fcb73d.png) | 已截 |
| intro-1 | 开场故事第 1 页完整长文字 | phone-390x844 | normal | [原图](images/intro-1--phone-390x844--d4fcb73d.png) | 已截 |
| intro-1 | 开场故事第 1 页完整长文字 | phone-320x568 | normal | [原图](images/intro-1--phone-320x568--d4fcb73d.png) | 已截 |
| intro-1 | 开场故事第 1 页完整长文字 | landscape-844x390 | normal | [原图](images/intro-1--landscape-844x390--d4fcb73d.png) | 已截 |
| intro-2 | 开场故事第 2 页完整长文字 | desktop-1280x800 | normal | [原图](images/intro-2--desktop-1280x800--d4fcb73d.png) | 已截 |
| intro-2 | 开场故事第 2 页完整长文字 | phone-390x844 | normal | [原图](images/intro-2--phone-390x844--d4fcb73d.png) | 已截 |
| intro-2 | 开场故事第 2 页完整长文字 | phone-320x568 | normal | [原图](images/intro-2--phone-320x568--d4fcb73d.png) | 已截 |
| intro-2 | 开场故事第 2 页完整长文字 | landscape-844x390 | normal | [原图](images/intro-2--landscape-844x390--d4fcb73d.png) | 已截 |
| intro-3 | 开场故事第 3 页完整长文字 | desktop-1280x800 | normal | [原图](images/intro-3--desktop-1280x800--d4fcb73d.png) | 已截 |
| intro-3 | 开场故事第 3 页完整长文字 | phone-390x844 | normal | [原图](images/intro-3--phone-390x844--d4fcb73d.png) | 已截 |
| intro-3 | 开场故事第 3 页完整长文字 | phone-320x568 | normal | [原图](images/intro-3--phone-320x568--d4fcb73d.png) | 已截 |
| intro-3 | 开场故事第 3 页完整长文字 | landscape-844x390 | normal | [原图](images/intro-3--landscape-844x390--d4fcb73d.png) | 已截 |
| intro-4 | 开场故事第 4 页完整长文字 | desktop-1280x800 | normal | [原图](images/intro-4--desktop-1280x800--d4fcb73d.png) | 已截 |
| intro-4 | 开场故事第 4 页完整长文字 | phone-390x844 | normal | [原图](images/intro-4--phone-390x844--d4fcb73d.png) | 已截 |
| intro-4 | 开场故事第 4 页完整长文字 | phone-320x568 | normal | [原图](images/intro-4--phone-320x568--d4fcb73d.png) | 已截 |
| intro-4 | 开场故事第 4 页完整长文字 | landscape-844x390 | normal | [原图](images/intro-4--landscape-844x390--d4fcb73d.png) | 已截 |
| intro-5 | 开场故事第 5 页完整长文字 | desktop-1280x800 | normal | [原图](images/intro-5--desktop-1280x800--d4fcb73d.png) | 已截 |
| intro-5 | 开场故事第 5 页完整长文字 | phone-390x844 | normal | [原图](images/intro-5--phone-390x844--d4fcb73d.png) | 已截 |
| intro-5 | 开场故事第 5 页完整长文字 | phone-320x568 | normal | [原图](images/intro-5--phone-320x568--d4fcb73d.png) | 已截 |
| intro-5 | 开场故事第 5 页完整长文字 | landscape-844x390 | normal | [原图](images/intro-5--landscape-844x390--d4fcb73d.png) | 已截 |
| intro-6 | 开场故事第 6 页完整长文字 | desktop-1280x800 | normal | [原图](images/intro-6--desktop-1280x800--d4fcb73d.png) | 已截 |
| intro-6 | 开场故事第 6 页完整长文字 | phone-390x844 | normal | [原图](images/intro-6--phone-390x844--d4fcb73d.png) | 已截 |
| intro-6 | 开场故事第 6 页完整长文字 | phone-320x568 | normal | [原图](images/intro-6--phone-320x568--d4fcb73d.png) | 已截 |
| intro-6 | 开场故事第 6 页完整长文字 | landscape-844x390 | normal | [原图](images/intro-6--landscape-844x390--d4fcb73d.png) | 已截 |
| brief-camp | 营地预演第 1 步完整文字 | desktop-1280x800 | normal | [原图](images/brief-camp--desktop-1280x800--d4fcb73d.png) | 已截 |
| brief-camp | 营地预演第 1 步完整文字 | phone-390x844 | normal | [原图](images/brief-camp--phone-390x844--d4fcb73d.png) | 已截 |
| brief-camp | 营地预演第 1 步完整文字 | phone-320x568 | normal | [原图](images/brief-camp--phone-320x568--d4fcb73d.png) | 已截 |
| brief-camp | 营地预演第 1 步完整文字 | landscape-844x390 | normal | [原图](images/brief-camp--landscape-844x390--d4fcb73d.png) | 已截 |
| brief-bench | 营地预演第 2 步完整文字 | desktop-1280x800 | normal | [原图](images/brief-bench--desktop-1280x800--d4fcb73d.png) | 已截 |
| brief-bench | 营地预演第 2 步完整文字 | phone-390x844 | normal | [原图](images/brief-bench--phone-390x844--d4fcb73d.png) | 已截 |
| brief-bench | 营地预演第 2 步完整文字 | phone-320x568 | normal | [原图](images/brief-bench--phone-320x568--d4fcb73d.png) | 已截 |
| brief-bench | 营地预演第 2 步完整文字 | landscape-844x390 | normal | [原图](images/brief-bench--landscape-844x390--d4fcb73d.png) | 已截 |
| brief-altar | 营地预演第 3 步完整文字 | desktop-1280x800 | normal | [原图](images/brief-altar--desktop-1280x800--d4fcb73d.png) | 已截 |
| brief-altar | 营地预演第 3 步完整文字 | phone-390x844 | normal | [原图](images/brief-altar--phone-390x844--d4fcb73d.png) | 已截 |
| brief-altar | 营地预演第 3 步完整文字 | phone-320x568 | normal | [原图](images/brief-altar--phone-320x568--d4fcb73d.png) | 已截 |
| brief-altar | 营地预演第 3 步完整文字 | landscape-844x390 | normal | [原图](images/brief-altar--landscape-844x390--d4fcb73d.png) | 已截 |
| brief-build | 营地预演第 4 步完整文字 | desktop-1280x800 | normal | [原图](images/brief-build--desktop-1280x800--d4fcb73d.png) | 已截 |
| brief-build | 营地预演第 4 步完整文字 | phone-390x844 | normal | [原图](images/brief-build--phone-390x844--d4fcb73d.png) | 已截 |
| brief-build | 营地预演第 4 步完整文字 | phone-320x568 | normal | [原图](images/brief-build--phone-320x568--d4fcb73d.png) | 已截 |
| brief-build | 营地预演第 4 步完整文字 | landscape-844x390 | normal | [原图](images/brief-build--landscape-844x390--d4fcb73d.png) | 已截 |
| brief-depart | 营地预演第 5 步完整文字 | desktop-1280x800 | normal | [原图](images/brief-depart--desktop-1280x800--d4fcb73d.png) | 已截 |
| brief-depart | 营地预演第 5 步完整文字 | phone-390x844 | normal | [原图](images/brief-depart--phone-390x844--d4fcb73d.png) | 已截 |
| brief-depart | 营地预演第 5 步完整文字 | phone-320x568 | normal | [原图](images/brief-depart--phone-320x568--d4fcb73d.png) | 已截 |
| brief-depart | 营地预演第 5 步完整文字 | landscape-844x390 | normal | [原图](images/brief-depart--landscape-844x390--d4fcb73d.png) | 已截 |
| day-first | 正常首局 HUD、背包和触屏入口 | desktop-1280x800 | normal | [原图](images/day-first--desktop-1280x800--d4fcb73d.png) | 已截 |
| day-first | 正常首局 HUD、背包和触屏入口 | phone-390x844 | normal | [原图](images/day-first--phone-390x844--d4fcb73d.png) | 已截 |
| day-first | 正常首局 HUD、背包和触屏入口 | phone-320x568 | normal | [原图](images/day-first--phone-320x568--d4fcb73d.png) | 已截 |
| day-first | 正常首局 HUD、背包和触屏入口 | landscape-844x390 | normal | [原图](images/day-first--landscape-844x390--d4fcb73d.png) | 已截 |
| day-returning | 已完成引导的玩家重新开始，跳过开场 | desktop-1280x800 | normal | [原图](images/day-returning--desktop-1280x800--d4fcb73d.png) | 已截 |
| day-returning | 已完成引导的玩家重新开始，跳过开场 | phone-390x844 | normal | [原图](images/day-returning--phone-390x844--d4fcb73d.png) | 已截 |
| day-returning | 已完成引导的玩家重新开始，跳过开场 | phone-320x568 | normal | [原图](images/day-returning--phone-320x568--d4fcb73d.png) | 已截 |
| day-returning | 已完成引导的玩家重新开始，跳过开场 | landscape-844x390 | normal | [原图](images/day-returning--landscape-844x390--d4fcb73d.png) | 已截 |
| day-miner | miner 职业 HUD / 技能 / 法力差异 | desktop-1280x800 | fixture | [原图](images/day-miner--desktop-1280x800--d4fcb73d.png) | 已截 |
| day-miner | miner 职业 HUD / 技能 / 法力差异 | phone-390x844 | fixture | [原图](images/day-miner--phone-390x844--d4fcb73d.png) | 已截 |
| day-miner | miner 职业 HUD / 技能 / 法力差异 | phone-320x568 | fixture | [原图](images/day-miner--phone-320x568--d4fcb73d.png) | 已截 |
| day-miner | miner 职业 HUD / 技能 / 法力差异 | landscape-844x390 | fixture | [原图](images/day-miner--landscape-844x390--d4fcb73d.png) | 已截 |
| day-farmer | farmer 职业 HUD / 技能 / 法力差异 | desktop-1280x800 | fixture | [原图](images/day-farmer--desktop-1280x800--d4fcb73d.png) | 已截 |
| day-farmer | farmer 职业 HUD / 技能 / 法力差异 | phone-390x844 | fixture | [原图](images/day-farmer--phone-390x844--d4fcb73d.png) | 已截 |
| day-farmer | farmer 职业 HUD / 技能 / 法力差异 | phone-320x568 | fixture | [原图](images/day-farmer--phone-320x568--d4fcb73d.png) | 已截 |
| day-farmer | farmer 职业 HUD / 技能 / 法力差异 | landscape-844x390 | fixture | [原图](images/day-farmer--landscape-844x390--d4fcb73d.png) | 已截 |
| day-mage | mage 职业 HUD / 技能 / 法力差异 | desktop-1280x800 | fixture | [原图](images/day-mage--desktop-1280x800--d4fcb73d.png) | 已截 |
| day-mage | mage 职业 HUD / 技能 / 法力差异 | phone-390x844 | fixture | [原图](images/day-mage--phone-390x844--d4fcb73d.png) | 已截 |
| day-mage | mage 职业 HUD / 技能 / 法力差异 | phone-320x568 | fixture | [原图](images/day-mage--phone-320x568--d4fcb73d.png) | 已截 |
| day-mage | mage 职业 HUD / 技能 / 法力差异 | landscape-844x390 | fixture | [原图](images/day-mage--landscape-844x390--d4fcb73d.png) | 已截 |
| build-selected | 栅栏选中、缺口与取消建造提示 | desktop-1280x800 | fixture | [原图](images/build-selected--desktop-1280x800--d4fcb73d.png) | 已截 |
| build-selected | 栅栏选中、缺口与取消建造提示 | phone-390x844 | fixture | [原图](images/build-selected--phone-390x844--d4fcb73d.png) | 已截 |
| build-selected | 栅栏选中、缺口与取消建造提示 | phone-320x568 | fixture | [原图](images/build-selected--phone-320x568--d4fcb73d.png) | 已截 |
| build-selected | 栅栏选中、缺口与取消建造提示 | landscape-844x390 | fixture | [原图](images/build-selected--landscape-844x390--d4fcb73d.png) | 已截 |
| build-no-resource | 材料不足的建造提示 | desktop-1280x800 | fixture | [原图](images/build-no-resource--desktop-1280x800--d4fcb73d.png) | 已截 |
| build-no-resource | 材料不足的建造提示 | phone-390x844 | fixture | [原图](images/build-no-resource--phone-390x844--d4fcb73d.png) | 已截 |
| build-no-resource | 材料不足的建造提示 | phone-320x568 | fixture | [原图](images/build-no-resource--phone-320x568--d4fcb73d.png) | 已截 |
| build-no-resource | 材料不足的建造提示 | landscape-844x390 | fixture | [原图](images/build-no-resource--landscape-844x390--d4fcb73d.png) | 已截 |
| build-repair | 坏墙修复后的反馈 | desktop-1280x800 | fixture | [原图](images/build-repair--desktop-1280x800--d4fcb73d.png) | 已截 |
| build-repair | 坏墙修复后的反馈 | phone-390x844 | fixture | [原图](images/build-repair--phone-390x844--d4fcb73d.png) | 已截 |
| build-repair | 坏墙修复后的反馈 | phone-320x568 | fixture | [原图](images/build-repair--phone-320x568--d4fcb73d.png) | 已截 |
| build-repair | 坏墙修复后的反馈 | landscape-844x390 | fixture | [原图](images/build-repair--landscape-844x390--d4fcb73d.png) | 已截 |
| plant-empty | 空田与播种提示 | desktop-1280x800 | fixture | [原图](images/plant-empty--desktop-1280x800--d4fcb73d.png) | 已截 |
| plant-empty | 空田与播种提示 | phone-390x844 | fixture | [原图](images/plant-empty--phone-390x844--d4fcb73d.png) | 已截 |
| plant-empty | 空田与播种提示 | phone-320x568 | fixture | [原图](images/plant-empty--phone-320x568--d4fcb73d.png) | 已截 |
| plant-empty | 空田与播种提示 | landscape-844x390 | fixture | [原图](images/plant-empty--landscape-844x390--d4fcb73d.png) | 已截 |
| plant-growing | 播种后的幼苗状态 | desktop-1280x800 | fixture | [原图](images/plant-growing--desktop-1280x800--d4fcb73d.png) | 已截 |
| plant-growing | 播种后的幼苗状态 | phone-390x844 | fixture | [原图](images/plant-growing--phone-390x844--d4fcb73d.png) | 已截 |
| plant-growing | 播种后的幼苗状态 | phone-320x568 | fixture | [原图](images/plant-growing--phone-320x568--d4fcb73d.png) | 已截 |
| plant-growing | 播种后的幼苗状态 | landscape-844x390 | fixture | [原图](images/plant-growing--landscape-844x390--d4fcb73d.png) | 已截 |
| plant-ripe | 成熟作物与收麦提示 | desktop-1280x800 | fixture | [原图](images/plant-ripe--desktop-1280x800--d4fcb73d.png) | 已截 |
| plant-ripe | 成熟作物与收麦提示 | phone-390x844 | fixture | [原图](images/plant-ripe--phone-390x844--d4fcb73d.png) | 已截 |
| plant-ripe | 成熟作物与收麦提示 | phone-320x568 | fixture | [原图](images/plant-ripe--phone-320x568--d4fcb73d.png) | 已截 |
| plant-ripe | 成熟作物与收麦提示 | landscape-844x390 | fixture | [原图](images/plant-ripe--landscape-844x390--d4fcb73d.png) | 已截 |
| inventory-large | 大数字背包与长目标文本 | desktop-1280x800 | fixture | [原图](images/inventory-large--desktop-1280x800--d4fcb73d.png) | 已截 |
| inventory-large | 大数字背包与长目标文本 | phone-390x844 | fixture | [原图](images/inventory-large--phone-390x844--d4fcb73d.png) | 已截 |
| inventory-large | 大数字背包与长目标文本 | phone-320x568 | fixture | [原图](images/inventory-large--phone-320x568--d4fcb73d.png) | 已截 |
| inventory-large | 大数字背包与长目标文本 | landscape-844x390 | fixture | [原图](images/inventory-large--landscape-844x390--d4fcb73d.png) | 已截 |
| craft-missing | 合成缺少全部材料的长提示 | desktop-1280x800 | fixture | [原图](images/craft-missing--desktop-1280x800--d4fcb73d.png) | 已截 |
| craft-missing | 合成缺少全部材料的长提示 | phone-390x844 | fixture | [原图](images/craft-missing--phone-390x844--d4fcb73d.png) | 已截 |
| craft-missing | 合成缺少全部材料的长提示 | phone-320x568 | fixture | [原图](images/craft-missing--phone-320x568--d4fcb73d.png) | 已截 |
| craft-missing | 合成缺少全部材料的长提示 | landscape-844x390 | fixture | [原图](images/craft-missing--landscape-844x390--d4fcb73d.png) | 已截 |
| craft-heart | 合成成功，背包方块之心就绪 | desktop-1280x800 | fixture | [原图](images/craft-heart--desktop-1280x800--d4fcb73d.png) | 已截 |
| craft-heart | 合成成功，背包方块之心就绪 | phone-390x844 | fixture | [原图](images/craft-heart--phone-390x844--d4fcb73d.png) | 已截 |
| craft-heart | 合成成功，背包方块之心就绪 | phone-320x568 | fixture | [原图](images/craft-heart--phone-320x568--d4fcb73d.png) | 已截 |
| craft-heart | 合成成功，背包方块之心就绪 | landscape-844x390 | fixture | [原图](images/craft-heart--landscape-844x390--d4fcb73d.png) | 已截 |
| night-wave | 夜间波次、营火、围墙与敌人 | desktop-1280x800 | fixture | [原图](images/night-wave--desktop-1280x800--d4fcb73d--036f284c.png) | 已截 |
| night-wave | 夜间波次、营火、围墙与敌人 | phone-390x844 | fixture | [原图](images/night-wave--phone-390x844--d4fcb73d--036f284c.png) | 已截 |
| night-wave | 夜间波次、营火、围墙与敌人 | phone-320x568 | fixture | [原图](images/night-wave--phone-320x568--d4fcb73d--036f284c.png) | 已截 |
| night-wave | 夜间波次、营火、围墙与敌人 | landscape-844x390 | fixture | [原图](images/night-wave--landscape-844x390--d4fcb73d--036f284c.png) | 已截 |
| night-hurt | 玩家与营火低血量、受伤反馈 | desktop-1280x800 | fixture | [原图](images/night-hurt--desktop-1280x800--d4fcb73d.png) | 已截 |
| night-hurt | 玩家与营火低血量、受伤反馈 | phone-390x844 | fixture | [原图](images/night-hurt--phone-390x844--d4fcb73d.png) | 已截 |
| night-hurt | 玩家与营火低血量、受伤反馈 | phone-320x568 | fixture | [原图](images/night-hurt--phone-320x568--d4fcb73d.png) | 已截 |
| night-hurt | 玩家与营火低血量、受伤反馈 | landscape-844x390 | fixture | [原图](images/night-hurt--landscape-844x390--d4fcb73d.png) | 已截 |
| skill-cooldown | 技能冷却、法力不足、采集攻击提示 | desktop-1280x800 | fixture | [原图](images/skill-cooldown--desktop-1280x800--d4fcb73d.png) | 已截 |
| skill-cooldown | 技能冷却、法力不足、采集攻击提示 | phone-390x844 | fixture | [原图](images/skill-cooldown--phone-390x844--d4fcb73d.png) | 已截 |
| skill-cooldown | 技能冷却、法力不足、采集攻击提示 | phone-320x568 | fixture | [原图](images/skill-cooldown--phone-320x568--d4fcb73d.png) | 已截 |
| skill-cooldown | 技能冷却、法力不足、采集攻击提示 | landscape-844x390 | fixture | [原图](images/skill-cooldown--landscape-844x390--d4fcb73d.png) | 已截 |
| pause-help | 暂停 / 操作说明 / 继续 / 回选角 | desktop-1280x800 | normal | [原图](images/pause-help--desktop-1280x800--d4fcb73d.png) | 已截 |
| pause-help | 暂停 / 操作说明 / 继续 / 回选角 | phone-390x844 | normal | [原图](images/pause-help--phone-390x844--d4fcb73d.png) | 已截 |
| pause-help | 暂停 / 操作说明 / 继续 / 回选角 | phone-320x568 | normal | [原图](images/pause-help--phone-320x568--d4fcb73d.png) | 已截 |
| pause-help | 暂停 / 操作说明 / 继续 / 回选角 | landscape-844x390 | normal | [原图](images/pause-help--landscape-844x390--d4fcb73d.png) | 已截 |
| pause-actions | 暂停长说明滚动到底部，可见继续 / 回选角按钮 | desktop-1280x800 | normal | [原图](images/pause-actions--desktop-1280x800--d4fcb73d.png) | 已截 |
| pause-actions | 暂停长说明滚动到底部，可见继续 / 回选角按钮 | phone-390x844 | normal | [原图](images/pause-actions--phone-390x844--d4fcb73d.png) | 已截 |
| pause-actions | 暂停长说明滚动到底部，可见继续 / 回选角按钮 | phone-320x568 | normal | [原图](images/pause-actions--phone-320x568--d4fcb73d.png) | 已截 |
| pause-actions | 暂停长说明滚动到底部，可见继续 / 回选角按钮 | landscape-844x390 | normal | [原图](images/pause-actions--landscape-844x390--d4fcb73d.png) | 已截 |
| audio-music-off | 音乐关闭，音效保留 | desktop-1280x800 | normal | [原图](images/audio-music-off--desktop-1280x800--d4fcb73d.png) | 已截 |
| audio-music-off | 音乐关闭，音效保留 | phone-390x844 | normal | [原图](images/audio-music-off--phone-390x844--d4fcb73d.png) | 已截 |
| audio-music-off | 音乐关闭，音效保留 | phone-320x568 | normal | [原图](images/audio-music-off--phone-320x568--d4fcb73d.png) | 已截 |
| audio-music-off | 音乐关闭，音效保留 | landscape-844x390 | normal | [原图](images/audio-music-off--landscape-844x390--d4fcb73d.png) | 已截 |
| audio-all-off | 声音全部关闭 | desktop-1280x800 | normal | [原图](images/audio-all-off--desktop-1280x800--d4fcb73d.png) | 已截 |
| audio-all-off | 声音全部关闭 | phone-390x844 | normal | [原图](images/audio-all-off--phone-390x844--d4fcb73d.png) | 已截 |
| audio-all-off | 声音全部关闭 | phone-320x568 | normal | [原图](images/audio-all-off--phone-320x568--d4fcb73d.png) | 已截 |
| audio-all-off | 声音全部关闭 | landscape-844x390 | normal | [原图](images/audio-all-off--landscape-844x390--d4fcb73d.png) | 已截 |
| return-title | 暂停菜单返回选角 | desktop-1280x800 | normal | [原图](images/return-title--desktop-1280x800--d4fcb73d.png) | 已截 |
| return-title | 暂停菜单返回选角 | phone-390x844 | normal | [原图](images/return-title--phone-390x844--d4fcb73d.png) | 已截 |
| return-title | 暂停菜单返回选角 | phone-320x568 | normal | [原图](images/return-title--phone-320x568--d4fcb73d.png) | 已截 |
| return-title | 暂停菜单返回选角 | landscape-844x390 | normal | [原图](images/return-title--landscape-844x390--d4fcb73d.png) | 已截 |
| failure-camp | 篝火熄灭失败结算 | desktop-1280x800 | fixture | [原图](images/failure-camp--desktop-1280x800--d4fcb73d.png) | 已截 |
| failure-camp | 篝火熄灭失败结算 | phone-390x844 | fixture | [原图](images/failure-camp--phone-390x844--d4fcb73d.png) | 已截 |
| failure-camp | 篝火熄灭失败结算 | phone-320x568 | fixture | [原图](images/failure-camp--phone-320x568--d4fcb73d.png) | 已截 |
| failure-camp | 篝火熄灭失败结算 | landscape-844x390 | fixture | [原图](images/failure-camp--landscape-844x390--d4fcb73d.png) | 已截 |
| failure-player | 玩家死亡失败结算 | desktop-1280x800 | fixture | [原图](images/failure-player--desktop-1280x800--d4fcb73d.png) | 已截 |
| failure-player | 玩家死亡失败结算 | phone-390x844 | fixture | [原图](images/failure-player--phone-390x844--d4fcb73d.png) | 已截 |
| failure-player | 玩家死亡失败结算 | phone-320x568 | fixture | [原图](images/failure-player--phone-320x568--d4fcb73d.png) | 已截 |
| failure-player | 玩家死亡失败结算 | landscape-844x390 | fixture | [原图](images/failure-player--landscape-844x390--d4fcb73d.png) | 已截 |
| retry-title | 临时注入失败后，通过真实按钮回到选角 | desktop-1280x800 | fixture | [原图](images/retry-title--desktop-1280x800--d4fcb73d--23e4f1f1.png) | 已截 |
| retry-title | 临时注入失败后，通过真实按钮回到选角 | phone-390x844 | fixture | [原图](images/retry-title--phone-390x844--d4fcb73d--23e4f1f1.png) | 已截 |
| retry-title | 临时注入失败后，通过真实按钮回到选角 | phone-320x568 | fixture | [原图](images/retry-title--phone-320x568--d4fcb73d--23e4f1f1.png) | 已截 |
| retry-title | 临时注入失败后，通过真实按钮回到选角 | landscape-844x390 | fixture | [原图](images/retry-title--landscape-844x390--d4fcb73d--23e4f1f1.png) | 已截 |
| altar-night | 第三夜夜间禁止献祭 | desktop-1280x800 | fixture | [原图](images/altar-night--desktop-1280x800--d4fcb73d.png) | 已截 |
| altar-night | 第三夜夜间禁止献祭 | phone-390x844 | fixture | [原图](images/altar-night--phone-390x844--d4fcb73d.png) | 已截 |
| altar-night | 第三夜夜间禁止献祭 | phone-320x568 | fixture | [原图](images/altar-night--phone-320x568--d4fcb73d.png) | 已截 |
| altar-night | 第三夜夜间禁止献祭 | landscape-844x390 | fixture | [原图](images/altar-night--landscape-844x390--d4fcb73d.png) | 已截 |
| altar-early | 只过两夜禁止献祭 | desktop-1280x800 | fixture | [原图](images/altar-early--desktop-1280x800--d4fcb73d.png) | 已截 |
| altar-early | 只过两夜禁止献祭 | phone-390x844 | fixture | [原图](images/altar-early--phone-390x844--d4fcb73d.png) | 已截 |
| altar-early | 只过两夜禁止献祭 | phone-320x568 | fixture | [原图](images/altar-early--phone-320x568--d4fcb73d.png) | 已截 |
| altar-early | 只过两夜禁止献祭 | landscape-844x390 | fixture | [原图](images/altar-early--landscape-844x390--d4fcb73d.png) | 已截 |
| altar-ready | 第三夜后天亮祭坛交付提示 | desktop-1280x800 | fixture | [原图](images/altar-ready--desktop-1280x800--d4fcb73d.png) | 已截 |
| altar-ready | 第三夜后天亮祭坛交付提示 | phone-390x844 | fixture | [原图](images/altar-ready--phone-390x844--d4fcb73d.png) | 已截 |
| altar-ready | 第三夜后天亮祭坛交付提示 | phone-320x568 | fixture | [原图](images/altar-ready--phone-320x568--d4fcb73d.png) | 已截 |
| altar-ready | 第三夜后天亮祭坛交付提示 | landscape-844x390 | fixture | [原图](images/altar-ready--landscape-844x390--d4fcb73d.png) | 已截 |
| victory | 祭坛交付成功结算与再玩一局 | desktop-1280x800 | fixture | [原图](images/victory--desktop-1280x800--d4fcb73d.png) | 已截 |
| victory | 祭坛交付成功结算与再玩一局 | phone-390x844 | fixture | [原图](images/victory--phone-390x844--d4fcb73d.png) | 已截 |
| victory | 祭坛交付成功结算与再玩一局 | phone-320x568 | fixture | [原图](images/victory--phone-320x568--d4fcb73d.png) | 已截 |
| victory | 祭坛交付成功结算与再玩一局 | landscape-844x390 | fixture | [原图](images/victory--landscape-844x390--d4fcb73d.png) | 已截 |

## 不适用 / 未覆盖

- 无英文切换、账号/存档页、独立设置面板、空列表界面；不得用伪造界面代替。
- 未覆盖真实 iOS/Android 设备、浏览器工具栏/系统手势、安全区，以及完整自然三夜通关；结算/极端值使用标注的临时注入状态。
- 状态截图是全页原图，横屏/小屏可能需要页面滚动；关键控件是否应固定在同屏由用户逐图审查决定。
- 自动测试与截图均不代表布局审查或产品平衡已通过。
