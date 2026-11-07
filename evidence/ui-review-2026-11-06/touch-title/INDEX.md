# UI-026 · 首次/重开选角的触屏操作说明

普通隔离手机新局与「怎么玩→暂停→回选角」重载均复现：标题四步仍教WASD、空格/左键、按1、按E，末尾仍教Esc。真实方向和采集按住能操作，却没有对应入口文字。仅根据既有`(any-pointer: coarse), (max-width: 760px)`更新标题操作文字：方向按钮、按住「采集/攻击」、点背包「栏」、点「交互 E」，末尾改进场后点「怎么玩」。四步、第三夜目标、首次故事/再玩说明不变，桌面原HTML文字完整保留，媒体改变时双向更新。

未改CSS、地图面积、44px控件、键鼠/触屏输入、Space重开、暂停/重载、配方/掉落/消耗、日夜/胜负或存档。没有增加教程或新系统。

## 来源与真实输入

本批27张Web/Chromium `151.0.7922.34` 原图，实际拍摄时间2026-11-07，沿用既有证据根目录。320×568、390×844、844×390触屏与1280×800键鼠各三组同态标题前后（24张）；另3张手机实际首日采集后HUD。中文、100% UI/DPR1、非full-page、不缩放拼装；具体滚动位置、矩形、源码与复现路径逐图在 [screenshots.json](screenshots.json)。当前仅中文UI，没有中英文切换，英文项目名不是独立语言界面。

- before：内存响应 `61383ce9246a604aacbc05368373ab8ade9e2610` 的原Git三文件（LF），served SHA256 `4c8dfe192041174e40502eda46e67639d300be8fd2470d8202339b0fff9a11cb`，该产品来源clean。工作区旧natural诊断另有dirty，不切换/覆盖工作区。
- after：拍摄时仍HEAD61383ce加game.js产品dirty，Windows served SHA256 `d20ffe7014c4ec9a271dc805951b126eaa201408aa547641e387a370a0a9b2c3`；不倒填未来提交SHA。测试核对实际HTTP三文件字节，不仅核工作区文件。
- 所有当前图都是普通隔离上下文、实际选骑士/开始、实际点跳故事/预演、真实移动/采集、暂停回选角；只读CUBE观测，无库存/地图/时间/胜利夹具，也不删除用户存档。旧普通三夜记录复用，未重跑三夜。
- 手机Chromium用真实touch滑动到末尾、原生坐标tap（目标中心已在视口，不由locator自动滚入），方向及采集真实touchStart/end。各视口木从原2增至5或6，原随机掉落不同；释放后200ms位置漂移0、held0。普通暂停回选角后seen保留1，游戏为空、开始禁用，说明仍对应触屏。
- WebKit回归原生坐标tap，但滑动/按住用真实Home/End和键盘down/up，**不冒称WebKit原生触屏按住**。既有胜利边界Tab/Space重开/选角/开始及游戏Space采集由本轮完整e2e回归，不重拍UI-025。
- 844触屏宽度大于760仍显示触屏文字，验证coarse判定；1280键鼠保留原文，并真实resize到320再回1280，验证媒体变化可逆。布局不按最近一次输入设备临时换文。

实际游戏画布640×384 backing；首日截图320显示308×184.796875、390显示378×226.796875、844居中显示333.328125×199.984375，原图可见黑边等原布局。三个视口核心方向/采集/交互/技能均高44px、宽至少44px，命中目标和首屏边界断言通过。标题页没有可见游戏画布，元数据metrics为null，不能当玩法视口图。

## 前后原图

| 状态/视口 | before | after |
|---|---|---|
| 首次四步 / 320×568 | [原图](images/title-first--320x568--before--4c8dfe19.png) | [原图](images/title-first--320x568--after--d20ffe70.png) |
| 末尾提示 / 320×568 | [原图](images/title-footer--320x568--before--4c8dfe19.png) | [原图](images/title-footer--320x568--after--d20ffe70.png) |
| 普通回选角 / 320×568 | [原图](images/title-reopened--320x568--before--4c8dfe19.png) | [原图](images/title-reopened--320x568--after--d20ffe70.png) |
| 首次四步 / 390×844 | [原图](images/title-first--390x844--before--4c8dfe19.png) | [原图](images/title-first--390x844--after--d20ffe70.png) |
| 末尾提示 / 390×844 | [原图](images/title-footer--390x844--before--4c8dfe19.png) | [原图](images/title-footer--390x844--after--d20ffe70.png) |
| 普通回选角 / 390×844 | [原图](images/title-reopened--390x844--before--4c8dfe19.png) | [原图](images/title-reopened--390x844--after--d20ffe70.png) |
| 首次四步 / 844×390 | [原图](images/title-first--844x390--before--4c8dfe19.png) | [原图](images/title-first--844x390--after--d20ffe70.png) |
| 末尾提示 / 844×390 | [原图](images/title-footer--844x390--before--4c8dfe19.png) | [原图](images/title-footer--844x390--after--d20ffe70.png) |
| 普通回选角 / 844×390 | [原图](images/title-reopened--844x390--before--4c8dfe19.png) | [原图](images/title-reopened--844x390--after--d20ffe70.png) |
| 首次四步 / 1280×800 | [原图](images/title-first--1280x800--before--4c8dfe19.png) | [原图](images/title-first--1280x800--after--d20ffe70.png) |
| 末尾提示 / 1280×800 | [原图](images/title-footer--1280x800--before--4c8dfe19.png) | [原图](images/title-footer--1280x800--after--d20ffe70.png) |
| 普通回选角 / 1280×800 | [原图](images/title-reopened--1280x800--before--4c8dfe19.png) | [原图](images/title-reopened--1280x800--after--d20ffe70.png) |

实际触屏首日：[320](images/first-day-controls--320x568--after--d20ffe70.png)、[390](images/first-day-controls--390x844--after--d20ffe70.png)、[844横屏](images/first-day-controls--844x390--after--d20ffe70.png)。[validation.json](validation.json)保存逐项原生输入时间戳和游戏结果。

## D盘路径与限制

每次构建/测试/截图启动前专用环境 `D:\work\tmp\cube-epoch\touch-title-790cd307`：TEMP/TMP/TMPDIR、浏览器缓存、npm/tool缓存、LOCALAPPDATA/APPDATA均指向其子目录；Node实际os.tmpdir和写读删探针验证通过，见 [environment.log](environment.log)。既有C盘浏览器二进制仅以显式路径只读启动，不迁移/安装；Chromium实际命令行user-data-dir在D，见 [before.log](before.log)、[after.log](after.log)；执行中的WebKit profile和artifacts真实路径在 [live-temp-paths.log](live-temp-paths.log)。完整日志与原图在D盘项目，命令回显限定短摘要，避免大输出被工具转存C盘临时文件。

所有本次浏览器已关闭，WebKit实际launch PID用Get-Process核实消失，Chromium执行完awaited close后profile/artifacts为空。只删除核实的六个D盘运行子目录及已复制留证的环境脚本，专用运行目录留空，见 [cleanup.log](cleanup.log)。首次清理检查的PowerShell语法/WMI「无效类」及空目录层级保守停止记录在 [cleanup-initial-errors.log](cleanup-initial-errors.log)，未用WMI失败后的成功标记当验证，未按进程名杀其他程序。

首次命令行检查因默认未设enable-automation失败，见 [preflight-initial.log](preflight-initial.log)，随后仅验证启动添加该标志。第二次locator.tap虽然中心已可见，仍自动滚动整张角色卡导致开始按钮不在视口；原失败日志/2图/元数据保留在 [touch-title-initial-input](../touch-title-initial-input/)，当前测试改用真实坐标tap，不放宽可见断言。两者是测试启动/输入方式问题，无产品写入，不混入当前27张覆盖。

当前图**已截，待父协调逐图审查**；本机只复看受影响关键原图，不等于用户视觉通过。未覆盖真机、人类盲玩、新自然三夜、所有界面重拍或触屏多指跨结算。WebKit原生音频API限制沿用既有记录，不把兼容检查称作原生音频恢复验证。

保留旧候选与natural-loop dirty，后续候选仅记实证：本批首日采树成功toast仍写「按1选栅栏」，与触屏背包「栏」措辞不一致（未在本片扩修）。检查见 [checks.log](checks.log)，独立只读代码审查见 [review.log](review.log)。只叠加开放PR，不合并、不发布。
