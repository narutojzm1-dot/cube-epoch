# UI-027 · 首批木头成功提示的触屏背包路径

普通骑士新局：实际移动、按住采集、木头自动拾取后，手机成功toast原文仍是「按 1 选栅栏」。仅将该操作词按已有`touchLayout.matches`换成统一的「点背包「栏」选栅栏」，其余整句不变；桌面键鼠保留原完整文本。

产品只改`updateDrops`内一行字符串。`d.kind === "wood" && !state.flags.gathered`、首次标记赋值、3.4秒参数、拾取距离/库存、建造/输入、日夜/胜负/存档均未改。不调整布局、菜单或其他toast。

## 来源、普通输入与限制

6张Web/Chromium原图：320×568、390×844触屏及1280×800桌面各同态前后。实际拍摄时间2026-11-07，中文、100% UI、DPR1、原生视口非full-page，不缩放假装手机。逐图复现、源码、实际画布/按钮矩形在 [screenshots.json](screenshots.json)，完整输入/资源/提示事件在 [validation.json](validation.json)。

- before：内存HTTP响应原Git `7784c189d4e93ddb038681c78bbe2540003ca6ef` 产品三文件，served SHA256 `4d8cf9e8d0ff948c1227ae87efc341c024832b9d3f83922152712042a4a0bf76`（Git LF），来源产品clean；工作区原natural诊断dirty另存，不checkout覆盖。
- after：拍摄时HEAD仍7784c18加本片game.js产品dirty，Windows served SHA256 `2b692debdbd2a66242f108621cde6d4c33360b40dee03a43eb2b7956cb383891`。不倒填未来提交SHA。实际HTTP三文件hash已与读取缓冲区核对。
- 隔离普通新局，实际触屏上滑到角色/开始、可见坐标tap选骑士，实际跳过故事/预演，再方向及「采集/攻击」touchStart/end采树。桌面真实键盘down/up。只读CUBE和toast DOM MutationObserver观察，不写世界、时间、库存或用户存档；不是QA胜利/资源夹具、盲玩或真机。
- 首次采集前`gathered=false`且没有成功提示；正常木头从2增至手机6、桌面5，标记true。多个实际木头入包仍只有一次DOM成功文本写入，释放后held0、200ms位置稳定，提示自然隐藏后标记和库存保留。
- 原toast参数3.4秒未改。原图记录的DOM写入到自然隐藏**游戏时钟**前后约3.3361秒（桌面before3.3356）；原击中停顿分支仍计toastTimer却暂停state.time，此数不等同墙钟秒。补充的单调`performance.now()`前后实测均约3.381秒，见 [before](real-clock-before.log)/[after](real-clock-after.log)，不回写旧图元数据。自然时长断言使用真实时钟，保留原3.3～3.55区间，不加速时间/手动藏提示。
- Chromium手机是真实模拟触屏输入；WebKit完整回归的长按为原生键盘，坐标tap正常触屏，限制分开，不冒称WebKit原生触屏持续按住。

手机backing640×384，实际画布320显示308×184.796875、390显示378×226.796875；桌面backing960×576显示796×477.59375。手机toast44px完整落在60px提示容器，桌面35px/35px；首屏方向、采集、交互、技能保持至少44px且可命中。320/390原图末行完整，不扩大整个说明布局。

## 同态前后原图

| 首批木头入包后 | before | after |
|---|---|---|
| 320×568触屏 | [原图](images/first-wood-toast--320x568--before--4d8cf9e8.png) | [原图](images/first-wood-toast--320x568--after--2b692deb.png) |
| 390×844触屏 | [原图](images/first-wood-toast--390x844--before--4d8cf9e8.png) | [原图](images/first-wood-toast--390x844--after--2b692deb.png) |
| 1280×800键鼠 | [原图](images/first-wood-toast--1280x800--before--4d8cf9e8.png) | [原图](images/first-wood-toast--1280x800--after--2b692deb.png) |

同态指普通新局首批木头成功反馈，而非复制同一随机世界/粒子。仅覆盖本轮要求的320/390/桌面原图；未另拍844横屏、新自然三夜、真机或其他全界面，旧记录复用。6张已截，**待协调逐图审查**，自动检查不代表视觉通过。

## 检查与D盘

复用既有普通选角/采集执行器，新增独立`--first-wood`证据模式和e2e入口，不覆盖UI-026文件；普通after从现有HTML读取原文，不依赖CI浅克隆缺失的祖先对象。`node tests\touch-title.mjs --first-wood --before --capture` / `--first-wood --capture`。

初次after在原生按住谓词等待30秒超时，未记录具体哪个按压/玩家位置，见 [initial-after.log](initial-after.log)。此运行没有after图，未把它冒称通过或判定为产品错误。随后仅增加每步只读位置记录、失败时JSON/PNG留证后重抛；完整after重放通过，不延长超时/跳过断言。初次超时原因未确定，保留为自动化限制，由完整本机/同SHA Linux回归继续把关。

首次完整WebKit回归的既有检查与新输入/文字/一次触发均通过，但新时长断言用游戏时钟，在桌面得到3.289秒而失败，见 [原日志](e2e-game-clock-failure.log)。已按原hitstop分支改用实际单调时钟测toast，游戏时钟仅保留作信息；未放宽区间、改3.4秒参数或改产品。只读窄范围独立审查再次通过，Chrome前后各三视口真实时钟检查通过，第二次完整WebKit回归已取得E2E_OK；三视口真实时长3.389/3.389/3.386秒，6张产品原图不重拍。

每次构建/测试/截图前验证专用 `D:\work\tmp\cube-epoch\first-wood-790cd307` 的TEMP/TMP/TMPDIR、浏览器/工具/npm缓存、APPDATA/LOCALAPPDATA，见 [environment.log](environment.log)、[environment.ps1](environment.ps1)。既有C盘浏览器二进制仅只读启动；Chromium实际profile在 [before.log](before.log)/[after.log](after.log)，执行中WebKit实际profile/artifacts在 [live-temp-paths.log](live-temp-paths.log)。所有原图/完整日志留D盘项目，工具仅回显短摘要。

检查见 [checks.log](checks.log)，独立只读审查见 [review.log](review.log)，关闭进程后的精确D盘清理见 [cleanup.log](cleanup.log)。保持既有PR/线上验收版、旧候选及natural-loop dirty；只叠加开放PR，不合并、Pages或腾讯云发布。

取证收尾时一次工具输出超过20KB，被工具自动转存到C盘临时文本，而非浏览器/测试缓存；已移到本次D盘专用目录并精确删除该C盘文件。后续限定回显，D盘副本随本次可丢弃内容清理。实际路径及清理记录见cleanup.log，不隐瞒此次工具限制。
