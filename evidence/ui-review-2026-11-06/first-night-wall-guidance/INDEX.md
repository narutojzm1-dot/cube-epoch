# UI-030 首夜触屏朝墙攻击的误导

仅改既有触屏首夜toast和守夜步骤文字：面朝怪按住「采集/攻击」；朝墙会拆墙，先移到墙侧再打。桌面原文不变。守篝火与地图边缘来怪目标原已清楚，未改输入优先级、成本、波次、昼夜、胜负、存档、CSS或地图。

[逐图来源/真实画布矩形/输入](screenshots.json) · [库存、缺口、时间与按压记录](validation.json) · [检查](checks.log)

普通before/after各3个独立法师新局，320/390真实CDP触屏按住/释放、桌面键盘/鼠标；无位置、时间、库存、世界或存档注入。真实采树→直接扣2木放(22,22)第一墙→原76秒首次入夜→面对墙按攻击拆墙→原退款1木→恢复扣2木→侧移再发术，墙与建造库存不变；再等真实第一批敌人出现。只读CUBE观测。

边界before/after各4视口夹具：玩家(378,358)左向、木4、墙(22,22)HP80、首日cycle=dayLen−0.01、已采集标记，下一真实帧入夜；不是自然备料或存活证明。复现参数见tests/first-night-guidance.mjs。全部中文、Web/Chromium、DPR1、UI100%，PNG为原视口不缩放，实际游戏CSS矩形逐图记录；展开背包后核心控件被面板覆盖为现有语义，可原生收回。

## 拍摄源码（不倒填将来提交号）
- SHA af3a311a40ac5a70d2b65daffe4e36b004ef596c；产品dirty=false；三文件字节SHA256 9306fde18c152cc62547e5b5d62759232417d5014aa568d37e05a515d13def6b；Windows working-tree product bytes; description restored from before.log because legacy manifest omitted build.source。
- SHA af3a311a40ac5a70d2b65daffe4e36b004ef596c；产品dirty=true；三文件字节SHA256 487ade13b19d2365bb95b5a4934a4af3eb6280c6b54a3071d1d238fc8c2bc1ce；current working-tree product bytes。
- SHA af3a311a40ac5a70d2b65daffe4e36b004ef596c；产品dirty=false；三文件字节SHA256 01a541439f39274a5e3d18961c42ad6d58ad6d96bb7c2afdcbf3dc5097e1346f；baseline Git product files served in memory, not current working tree。

普通before读取Windows工作树字节；边界before用父提交Git三文件内存响应，LF/CRLF导致字节哈希不同，均明确标识。after产品字节相同。每张图记录捕获时间、原生输入坐标与游戏状态；证据生成脚本不刷图。

## 当前68张：普通前后36＋边界前后32

| 来源/阶段 | 状态 | 视口 | 原图 |
|---|---|---|---|
| 普通新局 / before | first-fence：普通采木后第一面栅栏落地，原成本2木、缺口4→3 | 320×568 | [原图](images/normal-first-fence--320x568--before--9306fde1.png) |
| 普通新局 / before | first-night：自然首夜或明示边界：守火目标、波次、当前攻击提示 | 320×568 | [原图](images/normal-first-night--320x568--before--9306fde1.png) |
| 普通新局 / before | night-guide：原生展开背包：现有守夜步骤、朝墙拆墙与侧移提醒 | 320×568 | [原图](images/normal-night-guide--320x568--before--9306fde1.png) |
| 普通新局 / before | wall-facing-hold：原生面对栅栏按住攻击，按原规则拆墙 | 320×568 | [原图](images/normal-wall-facing-hold--320x568--before--9306fde1.png) |
| 普通新局 / before | wall-side-attack：原生恢复墙、移到墙侧再攻击，墙和建造库存保留 | 320×568 | [原图](images/normal-wall-side-attack--320x568--before--9306fde1.png) |
| 普通新局 / before | first-wave：普通新局自然首夜第一批真实敌人出现 | 320×568 | [原图](images/normal-first-wave--320x568--before--9306fde1.png) |
| 普通新局 / before | first-fence：普通采木后第一面栅栏落地，原成本2木、缺口4→3 | 390×844 | [原图](images/normal-first-fence--390x844--before--9306fde1.png) |
| 普通新局 / before | first-night：自然首夜或明示边界：守火目标、波次、当前攻击提示 | 390×844 | [原图](images/normal-first-night--390x844--before--9306fde1.png) |
| 普通新局 / before | night-guide：原生展开背包：现有守夜步骤、朝墙拆墙与侧移提醒 | 390×844 | [原图](images/normal-night-guide--390x844--before--9306fde1.png) |
| 普通新局 / before | wall-facing-hold：原生面对栅栏按住攻击，按原规则拆墙 | 390×844 | [原图](images/normal-wall-facing-hold--390x844--before--9306fde1.png) |
| 普通新局 / before | wall-side-attack：原生恢复墙、移到墙侧再攻击，墙和建造库存保留 | 390×844 | [原图](images/normal-wall-side-attack--390x844--before--9306fde1.png) |
| 普通新局 / before | first-wave：普通新局自然首夜第一批真实敌人出现 | 390×844 | [原图](images/normal-first-wave--390x844--before--9306fde1.png) |
| 普通新局 / before | first-fence：普通采木后第一面栅栏落地，原成本2木、缺口4→3 | 1280×800 | [原图](images/normal-first-fence--1280x800--before--9306fde1.png) |
| 普通新局 / before | first-night：自然首夜或明示边界：守火目标、波次、当前攻击提示 | 1280×800 | [原图](images/normal-first-night--1280x800--before--9306fde1.png) |
| 普通新局 / before | night-guide：原生展开背包：现有守夜步骤、朝墙拆墙与侧移提醒 | 1280×800 | [原图](images/normal-night-guide--1280x800--before--9306fde1.png) |
| 普通新局 / before | wall-facing-hold：原生面对栅栏按住攻击，按原规则拆墙 | 1280×800 | [原图](images/normal-wall-facing-hold--1280x800--before--9306fde1.png) |
| 普通新局 / before | wall-side-attack：原生恢复墙、移到墙侧再攻击，墙和建造库存保留 | 1280×800 | [原图](images/normal-wall-side-attack--1280x800--before--9306fde1.png) |
| 普通新局 / before | first-wave：普通新局自然首夜第一批真实敌人出现 | 1280×800 | [原图](images/normal-first-wave--1280x800--before--9306fde1.png) |
| 普通新局 / after | first-fence：普通采木后第一面栅栏落地，原成本2木、缺口4→3 | 320×568 | [原图](images/normal-first-fence--320x568--after--487ade13--79078fbf.png) |
| 普通新局 / after | first-night：自然首夜或明示边界：守火目标、波次、当前攻击提示 | 320×568 | [原图](images/normal-first-night--320x568--after--487ade13--79078fbf.png) |
| 普通新局 / after | night-guide：原生展开背包：现有守夜步骤、朝墙拆墙与侧移提醒 | 320×568 | [原图](images/normal-night-guide--320x568--after--487ade13--79078fbf.png) |
| 普通新局 / after | wall-facing-hold：原生面对栅栏按住攻击，按原规则拆墙 | 320×568 | [原图](images/normal-wall-facing-hold--320x568--after--487ade13--79078fbf.png) |
| 普通新局 / after | wall-side-attack：原生恢复墙、移到墙侧再攻击，墙和建造库存保留 | 320×568 | [原图](images/normal-wall-side-attack--320x568--after--487ade13--79078fbf.png) |
| 普通新局 / after | first-wave：普通新局自然首夜第一批真实敌人出现 | 320×568 | [原图](images/normal-first-wave--320x568--after--487ade13--79078fbf.png) |
| 普通新局 / after | first-fence：普通采木后第一面栅栏落地，原成本2木、缺口4→3 | 390×844 | [原图](images/normal-first-fence--390x844--after--487ade13--79078fbf.png) |
| 普通新局 / after | first-night：自然首夜或明示边界：守火目标、波次、当前攻击提示 | 390×844 | [原图](images/normal-first-night--390x844--after--487ade13--79078fbf.png) |
| 普通新局 / after | night-guide：原生展开背包：现有守夜步骤、朝墙拆墙与侧移提醒 | 390×844 | [原图](images/normal-night-guide--390x844--after--487ade13--79078fbf.png) |
| 普通新局 / after | wall-facing-hold：原生面对栅栏按住攻击，按原规则拆墙 | 390×844 | [原图](images/normal-wall-facing-hold--390x844--after--487ade13--79078fbf.png) |
| 普通新局 / after | wall-side-attack：原生恢复墙、移到墙侧再攻击，墙和建造库存保留 | 390×844 | [原图](images/normal-wall-side-attack--390x844--after--487ade13--79078fbf.png) |
| 普通新局 / after | first-wave：普通新局自然首夜第一批真实敌人出现 | 390×844 | [原图](images/normal-first-wave--390x844--after--487ade13--79078fbf.png) |
| 普通新局 / after | first-fence：普通采木后第一面栅栏落地，原成本2木、缺口4→3 | 1280×800 | [原图](images/normal-first-fence--1280x800--after--487ade13--79078fbf.png) |
| 普通新局 / after | first-night：自然首夜或明示边界：守火目标、波次、当前攻击提示 | 1280×800 | [原图](images/normal-first-night--1280x800--after--487ade13--79078fbf.png) |
| 普通新局 / after | night-guide：原生展开背包：现有守夜步骤、朝墙拆墙与侧移提醒 | 1280×800 | [原图](images/normal-night-guide--1280x800--after--487ade13--79078fbf.png) |
| 普通新局 / after | wall-facing-hold：原生面对栅栏按住攻击，按原规则拆墙 | 1280×800 | [原图](images/normal-wall-facing-hold--1280x800--after--487ade13--79078fbf.png) |
| 普通新局 / after | wall-side-attack：原生恢复墙、移到墙侧再攻击，墙和建造库存保留 | 1280×800 | [原图](images/normal-wall-side-attack--1280x800--after--487ade13--79078fbf.png) |
| 普通新局 / after | first-wave：普通新局自然首夜第一批真实敌人出现 | 1280×800 | [原图](images/normal-first-wave--1280x800--after--487ade13--79078fbf.png) |
| 边界夹具 / before | first-night：自然首夜或明示边界：守火目标、波次、当前攻击提示 | 320×568 | [原图](images/fixture-first-night--320x568--before--01a54143--54938081.png) |
| 边界夹具 / before | night-guide：原生展开背包：现有守夜步骤、朝墙拆墙与侧移提醒 | 320×568 | [原图](images/fixture-night-guide--320x568--before--01a54143--54938081.png) |
| 边界夹具 / before | wall-facing-hold：原生面对栅栏按住攻击，按原规则拆墙 | 320×568 | [原图](images/fixture-wall-facing-hold--320x568--before--01a54143--54938081.png) |
| 边界夹具 / before | wall-side-attack：原生恢复墙、移到墙侧再攻击，墙和建造库存保留 | 320×568 | [原图](images/fixture-wall-side-attack--320x568--before--01a54143--54938081.png) |
| 边界夹具 / before | first-night：自然首夜或明示边界：守火目标、波次、当前攻击提示 | 390×844 | [原图](images/fixture-first-night--390x844--before--01a54143--54938081.png) |
| 边界夹具 / before | night-guide：原生展开背包：现有守夜步骤、朝墙拆墙与侧移提醒 | 390×844 | [原图](images/fixture-night-guide--390x844--before--01a54143--54938081.png) |
| 边界夹具 / before | wall-facing-hold：原生面对栅栏按住攻击，按原规则拆墙 | 390×844 | [原图](images/fixture-wall-facing-hold--390x844--before--01a54143--54938081.png) |
| 边界夹具 / before | wall-side-attack：原生恢复墙、移到墙侧再攻击，墙和建造库存保留 | 390×844 | [原图](images/fixture-wall-side-attack--390x844--before--01a54143--54938081.png) |
| 边界夹具 / before | first-night：自然首夜或明示边界：守火目标、波次、当前攻击提示 | 1280×800 | [原图](images/fixture-first-night--1280x800--before--01a54143--54938081.png) |
| 边界夹具 / before | night-guide：原生展开背包：现有守夜步骤、朝墙拆墙与侧移提醒 | 1280×800 | [原图](images/fixture-night-guide--1280x800--before--01a54143--54938081.png) |
| 边界夹具 / before | wall-facing-hold：原生面对栅栏按住攻击，按原规则拆墙 | 1280×800 | [原图](images/fixture-wall-facing-hold--1280x800--before--01a54143--54938081.png) |
| 边界夹具 / before | wall-side-attack：原生恢复墙、移到墙侧再攻击，墙和建造库存保留 | 1280×800 | [原图](images/fixture-wall-side-attack--1280x800--before--01a54143--54938081.png) |
| 边界夹具 / before | first-night：自然首夜或明示边界：守火目标、波次、当前攻击提示 | 844×390 | [原图](images/fixture-first-night--844x390--before--01a54143--54938081.png) |
| 边界夹具 / before | night-guide：原生展开背包：现有守夜步骤、朝墙拆墙与侧移提醒 | 844×390 | [原图](images/fixture-night-guide--844x390--before--01a54143--54938081.png) |
| 边界夹具 / before | wall-facing-hold：原生面对栅栏按住攻击，按原规则拆墙 | 844×390 | [原图](images/fixture-wall-facing-hold--844x390--before--01a54143--54938081.png) |
| 边界夹具 / before | wall-side-attack：原生恢复墙、移到墙侧再攻击，墙和建造库存保留 | 844×390 | [原图](images/fixture-wall-side-attack--844x390--before--01a54143--54938081.png) |
| 边界夹具 / after | first-night：自然首夜或明示边界：守火目标、波次、当前攻击提示 | 320×568 | [原图](images/fixture-first-night--320x568--after--487ade13--54938081.png) |
| 边界夹具 / after | night-guide：原生展开背包：现有守夜步骤、朝墙拆墙与侧移提醒 | 320×568 | [原图](images/fixture-night-guide--320x568--after--487ade13--54938081.png) |
| 边界夹具 / after | wall-facing-hold：原生面对栅栏按住攻击，按原规则拆墙 | 320×568 | [原图](images/fixture-wall-facing-hold--320x568--after--487ade13--54938081.png) |
| 边界夹具 / after | wall-side-attack：原生恢复墙、移到墙侧再攻击，墙和建造库存保留 | 320×568 | [原图](images/fixture-wall-side-attack--320x568--after--487ade13--54938081.png) |
| 边界夹具 / after | first-night：自然首夜或明示边界：守火目标、波次、当前攻击提示 | 390×844 | [原图](images/fixture-first-night--390x844--after--487ade13--54938081.png) |
| 边界夹具 / after | night-guide：原生展开背包：现有守夜步骤、朝墙拆墙与侧移提醒 | 390×844 | [原图](images/fixture-night-guide--390x844--after--487ade13--54938081.png) |
| 边界夹具 / after | wall-facing-hold：原生面对栅栏按住攻击，按原规则拆墙 | 390×844 | [原图](images/fixture-wall-facing-hold--390x844--after--487ade13--54938081.png) |
| 边界夹具 / after | wall-side-attack：原生恢复墙、移到墙侧再攻击，墙和建造库存保留 | 390×844 | [原图](images/fixture-wall-side-attack--390x844--after--487ade13--54938081.png) |
| 边界夹具 / after | first-night：自然首夜或明示边界：守火目标、波次、当前攻击提示 | 1280×800 | [原图](images/fixture-first-night--1280x800--after--487ade13--54938081.png) |
| 边界夹具 / after | night-guide：原生展开背包：现有守夜步骤、朝墙拆墙与侧移提醒 | 1280×800 | [原图](images/fixture-night-guide--1280x800--after--487ade13--54938081.png) |
| 边界夹具 / after | wall-facing-hold：原生面对栅栏按住攻击，按原规则拆墙 | 1280×800 | [原图](images/fixture-wall-facing-hold--1280x800--after--487ade13--54938081.png) |
| 边界夹具 / after | wall-side-attack：原生恢复墙、移到墙侧再攻击，墙和建造库存保留 | 1280×800 | [原图](images/fixture-wall-side-attack--1280x800--after--487ade13--54938081.png) |
| 边界夹具 / after | first-night：自然首夜或明示边界：守火目标、波次、当前攻击提示 | 844×390 | [原图](images/fixture-first-night--844x390--after--487ade13--54938081.png) |
| 边界夹具 / after | night-guide：原生展开背包：现有守夜步骤、朝墙拆墙与侧移提醒 | 844×390 | [原图](images/fixture-night-guide--844x390--after--487ade13--54938081.png) |
| 边界夹具 / after | wall-facing-hold：原生面对栅栏按住攻击，按原规则拆墙 | 844×390 | [原图](images/fixture-wall-facing-hold--844x390--after--487ade13--54938081.png) |
| 边界夹具 / after | wall-side-attack：原生恢复墙、移到墙侧再攻击，墙和建造库存保留 | 844×390 | [原图](images/fixture-wall-side-attack--844x390--after--487ade13--54938081.png) |

## 历史12张：初次夹具入口失败，保留不计完整矩阵

| 来源/阶段 | 状态 | 视口 | 原图 |
|---|---|---|---|
| 边界夹具 / before | first-night：自然首夜或明示边界：守火目标、波次、当前攻击提示 | 320×568 | [原图](images/fixture-first-night--320x568--before--01a54143.png) |
| 边界夹具 / before | night-guide：原生展开背包：现有守夜步骤、朝墙拆墙与侧移提醒 | 320×568 | [原图](images/fixture-night-guide--320x568--before--01a54143.png) |
| 边界夹具 / before | wall-facing-hold：原生面对栅栏按住攻击，按原规则拆墙 | 320×568 | [原图](images/fixture-wall-facing-hold--320x568--before--01a54143.png) |
| 边界夹具 / before | wall-side-attack：原生恢复墙、移到墙侧再攻击，墙和建造库存保留 | 320×568 | [原图](images/fixture-wall-side-attack--320x568--before--01a54143.png) |
| 边界夹具 / before | first-night：自然首夜或明示边界：守火目标、波次、当前攻击提示 | 390×844 | [原图](images/fixture-first-night--390x844--before--01a54143.png) |
| 边界夹具 / before | night-guide：原生展开背包：现有守夜步骤、朝墙拆墙与侧移提醒 | 390×844 | [原图](images/fixture-night-guide--390x844--before--01a54143.png) |
| 边界夹具 / before | wall-facing-hold：原生面对栅栏按住攻击，按原规则拆墙 | 390×844 | [原图](images/fixture-wall-facing-hold--390x844--before--01a54143.png) |
| 边界夹具 / before | wall-side-attack：原生恢复墙、移到墙侧再攻击，墙和建造库存保留 | 390×844 | [原图](images/fixture-wall-side-attack--390x844--before--01a54143.png) |
| 边界夹具 / before | first-night：自然首夜或明示边界：守火目标、波次、当前攻击提示 | 1280×800 | [原图](images/fixture-first-night--1280x800--before--01a54143.png) |
| 边界夹具 / before | night-guide：原生展开背包：现有守夜步骤、朝墙拆墙与侧移提醒 | 1280×800 | [原图](images/fixture-night-guide--1280x800--before--01a54143.png) |
| 边界夹具 / before | wall-facing-hold：原生面对栅栏按住攻击，按原规则拆墙 | 1280×800 | [原图](images/fixture-wall-facing-hold--1280x800--before--01a54143.png) |
| 边界夹具 / before | wall-side-attack：原生恢复墙、移到墙侧再攻击，墙和建造库存保留 | 1280×800 | [原图](images/fixture-wall-side-attack--1280x800--before--01a54143.png) |

## 检查与限制

初次普通命令Tee目标目录未建：无截图写入，精确清理见initial-log-path-cleanup.log。初次844夹具触屏选角不稳：fixtures.log及12张中间图保留；只修测试点击可见片段中点、滑动后8稳定帧，未自动滚入、延长超时或改产品。完整四视口重跑见fixtures-final.log；普通前后见before.log/after.log。

复用canvas-black-area/environment.ps1及cleanup.ps1：独占D:\.tmp\agents\cube-epoch\本次GUID目录，TEMP/TMP/TMPDIR/profile/cache均D，既有C浏览器安装只读，无安装。日志输出到D项目并过滤工具回显，关闭本次浏览器后精确清理；旧诊断与PR #25/#26不动。

只补受影响状态，未覆盖实体iOS/Android、普通844自然首日、完整首夜胜败或三夜。无英文切换。已截不等于布局审查通过，待用户/协调逐图确认；不合并、不发布。
