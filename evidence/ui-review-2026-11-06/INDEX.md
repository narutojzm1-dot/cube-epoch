# Cube Epoch UI review · 2026-11-06

## 独立维护批次：UI-036 缺麦且无种无苗时的补给路径

[54张当前320/390/桌面前后原图及54张夹具启动瞬态历史](exhausted-wheat-supply/INDEX.md) · [逐图源码/画布/输入](exhausted-wheat-supply/screenshots.json) · [真实耗尽形成、路线与夜怪概率样本](exhausted-wheat-supply/validation.json)。

原三株成熟麦真实收完、默认2种实际播种，9次鼠标采收/6次E播种/2次H吃麦，遗落种自然过期形成麦1种0作物0；固定第三白天复用该库存/空苗前置，真实触屏/键鼠走近工作台只能拒绝缺麦。仅此状态提示「夜守篝火打怪，可能掉麦或种子」，金框改指篝火；成熟麦/未熟苗/有种/配方就绪/已有心保持，掉落与全部规则不改。初次图中的新局采树toast属于恢复夹具启动瞬态，保留并待其自然过期补当前图，不扩修产品通知。不称连续自然走位/三夜通关或实体设备；视觉待用户/协调审查，#25–32及诊断保留，不合并、不部署。

## 独立维护批次：UI-035 缺麦且无种子时指向麦苗

[48张当前同态前后原图及6张执行器部分历史](seedless-crop-guidance/INDEX.md) · [逐图源码/画布/输入](seedless-crop-guidance/screenshots.json) · [真实种植、自然成熟与采收](seedless-crop-guidance/validation.json)。

白天真实播种用完初始2种子，原金框仍指无法播种的空田；仅在缺麦时以种子门控空田目标，再指已有未熟麦苗，走近复用现有等待提示。成熟麦、有种子、夜守、缺其他材料、围营、已有心优先保持。320/390/844真实触屏、1280键鼠，固定材料/地图位置/此前已收前置，非完整自然采集或三夜通关；生长、配方、资源和存档不改。视觉待用户/协调审查，保护#25–31及诊断，不合并、不发布。

## 独立维护批次：UI-032 第三夜首波正常运行的可读窗口

[32张无暂停同态前后原图](third-night-first-wave/INDEX.md) · [真实持续/首波/触摸时间戳](third-night-first-wave/timing.json) · [逐图源码/真实画布/前置条件](third-night-first-wave/screenshots.json)。

只在第三夜及以后首波触屏beginWave通知纳入面朝怪/朝墙拆墙短句，保留夜数/波次和原2.4秒预算。入夜前1.2秒的明确已过两夜前置，之后时钟、波生成、移动/施放均正常且无暂停；320/390/844真实触屏模拟、桌面抽验，首波实际约2.385秒可见，至少1.65秒后和触摸后仍完整。非自然整局；旧PR28暂停入夜取证原样保留，不冒作本片窗口证明。#25–28和诊断保留，待协调审图，不合并、不发布。

## 独立维护批次：UI-031 第三夜及以后触屏toast

[24张同态前后原图与24张错帧历史图](third-night-toast/INDEX.md) · [逐图源码/真实画布/夹具暂停边界](third-night-toast/screenshots.json) · [真实触控与库存/墙](third-night-toast/validation.json)。

仅第三夜及以后触屏入夜toast改为金色立方、波数、面朝怪/朝墙拆墙的短句。第二夜蝙蝠原文、桌面、原时序/波次/输入/规则不改。第3夜四视口明确夹具：入夜文字原下一帧即被首波通知替换，仅QA暂停该入夜帧取图、原生输入前恢复，不称自然通关。初次读取/截图错帧24图完整保留；旧普通三夜只读抽核，#25–27及诊断保留。新图待协调审查，不合并、不发布。

## 独立维护批次：UI-030 首夜触屏朝墙攻击的误导

[68张当前前后原图与12张中间图](first-night-wall-guidance/INDEX.md) · [逐图源码/实际画布/原生输入](first-night-wall-guidance/screenshots.json) · [库存/缺口/自然首日时间](first-night-wall-guidance/validation.json)。

普通320/390/桌面独立新局采木、放首墙并自然入夜；旧「站在墙后打」会引导触屏按住攻击拆自己的墙。仅适配触屏首夜短反馈与现有守夜步骤，明确朝墙拆墙、先侧移面朝怪；原输入、2木成本/1木退款、昼夜和桌面文字不改。844及其他视口边界夹具单列，不称普通横屏自然跑、完整首夜存活或实体设备验收。待协调逐图审查；#25/#26及旧诊断保留，不合并、不发布。

## 独立维护批次：UI-029 宽屏触控首局舞台黑区

[87张真实原图](canvas-black-area/INDEX.md) · [逐图版本、资源哈希、矩形、DPR和原生输入](canvas-black-area/screenshots.json)。

公网e35452c58的7项静态资源逐项匹配version.json；新隔离配置与当前52195fc同条件复现宽屏触控舞台被撑高、完整画布居中，1484×1040上下各约166px，开背包约190px。仅收回宽屏触控舞台/主区过高布局，不改绘制、加载、地图或规则；修复后上下黑区0，320/390/844及细指针画布矩形不变。公网29、父版29、修复后29原图待协调审查，非新版全界面或实体设备验收。Office独占D临时目录、关闭浏览器后精确清理；#25旧批次和原诊断不动，不合并、不发布。

## 独立维护批次：UI-028 普通新玩家的第一面栅栏

[72张原生视口前后图](first-fence-onboarding/INDEX.md) · [普通采木、拒绝、纠正、扣料与真实落点](first-fence-onboarding/validation.json) · [逐图来源与中间图](first-fence-onboarding/screenshots.json)。

按用户公网e354实玩反馈，将缩写入口改为完整名称，分开现成数量与成本/选中；首日采木后的栅栏入口紧邻地图与操作，短反馈只说当前一步，说明直接用木头、不用先合成。四视口正常输入核法师2木落第一面、缺口4→3，键鼠Tab/Space/数字键与模拟原生触控分开。68张普通入口/玩法/背包/帮助图、4张320资源边界夹具图及80张中间图待协调逐图审查；专用不足提示补足即撤、其他通知保留，库存/日末夹具不称自然守夜。57条同源重放旧元数据不是保留原图。旧批次/诊断和PR #24不改，不合并、不发布。

## 独立维护批次：UI-027 首批木头成功提示的触屏背包路径

[6张320/390/桌面同态前后原图](first-wood-toast/INDEX.md) · [普通输入/资源/一次触发与自然隐藏](first-wood-toast/validation.json) · [源码与实际矩形](first-wood-toast/screenshots.json) · [检查](first-wood-toast/checks.log)。

仅将首次拾木toast的「按1」按既有触屏判定改为「点背包「栏」选栅栏」，键鼠整句、触发标记、3.4秒参数和所有规则不变。普通触屏真采集、剩余木头入包只触发一次，6图待协调逐图审查；首次自动化按住超时原log保留，未混称已诊断。D盘专用profile/cache，旧证据/诊断复用且不改。

## 独立维护批次：UI-026 手机首次/重开选角操作说明

[27张原图：四视口标题同态前后与三手机首日](touch-title/INDEX.md) · [普通新局/暂停回选角及真实移动采集](touch-title/validation.json) · [源码/矩形](touch-title/screenshots.json) · [D盘环境](touch-title/environment.log) · [检查](touch-title/checks.log)。

首次与普通重开标题原文仍教键鼠；仅用既有触屏布局判定改四步中的操作词及末尾「怎么玩」入口，桌面保留原文，媒体双向更新。无世界/胜利夹具、CSS/输入/规则/存档修改；Chromium实际触屏滑动/点按/按住与WebKit键盘按住限制分开。27图已截待逐图审查，8张初次输入工具错误图单独保留不计本批，旧证据复用。

## 独立维护批次：UI-025 胜利后Space重开、选角与进场

[24张320/390/844前后原图](victory-restart/INDEX.md) · [真实Tab/Space/tap与首日控制记录](victory-restart/validation.json) · [来源](victory-restart/screenshots.json) · [检查](victory-restart/checks.log)。

胜利后原生tap重开无残留，但聚焦再玩、角色和开始按Space都被玩法监听拦住；只恢复可见选角/结算按钮的原生激活，不动游戏Space、暂停、规则或存档。复用明示胜利边界，before真实Enter绕行、after不需绕行；新首日移动/采集/释放及键盘旧按压探针通过。当前图待逐项审查，临时大输出用D盘专用目录。

## 独立维护批次：UI-024 走近祭坛后撤掉过期专用拒绝

[6张320/390/844同态前后原图](altar-refusal-refresh/INDEX.md) · [真实输入及通知替换负覆盖](altar-refusal-refresh/validation.json) · [来源](altar-refusal-refresh/screenshots.json) · [检查](altar-refusal-refresh/checks.log)。

针对协调指出UI-023走近截图的双重提示：只隐藏已可献且进入原22px以内时当前那条专用距离拒绝，不改通用toast计时；后续建造、播种、缺种通知保持。新图均明示夹具，立即触屏走近而非等待自然过期，旧UI-023与自然记录不改，待逐图审查。

## 独立维护批次：UI-023 祭坛交付距离边界反馈

[18张320/390/844前后原图](altar-arrival/INDEX.md) · [准确来源](altar-arrival/screenshots.json) · [真实点按/走近/扣心与边界回归](altar-arrival/validation.json) · [检查](altar-arrival/checks.log)。

复用旧普通三夜记录；当前夹具在24px处显示献祭步骤却不能献出，原提示26px/操作22px范围不一致。只把原操作范围之外改为靠近提示与本次未献出的反馈；保留原距离、胜负/库存、夜数条件及面对空田的种植/缺种优先。新图均明示夹具，待协调逐图审查，不称新的自然三夜或真机通过。

## 独立维护批次：UI-022 第一晚近怪建造操作反馈

[24张前后原图](first-dusk-feedback/INDEX.md) · [自然首日/第一晚及独立输入夹具](first-dusk-feedback/validation.json) · [准确源码/视口](first-dusk-feedback/screenshots.json) · [检查](first-dusk-feedback/checks.log)。

自然首局76秒入夜时目标、教程和选择已正确保留；近怪重新选火仍提示放置，却真实按住空地耗法力攻击、不扣木/不放置。本片只说明原近怪按住空地攻击优先，复用建造说明与原帮助，不改变短点或战斗规则。10普通路径图（同320局实际390/844视口）、14明确夹具图待审；不称完整守夜/真机或全图通过，旧批次/诊断保留。

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

## UI-033 已可交付时的祭坛教程优先

第三黎明、心1且营地东缺口1的真实触控复现：目标已指祭坛，教程/缺口黄框/黎明通知却要求补墙。复用既有可交付条件统一指引；主动选栅栏仍保留高亮和建造规则。

本片[逐图 INDEX](altar-guide-priority/INDEX.md)、[screenshots.json](altar-guide-priority/screenshots.json)、[validation.json](altar-guide-priority/validation.json)：40张当前320/390/844/1280前后原图、4张初次部分取证历史；明示第三黎明前置，原土路真实走近，一次交互扣心到正常胜利，不是完整自然三夜跑，视觉待用户/协调审查。

## UI-034 三夜后备齐材料的工作台指引

心0、原配方木4石5金3麦3齐全且营地缺墙1，顶部目标工作台而教程/地图仍补墙。仅对齐三夜后白天已备齐的工作台提示与自动缺口，已有心祭坛优先、主动建墙/缺料/前两夜/夜间照旧。

[本片 INDEX](bench-guide-priority/INDEX.md)、[screenshots.json](bench-guide-priority/screenshots.json)、[validation.json](bench-guide-priority/validation.json)：56张当前320/390/844/1280同态前后图，另3张初次部分历史；固定第三黎明前置，真实沿原土路到工作台一次扣原配方，再到祭坛一次扣心胜利。不是自然三夜通关，视觉待用户/协调审查。

## 不适用 / 未覆盖

- 无英文切换、账号/存档页、独立设置面板、空列表界面；不得用伪造界面代替。
- 未覆盖真实 iOS/Android 设备、浏览器工具栏/系统手势、安全区，以及完整自然三夜通关；结算/极端值使用标注的临时注入状态。
- 状态截图是全页原图，横屏/小屏可能需要页面滚动；关键控件是否应固定在同屏由用户逐图审查决定。
- 自动测试与截图均不代表布局审查或产品平衡已通过。
