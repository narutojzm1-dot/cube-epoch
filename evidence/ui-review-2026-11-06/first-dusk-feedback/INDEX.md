# UI-022 · 第一晚近怪时的建造操作反馈

普通手机输入首局采树拾木、用初始成品放火把，原76秒首日自然进入第一夜。目标“守住篝火”、金框指营火、第四步教程及火把选择均正确，未重复改这些状态。

真正问题在相邻夜守操作：第一晚自然怪贴近后重新选火，旧提示仍说“点空地放火把”；真实按住空地约67ms却法力8→7.045、发出法术，木5不扣、格(23,22)没有火把。原规则按住时近怪攻击优先，并非输入映射错误。

只修改现有选择反馈和共用建造说明：近怪时确认已选物品，并说明“按住空地先攻击”；说明中补怪远离再放置。明确按住，不承诺所有短点都会攻击。无近怪时保持原字句；原围营/修墙/采集优先、成本、时间、波次、掉落、经济、结算、存档及触控布局均未改。

## 来源、输入和限制

24张Web/Chromium原图，中文、100%、DPR1、非full-page。10张普通自然路径图、14张独立夹具图；每张的真实视口/画布/源码/状态/复现步骤见 [screenshots.json](screenshots.json)，实际输入结果见 [validation.json](validation.json)。

- 普通before：`e1a86b4bf227d4e09be31ac8cc3f7442d22cee2a`产品clean，Windows实际三文件SHA256 `4b50e0ef92f78a47796967524310e3d9c654eda13aa45532a406bcb8290a3bea`。
- 夹具before：同提交原产品通过Git原始缓冲区内存响应，不checkout/reset工作区；实际LF字节SHA256 `f85065c923e26c87dde65d3550bb98e6d6f0674c19be683a4d3d7e3153566793`。与普通before的CRLF哈希不同，不冒称同一served-byte构建。此时工作区产品已dirty，但内存所服务before产品clean。
- after：拍摄时HEAD仍e1a86b4加本片game.js，产品dirty=true；实际SHA256 `ace7f2288c909cfe831edb9cc6d68156eda9c9b40e6b0295faf5cd3d1936a6db`。保留拍摄来源，不改成后续提交号；全工作区另有受保护旧诊断dirty。
- 每版本只走一条普通320法师新局，采集/背包选择/放置/近怪地图按住均原生触屏输入。390和844是该同一普通局的真实新视口渲染，并各自真实选择/地图按住，不是缩放320图片，也不是三局独立自然通关。未注库存、位置、世界、昼夜时间或源码，只有截图临时暂停。
- before自然入夜time76.0346，近怪cycle15.55；after入夜time76.0354，近怪cycle19.87，首夜波次仍0→1/2。随机木掉落before3、after4，篝火after实际受损到38.8，另实际击杀一只；不强制相同随机进程、不称防守/平衡通过。范围止于第一夜近怪操作，未重打自然三夜或验证完整第一夜存活。
- 32个独立夹具/版本：法师初始库存，首夜wave1/2、cycle1、静止无伤1000血怪；距41真实按住草地发术且不扣料/不放置，距42原放置成功；近怪点20血墙仍只扣原木1修到80，指树长按仍采集优先。持续按住新田可能按原规则连播种，验证田7/麦苗8及相应种子0/1扣量，不改规则。
- Chromium夹具按住为原生touchStart/end；WebKit回归用原生鼠标按住、移动布局背包原生tap，不能称WebKit触屏拖动。桌面1280原选择提示和建造banner覆盖；桌面普通帮助原本不含实时banner，未新增或伪称该能力。

## 原图逐项索引

| 状态/来源 | 视口 | before | after | 状态 |
|---|---|---|---|---|
| 普通备料/成品放置 | 320×568 | [原图](images/day-prepared--320x568--before--4b50e0ef.png) | [原图](images/day-prepared--320x568--after--ace7f228.png) | 已截，待审 |
| 普通自然第一晚 | 320×568 | [原图](images/first-night--320x568--before--4b50e0ef.png) | [原图](images/first-night--320x568--after--ace7f228.png) | 已截，待审 |
| 普通近怪重新选火 | 320×568 | [原图](images/near-enemy-selected--320x568--before--4b50e0ef.png) | [原图](images/near-enemy-selected--320x568--after--ace7f228.png) | 已截，待审 |
| 同一普通局近怪选火 | 390×844 | [原图](images/near-enemy-selected--390x844--before--4b50e0ef.png) | [原图](images/near-enemy-selected--390x844--after--ace7f228.png) | 已截，待审 |
| 同一普通局近怪选火 | 844×390 | [原图](images/near-enemy-selected--844x390--before--4b50e0ef.png) | [原图](images/near-enemy-selected--844x390--after--ace7f228.png) | 已截，待审 |
| 独立近怪夹具HUD | 320×568 | [原图](images/fixture-near-torch--320x568--before--f85065c9.png) | [原图](images/fixture-near-torch--320x568--after--ace7f228.png) | 已截，待审 |
| 独立近怪夹具HUD | 390×844 | [原图](images/fixture-near-torch--390x844--before--f85065c9.png) | [原图](images/fixture-near-torch--390x844--after--ace7f228.png) | 已截，待审 |
| 独立近怪夹具HUD | 844×390 | [原图](images/fixture-near-torch--844x390--before--f85065c9.png) | [原图](images/fixture-near-torch--844x390--after--ace7f228.png) | 已截，待审 |
| 独立夹具鼠标HUD | 1280×800 | [原图](images/fixture-near-torch--1280x800--before--f85065c9.png) | [原图](images/fixture-near-torch--1280x800--after--ace7f228.png) | 已截，待审 |
| 独立夹具原帮助 | 320×568 | [原图](images/fixture-near-help--320x568--before--f85065c9.png) | [原图](images/fixture-near-help--320x568--after--ace7f228.png) | 已截，待审 |
| 独立夹具原帮助 | 390×844 | [原图](images/fixture-near-help--390x844--before--f85065c9.png) | [原图](images/fixture-near-help--390x844--after--ace7f228.png) | 已截，待审 |
| 独立夹具原帮助 | 844×390 | [原图](images/fixture-near-help--844x390--before--f85065c9.png) | [原图](images/fixture-near-help--844x390--after--ace7f228.png) | 已截，待审 |

复现：`node tests\first-dusk-feedback.mjs --natural --capture`普通路径；无`--natural`为单列夹具，CI只跑夹具，不机械重复等首日；before夹具用`--before --capture`内存服务原版。检查见 [checks.log](checks.log)。保留初次误把持续开田后播种当成失败的 [initial-hold-plot.log](initial-hold-plot.log)，以及误要求桌面帮助含实时banner的 [initial-desktop-help.log](initial-desktop-help.log)；修正测试对应真实既有规则，不加超时、不改产品规则或跳门槛。

待协调逐图审查，不是24图视觉批准或真机验收。旧候选/PR18/诊断保留；只开叠加PR，不合并、不发布Pages/腾讯云、不重启服务器。
