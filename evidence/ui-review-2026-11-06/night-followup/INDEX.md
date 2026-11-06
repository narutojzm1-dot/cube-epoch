# 夜战引导与提示整改：UI-006 / UI-007

32张原图：4状态 × 4视口 × 前后两版本。中文 Web / WebKit，100%缩放，DPR=1；全页PNG未缩放，真实游戏画布尺寸在 screenshots.json。
所有截图均为隔离的临时 fixture，非用户存档，非自然通关。前图6342093，后图的SHA/dirty和产品源码hash逐图记录。视觉状态：待协调人复看。
修复：夜间优先守火、天亮后才完成第三夜引导；仅在夜间手机提示退出画布，按文档流逐条排列，不遮波次/角色/篝火。白天与桌面提示布局保持原样。
旧172张基线/305原图及其索引保留不动。本轮受影响状态在此追加，未变化页面复用原基线；不声称旧图是新版本重拍。

| 状态 | 视口 | 前图 | 后图 |
|---|---|---|---|
| third-night | 1280×800 | [原图](images/third-night--1280x800--before.png) | [原图](images/third-night--1280x800--after--784f5365.png) |
| third-night | 390×844 | [原图](images/third-night--390x844--before.png) | [原图](images/third-night--390x844--after--784f5365.png) |
| third-night | 320×568 | [原图](images/third-night--320x568--before.png) | [原图](images/third-night--320x568--after--784f5365.png) |
| third-night | 844×390 | [原图](images/third-night--844x390--before.png) | [原图](images/third-night--844x390--after--784f5365.png) |
| third-night-broken-wall | 1280×800 | [原图](images/third-night-broken-wall--1280x800--before.png) | [原图](images/third-night-broken-wall--1280x800--after--784f5365.png) |
| third-night-broken-wall | 390×844 | [原图](images/third-night-broken-wall--390x844--before.png) | [原图](images/third-night-broken-wall--390x844--after--784f5365.png) |
| third-night-broken-wall | 320×568 | [原图](images/third-night-broken-wall--320x568--before.png) | [原图](images/third-night-broken-wall--320x568--after--784f5365.png) |
| third-night-broken-wall | 844×390 | [原图](images/third-night-broken-wall--844x390--before.png) | [原图](images/third-night-broken-wall--844x390--after--784f5365.png) |
| third-dawn | 1280×800 | [原图](images/third-dawn--1280x800--before.png) | [原图](images/third-dawn--1280x800--after--784f5365.png) |
| third-dawn | 390×844 | [原图](images/third-dawn--390x844--before.png) | [原图](images/third-dawn--390x844--after--784f5365.png) |
| third-dawn | 320×568 | [原图](images/third-dawn--320x568--before.png) | [原图](images/third-dawn--320x568--after--784f5365.png) |
| third-dawn | 844×390 | [原图](images/third-dawn--844x390--before.png) | [原图](images/third-dawn--844x390--after--784f5365.png) |
| fourth-night | 1280×800 | [原图](images/fourth-night--1280x800--before.png) | [原图](images/fourth-night--1280x800--after--784f5365.png) |
| fourth-night | 390×844 | [原图](images/fourth-night--390x844--before.png) | [原图](images/fourth-night--390x844--after--784f5365.png) |
| fourth-night | 320×568 | [原图](images/fourth-night--320x568--before.png) | [原图](images/fourth-night--320x568--after--784f5365.png) |
| fourth-night | 844×390 | [原图](images/fourth-night--844x390--before.png) | [原图](images/fourth-night--844x390--after--784f5365.png) |

限制：小屏页面仍需滚动（UI-005）；桌面原有浮层布局本轮未重排；真机系统手势/安全区、自然全程通关未覆盖。无发布或服务器变更。
