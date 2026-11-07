# UI-024 · 走近祭坛后隐藏过期的专用拒绝

协调指出UI-023的横屏走近图同时显示“这次没献出：再靠近祭坛”与可献祭prompt。原aab67fe/UI-023候选、照片和记录完整保留，不回改旧图或其审查状态。

复用现有边界夹具并实际输入复现：24px真实点交互被拒，立即触屏向上按住/释放进入原22px以内，旧拒绝仍可见。只在当前活跃toast确实是这条专用拒绝，且原canOffer与距离 `<22` 均成立时隐藏它并结束该条剩余计时；不改通用toast函数/默认2.2秒时长，不清文字或后来替换它的通知。不改边界、按键、播种优先、时间、库存、胜负或存档结构。

## 来源与实际行为

6张受影响原图，320×568、390×844、844×390同“拒绝后立刻走近、尚未献出”状态前后。全部Web/Chromium、中文、100%、DPR1、首屏真实尺寸；[screenshots.json](screenshots.json)逐图注明源码、dirty、实际画布/按钮与状态。全部明示隔离边界夹具，不是新的自然三夜或真机验收；不重拍未变原图集。

- before：内存响应aab67feb0d08a999cfe6e849aa4bc4aad7eab31e原Git产品，served SHA256 `a3dd727ddba2b6bebd28642f7c9b19663b83d9e9382780e03134f82dc6b37b1a`，产品clean；LF字节与旧Windows f45b0d0c不同，不冒称同served-byte或覆盖工作区。
- after：拍摄HEAD仍aab67fe加本片game.js产品dirty=true，Windows served SHA256 `bf61952196c25865a9f6ab5477772f9ff398485ea18e5c611789d1b12fb2793d`。拍摄来源不倒填未来提交号；全工作区另有旧受保护诊断dirty。
- 夹具沿用UI-023：骑士初始库存外心1、四面80血墙、夜数3、夜长32/末0.1秒、完成波次/空敌、时间284、祭坛南24px。引擎真实跨黎明后等待原天亮toast结束，再原生交互/移动；不是自然取得心/守完三夜。只有拍图临时冻结，不接触用户存档。
- 320/390/844 after从拒绝到走近分别0.1500/0.1166/0.1000游戏秒，旧拒绝立即隐藏，未等待默认2.2秒自然过期；22px处仍保留拒绝。库存直到真正交互都不变，最终真实交互仅扣心1并原胜利。
- 40项/版本：四视口主路径及原距离/夜数/昼夜/无心/田和缺种边界。追加“拒绝→真实选栏替换通知→走近”及“真实播种或缺种拒绝→走近”，新通知均保持可见和原文字，不被清掉。原生移动后释放、精确库存及逐项时间戳输入日志在 [validation.json](validation.json)各项`input_log`。
- Chromium手机用原生touchStart/end和UI taps；WebKit移动布局回归用原生鼠标按住/释放与移动UI taps，非WebKit触屏长按；桌面1280真实ArrowUp按下/释放及E键，不重拍未变桌面。

| 同态原图 | before | after | 状态 |
|---|---|---|---|
| 320×568 走近后待献 | [原图](images/arrived-ready--320x568--before--a3dd727d.png) | [原图](images/arrived-ready--320x568--after--bf619521.png) | 已截，待审 |
| 390×844 走近后待献 | [原图](images/arrived-ready--390x844--before--a3dd727d.png) | [原图](images/arrived-ready--390x844--after--bf619521.png) | 已截，待审 |
| 844×390 走近后待献 | [原图](images/arrived-ready--844x390--before--a3dd727d.png) | [原图](images/arrived-ready--844x390--after--bf619521.png) | 已截，待审 |

`node tests\altar-arrival.mjs --refusal-refresh --before --capture` / `--refusal-refresh --capture`只写本批，不覆盖UI-023。默认CI复用同函数加强40项，不新增测试工作区或机械重复自然三夜。检查见 [checks.log](checks.log)，只读覆盖不是当前源码全界面重拍。

视觉待协调逐图复核，不以自动检查或本机自看标通过。只叠加开放PR，不合并、不发布Pages/腾讯云、不改服务器；旧自然诊断不混入。
