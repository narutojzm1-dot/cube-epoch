# UI-032 第三夜首波的真实可读窗口

只把既有「面朝怪打；朝墙会拆墙」纳入第三夜及以后首波触屏beginWave通知，保留第几夜/第几波/总波数与原2.4秒参数。桌面、第一二夜、后续波文案原样；入夜下一帧首波、出生节奏0.42、昼夜长度、墙/攻击/资源/地图/存档均不改。不加新教程或阻塞游戏。

[逐图版本/真实画布/输入](screenshots.json) · [时序、持续时间与触摸时间戳](timing.json) · [全部正反案例](validation.json) · [检查](checks.log) · [独立审查](review.log)

## 明确前置，准备后正常运行且从不暂停

隔离法师新局原生选角/开始，标注已完成两夜的固定前置：time250.8、dayLen62、cycle60.8（入夜前1.2秒）、nights2、木4/墙(22,22)80HP、玩家(378,358)左向，前方侧移格清空。游戏状态只在这一前置准备写一次，之后没有pause、钟/波计时写入、帧冻结或动作API调用；不是完整自然三夜跑。

从白天正常进入第三夜，DOM变更与独立RAF只读记录入夜文字、下一帧首波、自然隐藏，带performance.now/游戏秒/原帧预算；pausedFrames=0。首波toSpawn7、nightLen32、原生成节奏保留。首次消息、真实下移/按住攻击施放后、至少1.65秒后、自然隐藏四状态均直接截图，游戏持续运转。截图前后读到同一条可见文字才保留，未暂停假装可读。

320/390/844为原生Chromium CDP触屏按住/释放、tap；1280键鼠且原桌面整句不变。原墙和建造库存保持，触点≥44px，无残留held。桌面使用和WebKit回退共用键盘路径，原始inputs通用标签不改变platform字段所记录的实际Chromium引擎；WebKit闸门按住为键盘回退，明确不称原生持续触控。

## 实测窗口（秒）

| 阶段 | 视口 | 入夜→首波游戏秒 | 首波实际可见秒 | 首波含墙警告 |
|---|---|---|---|---|
| before | 320×568 | 0.0168 | 2.3854 | false |
| before | 390×844 | 0.0167 | 2.3849 | false |
| before | 844×390 | 0.0166 | 2.3846 | false |
| before | 1280×800 | 0.0167 | 2.3850 | false |
| after | 320×568 | 0.0167 | 2.3852 | true |
| after | 390×844 | 0.0166 | 2.3848 | true |
| after | 844×390 | 0.0166 | 2.3849 | true |
| after | 1280×800 | 0.0167 | 2.3850 | false |

原入夜短句只到下一帧首波；现在首波触屏消息保留警告，实际约2.385秒、原2.4秒截帧预算，至少1.65秒后及真实施放后仍完整可见。持续时间不靠截图暂停或加长timeout。第一夜5秒宽限、第二夜/第四夜首波、第三夜第二波负覆盖见validation；这些非主状态不新增图片。

本机完整WebKit首次在旧首夜390拆墙断言超时，原[e2e.log](e2e.log)保留；只读原生输入/焦点/toggle跟踪复跑全部原断言与新增8例成功，见[e2e-final.log](e2e-final.log)。该失败根因尚未确证，不宣称已修复面板切换竞态，也未改输入语义、加长超时或跳检查。

## 拍摄源码（不倒填未来提交号）
- SHA 5d9342c783bb5b3020b8f8d67726cb38ae8a447a；产品dirty=false；三文件SHA256 a99334b594d2e97bc8ec64e335a8bda103b087ed914b991e4706b9863630674d；baseline Git product files served in memory。
- SHA 5d9342c783bb5b3020b8f8d67726cb38ae8a447a；产品dirty=true；三文件SHA256 83c64262cdb601a3500b4a76edb7a451d048e6874ba08c056f85008df410aad3；current working-tree product bytes。

全部Web/Chromium、中文、DPR1、UI100%，原PNG不缩放，真实游戏CSS矩形逐图记录。修前Git5d三文件内存响应；修后当前工作树字节。旧PR28暂停入夜取证完全保留，不混入本片无暂停矩阵。

## 当前32张原图：四状态×四视口×前后

| 阶段 | 状态 | 视口 | 原图 |
|---|---|---|---|
| before | 正常跨夜后的首波消息 | 320×568 | [原图](images/first-wave--320x568--before--a99334b5--90abe806.png) |
| before | 真实下移/施放后首波消息仍在 | 320×568 | [原图](images/native-touch--320x568--before--a99334b5--90abe806.png) |
| before | 首波消息显示至少1.65秒后仍完整 | 320×568 | [原图](images/late-readable--320x568--before--a99334b5--90abe806.png) |
| before | 原2.4秒预算自然隐藏，不延长 | 320×568 | [原图](images/expired--320x568--before--a99334b5--90abe806.png) |
| before | 正常跨夜后的首波消息 | 390×844 | [原图](images/first-wave--390x844--before--a99334b5--90abe806.png) |
| before | 真实下移/施放后首波消息仍在 | 390×844 | [原图](images/native-touch--390x844--before--a99334b5--90abe806.png) |
| before | 首波消息显示至少1.65秒后仍完整 | 390×844 | [原图](images/late-readable--390x844--before--a99334b5--90abe806.png) |
| before | 原2.4秒预算自然隐藏，不延长 | 390×844 | [原图](images/expired--390x844--before--a99334b5--90abe806.png) |
| before | 正常跨夜后的首波消息 | 844×390 | [原图](images/first-wave--844x390--before--a99334b5--90abe806.png) |
| before | 真实下移/施放后首波消息仍在 | 844×390 | [原图](images/native-touch--844x390--before--a99334b5--90abe806.png) |
| before | 首波消息显示至少1.65秒后仍完整 | 844×390 | [原图](images/late-readable--844x390--before--a99334b5--90abe806.png) |
| before | 原2.4秒预算自然隐藏，不延长 | 844×390 | [原图](images/expired--844x390--before--a99334b5--90abe806.png) |
| before | 正常跨夜后的首波消息 | 1280×800 | [原图](images/first-wave--1280x800--before--a99334b5--90abe806.png) |
| before | 真实下移/施放后首波消息仍在 | 1280×800 | [原图](images/native-touch--1280x800--before--a99334b5--90abe806.png) |
| before | 首波消息显示至少1.65秒后仍完整 | 1280×800 | [原图](images/late-readable--1280x800--before--a99334b5--90abe806.png) |
| before | 原2.4秒预算自然隐藏，不延长 | 1280×800 | [原图](images/expired--1280x800--before--a99334b5--90abe806.png) |
| after | 正常跨夜后的首波消息 | 320×568 | [原图](images/first-wave--320x568--after--83c64262--a33e4452.png) |
| after | 真实下移/施放后首波消息仍在 | 320×568 | [原图](images/native-touch--320x568--after--83c64262--a33e4452.png) |
| after | 首波消息显示至少1.65秒后仍完整 | 320×568 | [原图](images/late-readable--320x568--after--83c64262--a33e4452.png) |
| after | 原2.4秒预算自然隐藏，不延长 | 320×568 | [原图](images/expired--320x568--after--83c64262--a33e4452.png) |
| after | 正常跨夜后的首波消息 | 390×844 | [原图](images/first-wave--390x844--after--83c64262--a33e4452.png) |
| after | 真实下移/施放后首波消息仍在 | 390×844 | [原图](images/native-touch--390x844--after--83c64262--a33e4452.png) |
| after | 首波消息显示至少1.65秒后仍完整 | 390×844 | [原图](images/late-readable--390x844--after--83c64262--a33e4452.png) |
| after | 原2.4秒预算自然隐藏，不延长 | 390×844 | [原图](images/expired--390x844--after--83c64262--a33e4452.png) |
| after | 正常跨夜后的首波消息 | 844×390 | [原图](images/first-wave--844x390--after--83c64262--a33e4452.png) |
| after | 真实下移/施放后首波消息仍在 | 844×390 | [原图](images/native-touch--844x390--after--83c64262--a33e4452.png) |
| after | 首波消息显示至少1.65秒后仍完整 | 844×390 | [原图](images/late-readable--844x390--after--83c64262--a33e4452.png) |
| after | 原2.4秒预算自然隐藏，不延长 | 844×390 | [原图](images/expired--844x390--after--83c64262--a33e4452.png) |
| after | 正常跨夜后的首波消息 | 1280×800 | [原图](images/first-wave--1280x800--after--83c64262--a33e4452.png) |
| after | 真实下移/施放后首波消息仍在 | 1280×800 | [原图](images/native-touch--1280x800--after--83c64262--a33e4452.png) |
| after | 首波消息显示至少1.65秒后仍完整 | 1280×800 | [原图](images/late-readable--1280x800--after--83c64262--a33e4452.png) |
| after | 原2.4秒预算自然隐藏，不延长 | 1280×800 | [原图](images/expired--1280x800--after--83c64262--a33e4452.png) |

## 检查与限制

初次新执行器错误地要求既有开场跳过按钮可见高度≥44，未进前置也未写图；before.log保留。只改执行器按实际按钮高度定位（核心控制仍≥44），不改变旧开场布局。before-final.log/after.log各8案例通过。不是无辅助玩家盲玩、真机或完整自然通关；视觉仍待用户/协调。

D:\.tmp\agents\cube-epoch\独占GUID环境/profile/cache，既有C浏览器安装只读；本次浏览器退出后精确清理，证据直接放D项目。PR25–28/诊断/旧证据不改，现有覆盖清单只读复用；不合并、不发Pages或腾讯云。
