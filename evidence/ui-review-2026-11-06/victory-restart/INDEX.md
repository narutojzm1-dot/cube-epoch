# UI-025 · 胜利后键盘重开、选角与开始

真实输入先核对：现有胜利边界夹具交付后，原生点「再玩一局」重载选角，再选法师进入首日，结算层/旧输入未残留。真正阻塞是键盘：原生Tab聚焦再玩、角色卡和开始按钮后，Space均被全局玩法keydown取消，Enter才能绕行。

最小修改仅放行**可见选角页**的角色卡/开始按钮、以及**可见且state.over**结算按钮的Space/Enter原生激活。未将所有按钮或游戏内Space放行；隐藏选角页、开场/预演推进、暂停、采集按键均维持原语义。没有改reload流程、胜负、掉落、经济、时间或存档结构。

## 来源、输入与限制

24张当前Web/Chromium原图：320×568、390×844、844×390四个输入节点前后，中文100%/DPR1/真实首屏；桌面1280×800真实键盘/点击行为回归但不重拍未变桌面。[screenshots.json](screenshots.json)包含状态、实际游戏画布/控制矩形与来源；选角页用原生Tab自然滚动至焦点，图片不是完整选角基线或缩放手机替代品。

- before：内存响应44aa6793a2d29471d80479cd71fb0c57a07036a0原Git产品，served SHA256 `890bbb992ffc4aea5df26e72a900c776c49913287cb26f5e3c589002d769b446`，产品clean；与Windows bf619521换行字节来源不同，不覆盖工作区。
- after：拍摄HEAD仍44aa679加本片game.js产品dirty，Windows served SHA256 `1452e9f2b714c7676339a1dbc095520b7e3a0ec4e446f8ebc8d53bfde6d64abe`。不倒填未来提交号，旧自然诊断另有dirty且不混入。
- 隔离正常骑士入口：原生点击/触屏tap，按钮必要滚入由引擎完成，非声称长选角页按钮裸触屏首屏可见。胜利边界明确注入：白天、夜数3、心1、祭坛南12px、时间284、空敌，然后真实E/交互扣心触发原胜利；不是新自然三夜或真实获取心。
- 键盘阶段每视口实际Tab/Space。before每个阻塞处仅用真实Enter绕行；after不需要绕行。再玩/开始截图前后是**同一输入节点的不同结果**（旧版留在面板/标题，修后进入选角/首日），不冒称相同界面精确状态。
- 法师新局夜0/心0/击杀0、满生命、原首日与教程重置，结算隐藏、held0。Chromium手机真实方向touchStart/end，桌面及WebKit回归实际键盘移动；游戏Space真实采树拾木，释放后200ms位置稳定，证明未误拦截游戏Space。before掉木4、after3属原随机掉落，不修改数值。
- 另实际按住键盘Space交付赢局，showOverlay清旧输入，再原生点/点击重开选角进场，确认仍无旧结算/held。此为**键盘旧按压探针**，不冒称跨胜利保持的多指触屏验证。逐项事件时间戳和结果在 [validation.json](validation.json)各项`input_log`。
- 初次测试错误为在真实Enter重载后过早evaluate，留下 [原日志](../victory-restart-initial-navigation/before.log)、[原单图/元数据](../victory-restart-initial-navigation/screenshots.json)。已用动作前注册真实DOMContentLoaded等待修测试，不扩大超时/吞错误；这1张仅保留历史，不算当前24张。
- 大体积浏览器临时profile/artifacts均使用项目专用D盘 `D:\work\projects\cube-epoch\node_modules\.cache\cube-epoch\victory-restart-790cd307`（各本地测试进程TEMP/TMP/TMPDIR），证据日志也在D盘本批，未安装/迁移依赖。

## 前后原图

| 输入节点/视口 | before | after |
|---|---|---|
| 再玩Space / 320 | [原图](images/replay-space--320x568--before--890bbb99.png) | [原图](images/replay-space--320x568--after--1452e9f2.png) |
| 角色Space / 320 | [原图](images/role-space--320x568--before--890bbb99.png) | [原图](images/role-space--320x568--after--1452e9f2.png) |
| 开始Space / 320 | [原图](images/start-space--320x568--before--890bbb99.png) | [原图](images/start-space--320x568--after--1452e9f2.png) |
| 首日控制实采 / 320 | [原图](images/first-day-controls--320x568--before--890bbb99.png) | [原图](images/first-day-controls--320x568--after--1452e9f2.png) |
| 再玩Space / 390 | [原图](images/replay-space--390x844--before--890bbb99.png) | [原图](images/replay-space--390x844--after--1452e9f2.png) |
| 角色Space / 390 | [原图](images/role-space--390x844--before--890bbb99.png) | [原图](images/role-space--390x844--after--1452e9f2.png) |
| 开始Space / 390 | [原图](images/start-space--390x844--before--890bbb99.png) | [原图](images/start-space--390x844--after--1452e9f2.png) |
| 首日控制实采 / 390 | [原图](images/first-day-controls--390x844--before--890bbb99.png) | [原图](images/first-day-controls--390x844--after--1452e9f2.png) |
| 再玩Space / 844横屏 | [原图](images/replay-space--844x390--before--890bbb99.png) | [原图](images/replay-space--844x390--after--1452e9f2.png) |
| 角色Space / 844横屏 | [原图](images/role-space--844x390--before--890bbb99.png) | [原图](images/role-space--844x390--after--1452e9f2.png) |
| 开始Space / 844横屏 | [原图](images/start-space--844x390--before--890bbb99.png) | [原图](images/start-space--844x390--after--1452e9f2.png) |
| 首日控制实采 / 844横屏 | [原图](images/first-day-controls--844x390--before--890bbb99.png) | [原图](images/first-day-controls--844x390--after--1452e9f2.png) |

24张已截，待协调逐图审查；不是真机、人类盲玩或自然三夜验收，未覆盖触屏多指跨结算/失败重开。普通原生tap重开及键盘旧按压探针已实测，不把全部入口混称原生触屏。`node tests\victory-restart.mjs --before --capture` / `--capture`；检查见 [checks.log](checks.log)。旧候选/自然诊断保持，只叠加开放PR，不合并、不发布。
