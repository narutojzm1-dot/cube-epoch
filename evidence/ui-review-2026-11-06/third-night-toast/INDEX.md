# UI-031 第三夜及以后触屏入夜toast

只改第三夜及以后触屏toast：保留金色立方与波数，短句说明面朝怪打、朝墙会拆墙。第二夜原文仅蝙蝠飞墙，未改；第三夜桌面整句与3.2秒参数、波次/时序/规则/地图/存档均不改。现有守夜引导沿用PR27。

[逐图来源/实际画布/输入](screenshots.json) · [库存、墙、夜数与暂停边界](validation.json) · [检查](checks.log) · [独立审查](review.log)

## 明示夹具与真实输入

四视口320×568、390×844、844×390触控及1280×800桌面，法师隔离新局原生选角/开始。边界注入夜数2、木4、首墙(22,22)HP80、玩家(378,358)左向，cycle=dayLen−0.01，下一真实帧进入第3夜，原4波/32秒。该场景用新局边界准备，不是自然第三天或通关；具体参数见测试源码。

独立审查发现：startNightWaves把waveWait设2.2，后续updateEnemies在下一帧立即beginWave，替换入夜toast。初次数据读到入夜文字但24张原图已显示首波消息，不能当作目标toast取证。原图/原日志保留在历史。

仅测试夹具用MutationObserver在入夜文字变更后的微任务暂停该帧，原图明确data.paused=true；拍完立即恢复，原生朝墙按住/拆墙、点图补墙、侧移施放均paused=false。没有延后游戏首波、加长toast、自动滚图或伪装普通存档。恢复后仍按原next-frame规则发首波通知。

Chromium触屏为原生CDP按住/松手与tap；桌面真实键盘/鼠标。拆墙原退款1木，补墙扣2木，缺口3→4→3；侧移施放保墙且建造库存不变。WebKit闸门持续按压是键盘回退，触屏点击仍原生tap。全部中文、DPR1、UI100%，PNG原尺寸，真实canvas CSS矩形逐图记录；视觉审查仍待用户/协调。

## 实际拍摄源码（不倒填未来提交号）
- SHA a14c0809415d4309998d7146e17d804ec154d899；产品dirty=true；三文件SHA256 832b19f5eff3a46e8ec9300aa116a9083473d92346f315725e7a297bd5e1a6c2；current working-tree product bytes。
- SHA a14c0809415d4309998d7146e17d804ec154d899；产品dirty=false；三文件SHA256 7da4c5f204398246f60be50d87c967f9cd879ca65606232963e2bfc2be45295b；baseline Git product files served in memory, not current working tree。

## 当前24张同态前后原图

| 阶段 | 状态 | 视口 | 原图 |
|---|---|---|---|
| after / 明示第3夜夹具 | 第3夜入夜瞬间：金色立方、4波、当前操作提示 | 320×568 | [原图](images/night3-fixture-night-3-toast--320x568--after--832b19f5--b8d94b14.png) |
| after / 明示第3夜夹具 | 恢复真实帧后原生面对栅栏按住攻击：原规则拆墙 | 320×568 | [原图](images/night3-fixture-wall-facing-hold--320x568--after--832b19f5--b8d94b14.png) |
| after / 明示第3夜夹具 | 原生补墙、侧移施放：保墙、库存不变、无残留按压 | 320×568 | [原图](images/night3-fixture-wall-side-attack--320x568--after--832b19f5--b8d94b14.png) |
| after / 明示第3夜夹具 | 第3夜入夜瞬间：金色立方、4波、当前操作提示 | 390×844 | [原图](images/night3-fixture-night-3-toast--390x844--after--832b19f5--b8d94b14.png) |
| after / 明示第3夜夹具 | 恢复真实帧后原生面对栅栏按住攻击：原规则拆墙 | 390×844 | [原图](images/night3-fixture-wall-facing-hold--390x844--after--832b19f5--b8d94b14.png) |
| after / 明示第3夜夹具 | 原生补墙、侧移施放：保墙、库存不变、无残留按压 | 390×844 | [原图](images/night3-fixture-wall-side-attack--390x844--after--832b19f5--b8d94b14.png) |
| after / 明示第3夜夹具 | 第3夜入夜瞬间：金色立方、4波、当前操作提示 | 1280×800 | [原图](images/night3-fixture-night-3-toast--1280x800--after--832b19f5--b8d94b14.png) |
| after / 明示第3夜夹具 | 恢复真实帧后原生面对栅栏按住攻击：原规则拆墙 | 1280×800 | [原图](images/night3-fixture-wall-facing-hold--1280x800--after--832b19f5--b8d94b14.png) |
| after / 明示第3夜夹具 | 原生补墙、侧移施放：保墙、库存不变、无残留按压 | 1280×800 | [原图](images/night3-fixture-wall-side-attack--1280x800--after--832b19f5--b8d94b14.png) |
| after / 明示第3夜夹具 | 第3夜入夜瞬间：金色立方、4波、当前操作提示 | 844×390 | [原图](images/night3-fixture-night-3-toast--844x390--after--832b19f5--b8d94b14.png) |
| after / 明示第3夜夹具 | 恢复真实帧后原生面对栅栏按住攻击：原规则拆墙 | 844×390 | [原图](images/night3-fixture-wall-facing-hold--844x390--after--832b19f5--b8d94b14.png) |
| after / 明示第3夜夹具 | 原生补墙、侧移施放：保墙、库存不变、无残留按压 | 844×390 | [原图](images/night3-fixture-wall-side-attack--844x390--after--832b19f5--b8d94b14.png) |
| before / 明示第3夜夹具 | 第3夜入夜瞬间：金色立方、4波、当前操作提示 | 320×568 | [原图](images/night3-fixture-night-3-toast--320x568--before--7da4c5f2--3b4e3a4a.png) |
| before / 明示第3夜夹具 | 恢复真实帧后原生面对栅栏按住攻击：原规则拆墙 | 320×568 | [原图](images/night3-fixture-wall-facing-hold--320x568--before--7da4c5f2--3b4e3a4a.png) |
| before / 明示第3夜夹具 | 原生补墙、侧移施放：保墙、库存不变、无残留按压 | 320×568 | [原图](images/night3-fixture-wall-side-attack--320x568--before--7da4c5f2--3b4e3a4a.png) |
| before / 明示第3夜夹具 | 第3夜入夜瞬间：金色立方、4波、当前操作提示 | 390×844 | [原图](images/night3-fixture-night-3-toast--390x844--before--7da4c5f2--3b4e3a4a.png) |
| before / 明示第3夜夹具 | 恢复真实帧后原生面对栅栏按住攻击：原规则拆墙 | 390×844 | [原图](images/night3-fixture-wall-facing-hold--390x844--before--7da4c5f2--3b4e3a4a.png) |
| before / 明示第3夜夹具 | 原生补墙、侧移施放：保墙、库存不变、无残留按压 | 390×844 | [原图](images/night3-fixture-wall-side-attack--390x844--before--7da4c5f2--3b4e3a4a.png) |
| before / 明示第3夜夹具 | 第3夜入夜瞬间：金色立方、4波、当前操作提示 | 1280×800 | [原图](images/night3-fixture-night-3-toast--1280x800--before--7da4c5f2--3b4e3a4a.png) |
| before / 明示第3夜夹具 | 恢复真实帧后原生面对栅栏按住攻击：原规则拆墙 | 1280×800 | [原图](images/night3-fixture-wall-facing-hold--1280x800--before--7da4c5f2--3b4e3a4a.png) |
| before / 明示第3夜夹具 | 原生补墙、侧移施放：保墙、库存不变、无残留按压 | 1280×800 | [原图](images/night3-fixture-wall-side-attack--1280x800--before--7da4c5f2--3b4e3a4a.png) |
| before / 明示第3夜夹具 | 第3夜入夜瞬间：金色立方、4波、当前操作提示 | 844×390 | [原图](images/night3-fixture-night-3-toast--844x390--before--7da4c5f2--3b4e3a4a.png) |
| before / 明示第3夜夹具 | 恢复真实帧后原生面对栅栏按住攻击：原规则拆墙 | 844×390 | [原图](images/night3-fixture-wall-facing-hold--844x390--before--7da4c5f2--3b4e3a4a.png) |
| before / 明示第3夜夹具 | 原生补墙、侧移施放：保墙、库存不变、无残留按压 | 844×390 | [原图](images/night3-fixture-wall-side-attack--844x390--before--7da4c5f2--3b4e3a4a.png) |

## 历史24张：下一帧通知替换造成读取/截图错位

| 阶段 | 状态 | 视口 | 原图 |
|---|---|---|---|
| after / 明示第3夜夹具 | 第3夜入夜瞬间：金色立方、4波、当前操作提示 | 320×568 | [原图](images/night3-fixture-night-3-toast--320x568--after--832b19f5--84684d40.png) |
| after / 明示第3夜夹具 | 恢复真实帧后原生面对栅栏按住攻击：原规则拆墙 | 320×568 | [原图](images/night3-fixture-wall-facing-hold--320x568--after--832b19f5--84684d40.png) |
| after / 明示第3夜夹具 | 原生补墙、侧移施放：保墙、库存不变、无残留按压 | 320×568 | [原图](images/night3-fixture-wall-side-attack--320x568--after--832b19f5--84684d40.png) |
| after / 明示第3夜夹具 | 第3夜入夜瞬间：金色立方、4波、当前操作提示 | 390×844 | [原图](images/night3-fixture-night-3-toast--390x844--after--832b19f5--84684d40.png) |
| after / 明示第3夜夹具 | 恢复真实帧后原生面对栅栏按住攻击：原规则拆墙 | 390×844 | [原图](images/night3-fixture-wall-facing-hold--390x844--after--832b19f5--84684d40.png) |
| after / 明示第3夜夹具 | 原生补墙、侧移施放：保墙、库存不变、无残留按压 | 390×844 | [原图](images/night3-fixture-wall-side-attack--390x844--after--832b19f5--84684d40.png) |
| after / 明示第3夜夹具 | 第3夜入夜瞬间：金色立方、4波、当前操作提示 | 1280×800 | [原图](images/night3-fixture-night-3-toast--1280x800--after--832b19f5--84684d40.png) |
| after / 明示第3夜夹具 | 恢复真实帧后原生面对栅栏按住攻击：原规则拆墙 | 1280×800 | [原图](images/night3-fixture-wall-facing-hold--1280x800--after--832b19f5--84684d40.png) |
| after / 明示第3夜夹具 | 原生补墙、侧移施放：保墙、库存不变、无残留按压 | 1280×800 | [原图](images/night3-fixture-wall-side-attack--1280x800--after--832b19f5--84684d40.png) |
| after / 明示第3夜夹具 | 第3夜入夜瞬间：金色立方、4波、当前操作提示 | 844×390 | [原图](images/night3-fixture-night-3-toast--844x390--after--832b19f5--84684d40.png) |
| after / 明示第3夜夹具 | 恢复真实帧后原生面对栅栏按住攻击：原规则拆墙 | 844×390 | [原图](images/night3-fixture-wall-facing-hold--844x390--after--832b19f5--84684d40.png) |
| after / 明示第3夜夹具 | 原生补墙、侧移施放：保墙、库存不变、无残留按压 | 844×390 | [原图](images/night3-fixture-wall-side-attack--844x390--after--832b19f5--84684d40.png) |
| before / 明示第3夜夹具 | 第3夜入夜瞬间：金色立方、4波、当前操作提示 | 320×568 | [原图](images/night3-fixture-night-3-toast--320x568--before--7da4c5f2--c2dd1c20.png) |
| before / 明示第3夜夹具 | 恢复真实帧后原生面对栅栏按住攻击：原规则拆墙 | 320×568 | [原图](images/night3-fixture-wall-facing-hold--320x568--before--7da4c5f2--c2dd1c20.png) |
| before / 明示第3夜夹具 | 原生补墙、侧移施放：保墙、库存不变、无残留按压 | 320×568 | [原图](images/night3-fixture-wall-side-attack--320x568--before--7da4c5f2--c2dd1c20.png) |
| before / 明示第3夜夹具 | 第3夜入夜瞬间：金色立方、4波、当前操作提示 | 390×844 | [原图](images/night3-fixture-night-3-toast--390x844--before--7da4c5f2--c2dd1c20.png) |
| before / 明示第3夜夹具 | 恢复真实帧后原生面对栅栏按住攻击：原规则拆墙 | 390×844 | [原图](images/night3-fixture-wall-facing-hold--390x844--before--7da4c5f2--c2dd1c20.png) |
| before / 明示第3夜夹具 | 原生补墙、侧移施放：保墙、库存不变、无残留按压 | 390×844 | [原图](images/night3-fixture-wall-side-attack--390x844--before--7da4c5f2--c2dd1c20.png) |
| before / 明示第3夜夹具 | 第3夜入夜瞬间：金色立方、4波、当前操作提示 | 1280×800 | [原图](images/night3-fixture-night-3-toast--1280x800--before--7da4c5f2--c2dd1c20.png) |
| before / 明示第3夜夹具 | 恢复真实帧后原生面对栅栏按住攻击：原规则拆墙 | 1280×800 | [原图](images/night3-fixture-wall-facing-hold--1280x800--before--7da4c5f2--c2dd1c20.png) |
| before / 明示第3夜夹具 | 原生补墙、侧移施放：保墙、库存不变、无残留按压 | 1280×800 | [原图](images/night3-fixture-wall-side-attack--1280x800--before--7da4c5f2--c2dd1c20.png) |
| before / 明示第3夜夹具 | 第3夜入夜瞬间：金色立方、4波、当前操作提示 | 844×390 | [原图](images/night3-fixture-night-3-toast--844x390--before--7da4c5f2--c2dd1c20.png) |
| before / 明示第3夜夹具 | 恢复真实帧后原生面对栅栏按住攻击：原规则拆墙 | 844×390 | [原图](images/night3-fixture-wall-facing-hold--844x390--before--7da4c5f2--c2dd1c20.png) |
| before / 明示第3夜夹具 | 原生补墙、侧移施放：保墙、库存不变、无残留按压 | 844×390 | [原图](images/night3-fixture-wall-side-attack--844x390--before--7da4c5f2--c2dd1c20.png) |

## 普通样本只读抽核与未覆盖

复看旧 [a342ef0普通第三夜](../natural-loop-a342ef0/images/night-3--390x844.png) 和 [原执行记录](../natural-loop-a342ef0/INDEX.md)：原phase night-3为252.7553秒、第1/4波、篝火100、四墙仍在；finish三夜白天献心胜利。只读复用，不改result/events/图片，不把旧a342ef0称为当前源码自然实玩。其原执行器exit1、录像缺末约9秒的限制仍保留；新局边界测试不是自然通关。

本片未新跑普通三夜或实体设备；第二夜/第四夜夹具无新增图片，仅同输入/原文回归。只有受影响第3夜状态补图，无未变全界面重拍；现有覆盖清单只读核查。D:\.tmp\agents\cube-epoch\独占GUID环境/缓存/profile，浏览器关闭后精确清理；既有C浏览器安装只读，无安装。不合并、不发Pages或腾讯云，PR25–27/旧诊断保留。
