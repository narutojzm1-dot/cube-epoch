# UI-017 夜战次级指引完整收起

## PR14 CI 滚动回归修复（不改产品）

原 run `42345136221` / job `128321128991` 的Linux WebKit在 `tests/night-notice-fold.mjs:204` 等待Home后scrollTop=0超时30秒；此前End正偏移断言已通过。安装步骤06:01:24–06:01:54成功，游戏测试06:01:54–06:07:11执行后失败；static成功，不能记为安装失败或CI通过。原日志未记录焦点、偏移或具体视口，不能唯一还原原现场。

旧测试只等End首次正偏移便立刻反向；[WebKit上游实现](https://github.com/WebKit/WebKit/blob/ce4df78bd3b06d1cd763458253db65655617731f/Source/WebCore/platform/KeyboardScrollingAnimator.cpp#L210-L233)会消费反向键以取消尚在进行的滚动，而不启动反向。上游[Home/End默认处理](https://github.com/WebKit/WebKit/blob/ce4df78bd3b06d1cd763458253db65655617731f/Source/WebCore/page/EventHandler.cpp#L5211-L5225)对GTK/WPE/Windows均使用无修饰键，故未改为Ctrl组合键。本机WebKit26.5瞬时滚动，Chromium151可测到多帧动画及之后的原生scrollend；没有可用本机Linux运行时，原Linux现场的完整因果仍以新SHA CI验证。

最小修改仅在测试：确认焦点、原生scrollend支持和触屏夹具实际溢出；真实End到达实际底部且完成原生scrollend后再真实Home，Home也须产生新的完成事件并归零。记录键值、未拦截状态、边界和失败现场；不加超时、不直接赋scrollTop、不跳过正反覆盖，原生触控pan断言保留。

[修后Chromium八会话/六次真实触控pan](ci-scroll-fix-native.log)：320/390正向36→反向0，844正向18→反向0；桌面本来不溢出，保持0并验证原键确实收到。[新测试的完整本机WebKit集成](ci-scroll-fix-integration.log)。独立只读审查未发现显著问题；新SHA GitHub CI结论在终端交付记录核对，不把旧失败或本机成功冒称Linux已通过。

产品三个文件字节哈希仍为下文73fa0632，32张旧原图/元数据全部复用，未补拍未变UI。用户报告320所看状态局部通过，不外推32图全量批准。当前修复没有产品界面或交互语义改动，natural诊断/旧候选/腾讯云5f451b6均保留，不合并、不发布。

5f451b6 下真实 Chromium 320 触屏长按攻击、松开后复现：波次占22px，反馈区剩38px；缺法力反馈26px，操作指引44px却只露12px。优先级为**波次与当前反馈优先，次级操作/建造说明按需查看**。本批另外以明确的低法力/部分材料夹具复现同状态，未重打自然三夜。

仅在既有 touchLayout（粗指针 OR 宽度≤760）且波次栏显示时，CSS完整隐藏原操作指引和建造说明，不留下半行。当前反馈及原滚动区域不变；反馈自然过期后显示“操作指引见「怎么玩」”。现有44px「怎么玩」仍主动打开原暂停帮助，新增的是把当时有效的反馈、指引、建造/取消说明全文放在帮助顶部。**没有新增自动暂停、输入规则或按钮，也未修改消耗、法力恢复、战斗、昼夜、胜负、存档。** 白天和桌面细指针原展示方式保留。

## 同视口前后原图

32张Web/Chromium真实首屏原图，zh-CN、DPR1、100%、full_page=false；不是全页图缩成手机。完整逐项来源、实际画布CSS/backing、输入、矩形和复现路径见 [screenshots.json](screenshots.json)。

| 视口 / 输入 | 状态 | 前 | 后 |
|---|---|---|---|
| 320×568触屏 | 缺法力+波次+指引 | [前](images/mana-shortage--320x568--before--c62f6ed8.png) | [后](images/mana-shortage--320x568--after--73fa0632.png) |
| 390×844触屏 | 缺法力+波次+指引 | [前](images/mana-shortage--390x844--before--c62f6ed8.png) | [后](images/mana-shortage--390x844--after--73fa0632.png) |
| 844×390触屏 | 缺法力+波次+指引 | [前](images/mana-shortage--844x390--before--c62f6ed8.png) | [后](images/mana-shortage--844x390--after--73fa0632.png) |
| 1280×800键鼠 | 缺法力+波次+指引 | [前](images/mana-shortage--1280x800--before--c62f6ed8.png) | [后](images/mana-shortage--1280x800--after--73fa0632.png) |
| 320×568触屏 | 缺木+选栏 | [前](images/build-shortage--320x568--before--c62f6ed8.png) | [后](images/build-shortage--320x568--after--73fa0632.png) |
| 390×844触屏 | 缺木+选栏 | [前](images/build-shortage--390x844--before--c62f6ed8.png) | [后](images/build-shortage--390x844--after--73fa0632.png) |
| 844×390触屏 | 缺木+选栏 | [前](images/build-shortage--844x390--before--c62f6ed8.png) | [后](images/build-shortage--844x390--after--73fa0632.png) |
| 1280×800键鼠 | 缺木+选栏 | [前](images/build-shortage--1280x800--before--c62f6ed8.png) | [后](images/build-shortage--1280x800--after--73fa0632.png) |
| 320×568触屏 | 现有怎么玩入口 | [前](images/night-help--320x568--before--c62f6ed8.png) | [后](images/night-help--320x568--after--73fa0632.png) |
| 390×844触屏 | 现有怎么玩入口 | [前](images/night-help--390x844--before--c62f6ed8.png) | [后](images/night-help--390x844--after--73fa0632.png) |
| 844×390触屏 | 现有怎么玩入口 | [前](images/night-help--844x390--before--c62f6ed8.png) | [后](images/night-help--844x390--after--73fa0632.png) |
| 1280×800键鼠 | 现有怎么玩入口 | [前](images/night-help--1280x800--before--c62f6ed8.png) | [后](images/night-help--1280x800--after--73fa0632.png) |
| 320×568触屏 | 反馈自然过期 | [前](images/night-no-toast--320x568--before--c62f6ed8.png) | [后](images/night-no-toast--320x568--after--73fa0632.png) |
| 390×844触屏 | 反馈自然过期 | [前](images/night-no-toast--390x844--before--c62f6ed8.png) | [后](images/night-no-toast--390x844--after--73fa0632.png) |
| 844×390触屏 | 反馈自然过期 | [前](images/night-no-toast--844x390--before--c62f6ed8.png) | [后](images/night-no-toast--844x390--after--73fa0632.png) |
| 1280×800键鼠 | 反馈自然过期 | [前](images/night-no-toast--1280x800--before--c62f6ed8.png) | [后](images/night-no-toast--1280x800--after--73fa0632.png) |

前图5f451b62d87f37e29bfe4f727057a6066808b00f产品源码未改，served-byte SHA256 `c62f6ed82c2074b66af75e94a22030c1d5962bdcf668b3886136e0d7287deed6`。后图同HEAD加本片产品dirty，hash `73fa0632bd1c368e6eb0811360109e9f7f76f3b4501c3f2f7ca61386bb49ab9c`。拍摄时版本原样保留，不改写成后来的提交号。

## 输入与检查

[前后各8会话](validation.json)：缺法力真实攻击长按/释放；部分库存真实打开背包选栏、点空地拒绝；短反馈完整可见、次级行完全隐藏；真实点击帮助读取有效全文、点继续恢复；移动长按后停止无漂移、技能实际触发；白天原指引/选栏说明恢复、区域滚动及取消保留。手机核心触点≥44px，画布与移动/攻击/交互/技能在首屏，可命中且scroll=(0,0)。Chromium手机长按为CDP原生touchStart/end，区域滚动有原生pan记录；桌面为键鼠。WebKit集成长按使用键盘，触屏布局按钮是真tap，不冒称其长按是真实触屏。

[两项媒体边界及长反馈行为](media-boundaries.json)：320细指针仍因窄屏进入触控布局；1280粗指针仍因粗指针进入触控布局。确认指导入口、继续恢复、核心首屏及原长反馈滚动/帮助全文。两项仅行为探查，没有额外前后图，不外推真机。

[必要检查与只读审查](checks.log) · [一次既有WebKit集成日志](integration.log)。旧5f451b6及之前已绿CI结果复用，不重跑旧分支CI；新代码按仓库闸门检查。不合并、不发布Pages/腾讯云、不修改工作流/服务器。旧候选a342ef0及所有旧原图保留；natural-loop本地诊断hash保持且严格排除提交。

**限制 / 待审：** 截图和状态均为隔离浏览器夹具：第二夜26秒波1/3、玩家(30,25)附近草地、静止零伤害高血量靶，分别注法力0.2或木1/成栏0；不是自然耗尽法力、采集材料、守夜或平衡验证。只拍图时冻结模拟，过期等待使用正常时间。帮助长文仍按既有面板内滚动至“继续”；长反馈仍可区域内滚动，也能在触屏夜战帮助查看全文，不宣称所有长文无滚动。详情展开遮核心控件是既有限制，本片不重构。32图待协调人逐图审查，不代表真机、屏幕阅读器、全部旧图或视觉通过。
