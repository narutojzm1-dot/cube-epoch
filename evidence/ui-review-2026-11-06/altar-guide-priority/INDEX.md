# UI-033 已可交付时不再回退补墙

当前40张：第三黎明、营地可交付、展开教程、走到祭坛、胜利 × 320/390/844/1280 × 前后。另保留初次320的4张历史原图，不混作当前完整矩阵。视觉仍待用户/协调审查。

[逐图版本/画布/输入](screenshots.json) · [前后11例验证](validation.json) · [检查](checks.log) · [独立代码审查](review.log)

## 确证问题与最小修复

保留教程、三夜后白天、心1/东缺口1：objective/currentTarget已指祭坛，但旧教程仍是「第三步：围营地」，正文要求补发光格，原画布确实绘制可见黄框缺口（逻辑坐标137,89），第三黎明toast也要求补墙。正常不补墙即可沿土路北行交付。

复用canOffer()：已可交付教程提前选现有献祭步；黎明复用现有祭坛文字；只隐藏自动缺口高亮。主动选栅栏仍保留高亮/候选及原放置成本。未持心、前两夜、夜间和跳过教程语义照旧；献祭条件、胜负、时间、墙/经济/地图/输入/存档不变。

## 明示前置与原生输入

隔离骑士新局，真实点选/开始/跳过剧情，未跳教程。第三夜末time283.85/cycle31.85/nightLen32、nights3、完成第4/4波/空敌；三面80HP墙/东缺口(23,21)，木4、心1，骑士原存量栅栏2。玩家x392,y344，在原生成土路；不改其余地形或土路。此为固定前置，不是完整自然三夜通关。

准备后引擎正常跨黎明；等原toast自然结束，真实打开/关闭教程，按住方向控件向北走超过200世界像素，距祭坛<22后真实交互一次，心1→0到原胜利。途中墙/缺口和全部库存不变。没有为截图主动暂停；胜利按原规则paused=true。

320/390/844 Chromium原生CDP touchStart/end与tap；1280原生键鼠。完整WebKit按住使用键盘回退、手机交互仍tap，明确不冒称WebKit原生持续触摸。strokeRect测试包装仅记录实际黄框调用再原样绘制，未用布尔代理代替画布证据。折叠教程时核核心控制44px；展开教程仅按原面板布局检查完整正文，不声称所有控制同屏。

## 拍摄版本

- before：SHA b3cf5f382fec556f8db6e0ce1f01cc449d28984c；产品dirty=false；三文件SHA256 a4775efa622d878381ee315afc83bdaef588d85dff3e60b73e083f05af443eb9。
- after：SHA b3cf5f382fec556f8db6e0ce1f01cc449d28984c；产品dirty=true；三文件SHA256 28bc745e21115d9685dc55833f0cc45a0b5cf505a751650e136174c13ad24e86。

全部Web/Chromium、中文、DPR1/UI100%，原PNG不缩放，真实CSS画布矩形逐图记录；不倒填将来提交号。修前20张的采图运行完成全部主路径，随后额外建造断言错误地假定扣2木而失败；图未受影响，全部复用，另一次正确11例回放不重拍，验证输入与拍图输入各自记录、不混称同一运行。

初次只拍到320前4状态，执行器错误断言胜利不暂停；之后还纠正骑士优先现成栅栏/耗木1，以及胜利暂停后不再更新底层教程的原行为。原错误日志/4图保留；只修测试期望，不改任何产品规则。

## 当前逐图

| 阶段 | 状态 | 视口 | 原图 |
|---|---|---|---|
| before | third-dawn | 320×568 | [原图](images/third-dawn--320x568--before--a4775efa--18491efe.png) |
| before | ready-at-camp | 320×568 | [原图](images/ready-at-camp--320x568--before--a4775efa--18491efe.png) |
| before | guide-expanded | 320×568 | [原图](images/guide-expanded--320x568--before--a4775efa--18491efe.png) |
| before | altar-arrived | 320×568 | [原图](images/altar-arrived--320x568--before--a4775efa--18491efe.png) |
| before | victory | 320×568 | [原图](images/victory--320x568--before--a4775efa--18491efe.png) |
| before | third-dawn | 390×844 | [原图](images/third-dawn--390x844--before--a4775efa--18491efe.png) |
| before | ready-at-camp | 390×844 | [原图](images/ready-at-camp--390x844--before--a4775efa--18491efe.png) |
| before | guide-expanded | 390×844 | [原图](images/guide-expanded--390x844--before--a4775efa--18491efe.png) |
| before | altar-arrived | 390×844 | [原图](images/altar-arrived--390x844--before--a4775efa--18491efe.png) |
| before | victory | 390×844 | [原图](images/victory--390x844--before--a4775efa--18491efe.png) |
| before | third-dawn | 844×390 | [原图](images/third-dawn--844x390--before--a4775efa--18491efe.png) |
| before | ready-at-camp | 844×390 | [原图](images/ready-at-camp--844x390--before--a4775efa--18491efe.png) |
| before | guide-expanded | 844×390 | [原图](images/guide-expanded--844x390--before--a4775efa--18491efe.png) |
| before | altar-arrived | 844×390 | [原图](images/altar-arrived--844x390--before--a4775efa--18491efe.png) |
| before | victory | 844×390 | [原图](images/victory--844x390--before--a4775efa--18491efe.png) |
| before | third-dawn | 1280×800 | [原图](images/third-dawn--1280x800--before--a4775efa--18491efe.png) |
| before | ready-at-camp | 1280×800 | [原图](images/ready-at-camp--1280x800--before--a4775efa--18491efe.png) |
| before | guide-expanded | 1280×800 | [原图](images/guide-expanded--1280x800--before--a4775efa--18491efe.png) |
| before | altar-arrived | 1280×800 | [原图](images/altar-arrived--1280x800--before--a4775efa--18491efe.png) |
| before | victory | 1280×800 | [原图](images/victory--1280x800--before--a4775efa--18491efe.png) |
| after | third-dawn | 320×568 | [原图](images/third-dawn--320x568--after--28bc745e--81347f55.png) |
| after | ready-at-camp | 320×568 | [原图](images/ready-at-camp--320x568--after--28bc745e--81347f55.png) |
| after | guide-expanded | 320×568 | [原图](images/guide-expanded--320x568--after--28bc745e--81347f55.png) |
| after | altar-arrived | 320×568 | [原图](images/altar-arrived--320x568--after--28bc745e--81347f55.png) |
| after | victory | 320×568 | [原图](images/victory--320x568--after--28bc745e--81347f55.png) |
| after | third-dawn | 390×844 | [原图](images/third-dawn--390x844--after--28bc745e--81347f55.png) |
| after | ready-at-camp | 390×844 | [原图](images/ready-at-camp--390x844--after--28bc745e--81347f55.png) |
| after | guide-expanded | 390×844 | [原图](images/guide-expanded--390x844--after--28bc745e--81347f55.png) |
| after | altar-arrived | 390×844 | [原图](images/altar-arrived--390x844--after--28bc745e--81347f55.png) |
| after | victory | 390×844 | [原图](images/victory--390x844--after--28bc745e--81347f55.png) |
| after | third-dawn | 844×390 | [原图](images/third-dawn--844x390--after--28bc745e--81347f55.png) |
| after | ready-at-camp | 844×390 | [原图](images/ready-at-camp--844x390--after--28bc745e--81347f55.png) |
| after | guide-expanded | 844×390 | [原图](images/guide-expanded--844x390--after--28bc745e--81347f55.png) |
| after | altar-arrived | 844×390 | [原图](images/altar-arrived--844x390--after--28bc745e--81347f55.png) |
| after | victory | 844×390 | [原图](images/victory--844x390--after--28bc745e--81347f55.png) |
| after | third-dawn | 1280×800 | [原图](images/third-dawn--1280x800--after--28bc745e--81347f55.png) |
| after | ready-at-camp | 1280×800 | [原图](images/ready-at-camp--1280x800--after--28bc745e--81347f55.png) |
| after | guide-expanded | 1280×800 | [原图](images/guide-expanded--1280x800--after--28bc745e--81347f55.png) |
| after | altar-arrived | 1280×800 | [原图](images/altar-arrived--1280x800--after--28bc745e--81347f55.png) |
| after | victory | 1280×800 | [原图](images/victory--1280x800--after--28bc745e--81347f55.png) |

## 初次部分取证（历史，不是当前矩阵）

- third-dawn： [原图](images/third-dawn--320x568--before--a4775efa--c94a66a0.png)
- ready-at-camp： [原图](images/ready-at-camp--320x568--before--a4775efa--c94a66a0.png)
- guide-expanded： [原图](images/guide-expanded--320x568--before--a4775efa--c94a66a0.png)
- altar-arrived： [原图](images/altar-arrived--320x568--before--a4775efa--c94a66a0.png)

## 限制

不是完整自然三夜跑；未实体iOS/Android/系统手势测试。仅补受影响状态；未变界面复用原记录。保留PR25–29与旧natural诊断；不合并、不发Pages/腾讯云。
