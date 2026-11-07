# UI-023 · 到祭坛后还差一点距离的交付反馈

复用 [已保存的普通三夜记录](../natural-loop-a342ef0/INDEX.md)，实际查看其 [第三夜黎明](../natural-loop-a342ef0/images/third-dawn-ready--390x844.png) 与 [普通交互胜利](../natural-loop-a342ef0/images/natural-victory--390x844.png)，并读原finish事件：390骑士、三夜后白天、288.4034游戏秒、18击杀、心已献出。只复用旧a342ef0记录，不把它改称当前源码的自然试玩；原执行器退出1、录像缺末约9秒等限制保留，本片不重打三夜、不改旧诊断。

当前边界夹具复现：祭坛南24px、三夜后白天、心1，提示“点「交互 E」献上方块之心”，真实点按却不献出，只给同时提工作台/祭坛/播种的通用toast。原因是提示范围原为 `<26`，实际献祭原为 `<22`。普通触屏再向上走到原22px以内才实际扣一颗心并胜利。不是成本、方向、地图映射或胜利条件问题。

最小修改：22–26px这圈在现有prompt说明“再靠近祭坛，才能献上方块之心”；实际未够距离的交互说明“这次没献出：再靠近祭坛。”，不把通用长说明挤进该状态。到原22px以内恢复原交互步骤。拒绝分支在原面对空田的播种/缺种处理之后，仅白天/三夜/持心均满足才启用，保留这些既有优先与拒绝。没有改献祭距离、时间、消耗、掉落、经济、胜负、存档或CSS/地图面积/44px控制。

## 准确来源与范围

18张新原图都是**明示边界夹具**，不是新的自然三夜。Web/Chromium、中文、100%、DPR1、首屏原图；320×568、390×844、844×390各三个状态前后，真实画布/按钮/文字和拍摄时间逐图记录在 [screenshots.json](screenshots.json)。桌面1280×800用真实键盘回归，无未变桌面界面重拍。

- before：内存响应 `2dcb7cdbe4ff286731c6510202f09db39cd11418` 原Git三文件，不checkout/reset工作区；served SHA256 `dd1d4b545f17ebcfdd0ff4daafb98f8bedd1ee098d836f7287f0d1a2a148ca0a`，产品clean。与Windows工作区CRLF字节不同，如实标来源。
- after：拍摄HEAD仍2dcb7cd、本片game.js产品dirty=true；served SHA256 `f45b0d0c55a15577f7a87356c2a8176e4195a5021363352123eaabf2bceec684`。不把拍摄时SHA/dirty倒改成未来提交；旧natural-loop另有受保护dirty。
- 明示夹具：隔离骑士新局；初始库存外心1、四面80血墙、夜数3、夜长32、末0.1秒、完成四波/空敌、时间284、祭坛南24px，进度标记已完成。模拟引擎真实跨到白天，不是只把day改成白天；等待原天亮toast自然消失后原生点交互。不能称真的守完四波/三夜或自然取得心。
- Chromium手机移动用原生touchStart/end、交互原生tap；WebKit移动布局回归为原生鼠标按住/释放与移动按钮tap，不冒称WebKit触屏长按。桌面真实ArrowUp按下/释放及E键；每视口独立隔离fixture。
- 每版本36项行为：四视口真实黎明→24px拒绝且库存不变→原生走近/释放→交互扣心1→原胜利；另精确22px仍不献、21.9px可献、26px原通用反馈不变，夜里/只过两夜/无心仍拒绝，边界面对田仍播种或专用缺种拒绝，不被新祭坛反馈抢占。实际距离与库存见 [validation.json](validation.json)。

## 同状态前后原图

| 状态 | 视口 | before | after |
|---|---|---|---|
| 距祭坛24px，尚未交互 | 320×568 | [原图](images/edge-ready--320x568--before--dd1d4b54.png) | [原图](images/edge-ready--320x568--after--f45b0d0c.png) |
| 24px真实交互未献出 | 320×568 | [原图](images/edge-pressed--320x568--before--dd1d4b54.png) | [原图](images/edge-pressed--320x568--after--f45b0d0c.png) |
| 原生走近后可献 | 320×568 | [原图](images/arrived-ready--320x568--before--dd1d4b54.png) | [原图](images/arrived-ready--320x568--after--f45b0d0c.png) |
| 距祭坛24px，尚未交互 | 390×844 | [原图](images/edge-ready--390x844--before--dd1d4b54.png) | [原图](images/edge-ready--390x844--after--f45b0d0c.png) |
| 24px真实交互未献出 | 390×844 | [原图](images/edge-pressed--390x844--before--dd1d4b54.png) | [原图](images/edge-pressed--390x844--after--f45b0d0c.png) |
| 原生走近后可献 | 390×844 | [原图](images/arrived-ready--390x844--before--dd1d4b54.png) | [原图](images/arrived-ready--390x844--after--f45b0d0c.png) |
| 距祭坛24px，尚未交互 | 844×390 | [原图](images/edge-ready--844x390--before--dd1d4b54.png) | [原图](images/edge-ready--844x390--after--f45b0d0c.png) |
| 24px真实交互未献出 | 844×390 | [原图](images/edge-pressed--844x390--before--dd1d4b54.png) | [原图](images/edge-pressed--844x390--after--f45b0d0c.png) |
| 原生走近后可献 | 844×390 | [原图](images/arrived-ready--844x390--before--dd1d4b54.png) | [原图](images/arrived-ready--844x390--after--f45b0d0c.png) |

**已截，待协调逐图审查。** 原生按住到释放会有正常帧差，走近状态before/after都在原22px以内，不伪称相同随机进程/精确坐标；24px比较固定一致。来到范围内，旧一次拒绝toast记录上次操作，当前prompt已显示可交互，不改全部toast的时长/清除语义。未做真机验收，未重拍其他未变结算/全图集。

运行 `node tests\altar-arrival.mjs --before --capture` / `--capture`；CI只执行相同边界回归，不重打自然三夜。检查见 [checks.log](checks.log)。旧候选/诊断/PR19保留；新PR叠加其上，均不合并、不发布Pages/腾讯云、不重启服务器。
