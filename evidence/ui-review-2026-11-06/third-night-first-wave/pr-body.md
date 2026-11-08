## 改动
仅将「面朝怪打；朝墙会拆墙」放进第三夜及以后首波的既有触屏通知，保留夜数、波次和原2.4秒参数。桌面、前两夜、后续波、生成节奏和所有玩法规则不变。

## 无暂停验证
320/390/844真实模拟触控，1280键鼠，修前/后各8例。明确已完成两夜的入夜前固定前置，之后正常运行、不写游戏状态或暂停，不称自然三夜通关。320/390警告实际2.3852/2.3848秒，至少1.65秒及真实下移/施放后仍完整；墙和库存不变。

32张同态原图及逐图源码/画布/输入：[INDEX](evidence/ui-review-2026-11-06/third-night-first-wave/INDEX.md)、[screenshots](evidence/ui-review-2026-11-06/third-night-first-wave/screenshots.json)、[timing](evidence/ui-review-2026-11-06/third-night-first-wave/timing.json)。

## 检查与限制
语法、static、完整Windows WebKit及独立代码审查通过。完整套件首次在旧首夜390拆墙超时；原日志保留，只读输入跟踪复跑同断言全过，未确证或宣称修复该偶发根因，未延超时/跳检查。CI须核本PR同SHA。原图待用户/协调逐图审查；未实体机测试。

叠加base为fix/third-night-touch-toast，保留#25–28及旧诊断/待验收版本。**PR保持开放，不合并、不发布Pages或腾讯云。**临时资源为D盘专用根，浏览器退出后精确清理。
