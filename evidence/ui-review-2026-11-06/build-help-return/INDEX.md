# UI-021 · 暂停帮助随时返回

范围：白天采集备料→查看建造说明→返回、取消或继续放置。原暂停帮助把操作按钮排在长文末尾；正常触屏实测320/390/844分别需上滑438/85/360px才看见继续。原入口能退出，但首屏没有返回控制。另观察到再次打开帮助沿用上次滚动位置。

最小修复：仅原暂停帮助用纵向面板，正文独立原生滚动，原“继续 / 回选角”始终可见；重新打开正文从顶部开始。按钮仍76×44、92×44，显式min-width/min-height44避免依赖平台字体。正文可键盘聚焦，暂停时导航键保留原生滚动，不进入游戏按键集合。非暂停结算面板不使用此布局；不改暂停回调、游戏输入、地图、配方、成本、昼夜或存档。

## 来源与实际行为

20张Web/Chromium原图，DPR1、100%、中文；320×568、390×844、844×390触屏，1280×800键鼠。原图不缩放。每图实际画布、源码、时间、输入及夹具在 [screenshots.json](screenshots.json)，正常路径及前后滚动数据在 [validation.json](validation.json)。

- before：产品源码`920cadffc27330ef37407b260e123b1b45682f0a`，产品dirty=false；实际三文件SHA256 `69865efc957d09ea6e80a32f4a6b5077413aefae25632e3598b006d144969714`。
- after：同HEAD加本片game.js/style.css/index.html，产品dirty=true；实际SHA256 `4b50e0ef92f78a47796967524310e3d9c654eda13aa45532a406bcb8290a3bea`。保留拍摄时来源，不改成后来的提交号。全工作区另有受保护natural-loop诊断dirty。补键盘可达及显式44px前的20张中间构建原图保留在screenshots.json的history，不混称当前after。
- 普通隔离法师新局，真实方向/采集长按拾木；选火点砍出的(25,22)，先用原成品火把。点击建造说明，改后未滑动就真实点继续、再打开原生上滑正文至底。滚动前后模拟时间、日夜、生命、篝火、库存、选择和暂停完全相同，按钮矩形固定。
- 真实继续后同项取消不扣料；重选并真实点(25,23)，落火把13，只扣原木1。四视口画布矩形前后完全相同，核心首屏和44px控制通过原检查。
- 4张night-help-fixture图及行为检查是正常日间路径之后，明确设置首夜完成波3/3、cycle=0、time=2、nights=1、toSpawn=0、enemies=[]的隔离夹具。重新打开从顶部显示当前反馈，真实上滑不恢复模拟；只有明确点继续才恢复夜间时间，且无残留held。不是自然守夜验收。
- Chromium触屏采用真实CDP touchStart/move/end及原生tap，无自动滚入。WebKit移动上下文不提供mouse.wheel：回归用实际可聚焦正文、真实End/Home/End及每次scrollend完成后核对底/顶，不加超时或跳滚动断言；不是触屏拖动。桌面仍用原生滚轮，1280键鼠继续与Escape开关保留。

## 原图逐项索引

| 状态 | 视口 | before原图 | after原图 | 状态 |
|---|---|---|---|---|
| 白天说明首屏 | 320×568 | [before](images/build-help--320x568--before--69865efc.png) | [after](images/build-help--320x568--after--4b50e0ef.png) | 已截，待审 |
| 白天原生上滑至底 | 320×568 | [before](images/build-help-scrolled--320x568--before--69865efc.png) | [after](images/build-help-scrolled--320x568--after--4b50e0ef.png) | 已截，待审 |
| 夜间帮助夹具 | 320×568 | [before](images/night-help-fixture--320x568--before--69865efc.png) | [after](images/night-help-fixture--320x568--after--4b50e0ef.png) | 已截，待审 |
| 白天说明首屏 | 390×844 | [before](images/build-help--390x844--before--69865efc.png) | [after](images/build-help--390x844--after--4b50e0ef.png) | 已截，待审 |
| 白天原生上滑至底 | 390×844 | [before](images/build-help-scrolled--390x844--before--69865efc.png) | [after](images/build-help-scrolled--390x844--after--4b50e0ef.png) | 已截，待审 |
| 白天说明首屏 | 844×390 | [before](images/build-help--844x390--before--69865efc.png) | [after](images/build-help--844x390--after--4b50e0ef.png) | 已截，待审 |
| 白天原生上滑至底 | 844×390 | [before](images/build-help-scrolled--844x390--before--69865efc.png) | [after](images/build-help-scrolled--844x390--after--4b50e0ef.png) | 已截，待审 |
| 夜间帮助夹具 | 844×390 | [before](images/night-help-fixture--844x390--before--69865efc.png) | [after](images/night-help-fixture--844x390--after--4b50e0ef.png) | 已截，待审 |
| 白天说明首屏 | 1280×800 | [before](images/build-help--1280x800--before--69865efc.png) | [after](images/build-help--1280x800--after--4b50e0ef.png) | 已截，待审 |
| 白天鼠标帮助末尾 | 1280×800 | [before](images/build-help-scrolled--1280x800--before--69865efc.png) | [after](images/build-help-scrolled--1280x800--after--4b50e0ef.png) | 已截，待审 |

复现：`node tests\build-guidance.mjs --return-help --capture`；before只允许920cadf且产品clean。旧build-guidance批次不覆盖。检查见 [checks.log](checks.log)、[integration.log](integration.log)。初次夜间夹具漏设置wavesTotal导致等待波次超时，保留 [initial-fixture.log](initial-fixture.log)，补真实显示条件后通过。首轮WebKit到本片时因移动wheel API不可用退出，保留 [initial-integration.log](initial-integration.log)，其余已过回归不冒称失败；添加正文键盘可达并按真实原生滚动重验，不改时间或跳闸门。

限制：20图待协调人逐图审查，测试通过不是视觉通过或真机验收；截图只临时暂停模拟，普通白天路径没有库存/位置/世界/时间或源码注入。不重拍未变全图、不重打自然三夜。旧候选、natural-loop诊断和其他分片保留；PR开放不合并，未发布Pages/腾讯云。
