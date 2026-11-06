# 核心触控首屏与统一提示排版

80张真实首屏图：10状态×4视口×前后版本；另4张明确标注的全页补图。PNG原图100%缩放、DPR1、中文 Web/WebKit；首屏尺寸严格等于viewport。
前图9c06379，后图源码SHA/dirty/hash逐项记录。正常首局/法师/展开详情与注入夜战/清晨/缺材料分开标注；不动用户存档。
修复：白天/夜间/桌面统一波次+限高可滚动反馈区；画布无提示浮层。手机核心触控和画布同屏；教程/背包在可展开面板，选建造后自动收起。所有核心按钮≥44px。
旧基线与night-followup图片保持不动。当前批次待协调人逐图审查，不冒称视觉通过。

| 状态 | 视口 | 修复前首屏 | 修复后首屏 |
|---|---|---|---|
| first-day | 1280×800 | [原图](images/first-day--1280x800--before--viewport--14896db0.png) | [原图](images/first-day--1280x800--after--viewport--839cd5f4.png) |
| first-day | 390×844 | [原图](images/first-day--390x844--before--viewport--14896db0.png) | [原图](images/first-day--390x844--after--viewport--839cd5f4.png) |
| first-day | 320×568 | [原图](images/first-day--320x568--before--viewport--14896db0.png) | [原图](images/first-day--320x568--after--viewport--839cd5f4.png) |
| first-day | 844×390 | [原图](images/first-day--844x390--before--viewport--14896db0.png) | [原图](images/first-day--844x390--after--viewport--839cd5f4.png) |
| mage-first-day | 1280×800 | [原图](images/mage-first-day--1280x800--before--viewport--14896db0.png) | [原图](images/mage-first-day--1280x800--after--viewport--839cd5f4.png) |
| mage-first-day | 390×844 | [原图](images/mage-first-day--390x844--before--viewport--14896db0.png) | [原图](images/mage-first-day--390x844--after--viewport--839cd5f4.png) |
| mage-first-day | 320×568 | [原图](images/mage-first-day--320x568--before--viewport--14896db0.png) | [原图](images/mage-first-day--320x568--after--viewport--839cd5f4.png) |
| mage-first-day | 844×390 | [原图](images/mage-first-day--844x390--before--viewport--14896db0.png) | [原图](images/mage-first-day--844x390--after--viewport--839cd5f4.png) |
| third-night | 1280×800 | [原图](images/third-night--1280x800--before--viewport--14896db0.png) | [原图](images/third-night--1280x800--after--viewport--839cd5f4.png) |
| third-night | 390×844 | [原图](images/third-night--390x844--before--viewport--14896db0.png) | [原图](images/third-night--390x844--after--viewport--839cd5f4.png) |
| third-night | 320×568 | [原图](images/third-night--320x568--before--viewport--14896db0.png) | [原图](images/third-night--320x568--after--viewport--839cd5f4.png) |
| third-night | 844×390 | [原图](images/third-night--844x390--before--viewport--14896db0.png) | [原图](images/third-night--844x390--after--viewport--839cd5f4.png) |
| third-dawn | 1280×800 | [原图](images/third-dawn--1280x800--before--viewport--14896db0.png) | [原图](images/third-dawn--1280x800--after--viewport--839cd5f4.png) |
| third-dawn | 390×844 | [原图](images/third-dawn--390x844--before--viewport--14896db0.png) | [原图](images/third-dawn--390x844--after--viewport--839cd5f4.png) |
| third-dawn | 320×568 | [原图](images/third-dawn--320x568--before--viewport--14896db0.png) | [原图](images/third-dawn--320x568--after--viewport--839cd5f4.png) |
| third-dawn | 844×390 | [原图](images/third-dawn--844x390--before--viewport--14896db0.png) | [原图](images/third-dawn--844x390--after--viewport--839cd5f4.png) |
| no-materials | 1280×800 | [原图](images/no-materials--1280x800--before--viewport--14896db0.png) | [原图](images/no-materials--1280x800--after--viewport--839cd5f4.png) |
| no-materials | 390×844 | [原图](images/no-materials--390x844--before--viewport--14896db0.png) | [原图](images/no-materials--390x844--after--viewport--839cd5f4.png) |
| no-materials | 320×568 | [原图](images/no-materials--320x568--before--viewport--14896db0.png) | [原图](images/no-materials--320x568--after--viewport--839cd5f4.png) |
| no-materials | 844×390 | [原图](images/no-materials--844x390--before--viewport--14896db0.png) | [原图](images/no-materials--844x390--after--viewport--839cd5f4.png) |
| details-open | 1280×800 | [原图](images/details-open--1280x800--before--viewport--14896db0.png) | [原图](images/details-open--1280x800--after--viewport--839cd5f4.png) |
| details-open | 390×844 | [原图](images/details-open--390x844--before--viewport--14896db0.png) | [原图](images/details-open--390x844--after--viewport--839cd5f4.png) |
| details-open | 320×568 | [原图](images/details-open--320x568--before--viewport--14896db0.png) | [原图](images/details-open--320x568--after--viewport--839cd5f4.png) |
| details-open | 844×390 | [原图](images/details-open--844x390--before--viewport--14896db0.png) | [原图](images/details-open--844x390--after--viewport--839cd5f4.png) |
| briefing | 1280×800 | [原图](images/briefing--1280x800--before--viewport--14896db0.png) | [原图](images/briefing--1280x800--after--viewport--839cd5f4.png) |
| briefing | 390×844 | [原图](images/briefing--390x844--before--viewport--14896db0.png) | [原图](images/briefing--390x844--after--viewport--839cd5f4.png) |
| briefing | 320×568 | [原图](images/briefing--320x568--before--viewport--14896db0.png) | [原图](images/briefing--320x568--after--viewport--839cd5f4.png) |
| briefing | 844×390 | [原图](images/briefing--844x390--before--viewport--14896db0.png) | [原图](images/briefing--844x390--after--viewport--839cd5f4.png) |
| pause | 1280×800 | [原图](images/pause--1280x800--before--viewport--14896db0.png) | [原图](images/pause--1280x800--after--viewport--839cd5f4.png) |
| pause | 390×844 | [原图](images/pause--390x844--before--viewport--14896db0.png) | [原图](images/pause--390x844--after--viewport--839cd5f4.png) |
| pause | 320×568 | [原图](images/pause--320x568--before--viewport--14896db0.png) | [原图](images/pause--320x568--after--viewport--839cd5f4.png) |
| pause | 844×390 | [原图](images/pause--844x390--before--viewport--14896db0.png) | [原图](images/pause--844x390--after--viewport--839cd5f4.png) |
| victory | 1280×800 | [原图](images/victory--1280x800--before--viewport--14896db0.png) | [原图](images/victory--1280x800--after--viewport--839cd5f4.png) |
| victory | 390×844 | [原图](images/victory--390x844--before--viewport--14896db0.png) | [原图](images/victory--390x844--after--viewport--839cd5f4.png) |
| victory | 320×568 | [原图](images/victory--320x568--before--viewport--14896db0.png) | [原图](images/victory--320x568--after--viewport--839cd5f4.png) |
| victory | 844×390 | [原图](images/victory--844x390--before--viewport--14896db0.png) | [原图](images/victory--844x390--after--viewport--839cd5f4.png) |
| failure | 1280×800 | [原图](images/failure--1280x800--before--viewport--14896db0.png) | [原图](images/failure--1280x800--after--viewport--839cd5f4.png) |
| failure | 390×844 | [原图](images/failure--390x844--before--viewport--14896db0.png) | [原图](images/failure--390x844--after--viewport--839cd5f4.png) |
| failure | 320×568 | [原图](images/failure--320x568--before--viewport--14896db0.png) | [原图](images/failure--320x568--after--viewport--839cd5f4.png) |
| failure | 844×390 | [原图](images/failure--844x390--before--viewport--14896db0.png) | [原图](images/failure--844x390--after--viewport--839cd5f4.png) |

## 全页补图（不能当首屏）

- third-dawn / before 390×844: [全页原图](images/third-dawn--390x844--before--full--14896db0.png)
- third-night / before 320×568: [全页原图](images/third-night--320x568--before--full--14896db0.png)
- third-dawn / after 390×844: [全页原图](images/third-dawn--390x844--after--full--839cd5f4.png)
- third-night / after 320×568: [全页原图](images/third-night--320x568--after--full--839cd5f4.png)

## 验证与限制

- [验证记录与独立审查](validation.json)、[旧记录只读覆盖检查](baseline-coverage.log)、[源码及旧172/305未变证明](provenance.log)。
- [适用检查日志](checks.log)、[触控手势日志](touch-gestures.log)。
- 受控夜战/清晨不代表自然三夜通关；WebKit/Chromium触控模拟不替代iOS/Android真机、浏览器工具栏和安全区检查。
- 详情面板主动展开时会覆盖部分主画面/控件，关闭或选择建造即可返回核心同屏区域；完整长提示需在反馈区上下滚动，波次独立固定可见。
- 未合并或发布，无腾讯云/Pages/服务器变更。
