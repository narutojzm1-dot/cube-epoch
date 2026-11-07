# UI-029 · 宽屏触控首局舞台黑区

**公网旧验收包与父版均可稳定复现，不走入夜提示候选分支。** 仅修 `style.css` 的 `(any-pointer: coarse) and (min-width:981px) and (min-height:501px)` 主区与舞台：高度按内容/5:3画布比例，保留最大高度约束并顶端对齐；不改绘制、加载、相机、输入映射、经济、日夜、胜负或存档。

## 已核实的旧包，不是猜测版本

只读 `https://43.139.171.195/cube-epoch/`，全新独占浏览器配置/上下文，无原用户cookie/存档，阻止service worker；仅GET与本地游戏普通输入，没有上传、服务器修改或发布。`version.json` 声明 `e35452c582ef21e4290c9794d60146c6e37c2848`、dirty=false、release=`20261107-acceptance-2`。每个上下文实际下载的3主文件及4角色图，SHA256全部与包内版本文件一致；响应状态/ETag/Last-Modified/no-cache及URL逐项保留，不记录cookie等敏感头。

| 实际文件 | SHA256 |
|---|---|
| index.html | `2a2188635caf3a9fdd91d2266c8aeee0fe889de0a1edd06e8f737d474f975a5c` |
| style.css | `bd360be3059f6f8fbd8d66d79262b00987a536cc1e563fcbb4bf3bda5e1d0ac0` |
| game.js | `88a2593b6164d5a0bda02f7354be2524bc3d52e498bb02dcdb10d4c9de8a23c3` |

严格TLS curl探测成功；浏览器旧包取证配置 `ignoreHTTPSErrors=true` 明确记录，不把它冒称浏览器证书安全验收。公网资源只在本次临时根存中间副本，退出即删；保留原图、响应哈希与版本记录在项目D盘。

## 原因与同条件矩形

1484×1040、coarse=true、DPR1/2，舞台CSS高度随剩余屏幕空间伸展；画布本身完整、保持约816×489.6，居中就留下舞台背景 `rgb(7,5,10)`，并非未绘制画布。5个位图角/中心采样alpha255，buffer1280×768、绘制transform4，与正常细指针模式相同。展开背包移出grid占位后舞台还增高48px，再下移画布24px；金框中的大片黑区与原验收图同类，不能当普通页面背景裁图。

| 1484×1040触控、DPR1 | 公网旧包 | 本地52195fc | 修复后 |
|---|---|---|---|
| 闭背包stage高 | 821px | 821px | 489.578px |
| 闭背包canvas y | 260.703px | 260.703px | 95px |
| 闭背包上下黑区各 | 165.703px | 165.703px | 0px |
| 开背包stage高 | 869px | 869px | 489.578px |
| 开背包canvas y | 284.703px | 284.703px | 95px |
| 开背包上下黑区各 | 189.703px | 189.703px | 0px |

修复后画布约815.953×489.578，仅原生布局亚像素舍入差；buffer/相机/世界不变。当前细指针1280/1484、手机320/390和844横屏的父版/修复后画布矩形完全一致。844保留为5:3画布适配200px舞台高度所需的左右黑边，**没有把正常横屏留边也裁掉**。原用户截图不含DPR/浏览器细节，未声称逐像素复制其全部环境；本轮已记录新配置实际参数。

## 原生输入与截图清单

87张原图：公网29、本地父版29、修复后29。9种初始配置：1484×1040触控DPR1/2；1484×1040与1280×800细指针DPR1；981×501触控边界；320×568、390×844(DPR1/3)、844×390触控。

每局原生选法师、跳开场/预演，真实按方向下移、右移至树边，按住采集后释放；读到首次木头真实入包，再真实展开/关闭背包。无世界/位置/库存/日夜/暂停注入。320局另实际resize为844→1484→390→320，每次都真实移动一小步、释放并记录，不只改截图尺寸。Chromium持续触屏用CDP原生事件；细指针/WebKit连续方向与采集用真实键盘并明确记录，不冒称WebKit原生持续触摸。隔离存储不接触玩家档案。

每张的source/build/dirty、viewport/DPR、CSS舞台/画布/主区矩形、visualViewport缩放、bitmap大小/transform/采样、首步资源/方向/输入与原生路径见 [screenshots.json](screenshots.json)。公开旧包的build.sha从**当时已捕获的**version.json与7项实际文件哈希验证派生；[public.json](public.json) 原始记录仍保留，未改原图或captured_at。父版/after拍摄HEAD均52195fc，after产品dirty；不倒填未来提交号。

| 可审查状态 | 公网 | 本地父版 | 修复后 |
|---|---|---|---|
| 全部9配置普通首次玩法/首次木头 | 已截 | 已截 | 已截 |
| 7触控配置背包展开 | 已截 | 已截 | 已截 |
| 320局四次真实旋转后移动 | 已截 | 已截 | 已截 |
| 夜间/结算独立截图 | 本轮未截 | 复用既有记录，非新SHA图 | 本轮未截 |

DPR1原图尺寸等于viewport；DPR2/3原图保留真实2/3倍物理像素，明确标注，不缩小伪装手机图。读数与PNG间有正常游戏帧差，未冻结随机粒子或复制世界。

### 原图入口

- 1484触控开背包：[公网旧包](images/inventory-open--start-1484x1040--1484x1040--touchtrue--dpr1--public--bd360be3.png) / [本地父版](images/inventory-open--start-1484x1040--1484x1040--touchtrue--dpr1--before--e1ee0e08.png) / [修复后](images/inventory-open--start-1484x1040--1484x1040--touchtrue--dpr1--after--df786f5e.png)。
- 320首次采木：[前](images/first-wood--start-320x568--320x568--touchtrue--dpr1--before--e1ee0e08.png) / [后](images/first-wood--start-320x568--320x568--touchtrue--dpr1--after--df786f5e.png)。
- 390首次采木：[前](images/first-wood--start-390x844--390x844--touchtrue--dpr1--before--e1ee0e08.png) / [后](images/first-wood--start-390x844--390x844--touchtrue--dpr1--after--df786f5e.png)。
- 844首次采木：[前](images/first-wood--start-844x390--844x390--touchtrue--dpr1--before--e1ee0e08.png) / [后](images/first-wood--start-844x390--844x390--touchtrue--dpr1--after--df786f5e.png)。

## 验证与清理

Chromium完整原生路径/29after状态通过：无上下舞台黑区、位图采样完整、scroll0、真实44px控制可触达。最终本地闸门与独立审查见 [checks.log](checks.log) / [review.log](review.log)。布局好坏仍待协调逐图审查，不把测试通过标成视觉通过。

最终完整Windows WebKit通过，见 [e2e-final-pass.log](e2e-final-pass.log) 与精确清理记录 [final-pass-cleanup.log](final-pass-cleanup.log)。其中新29条当前版本路径和11种宽屏测量均通过；一次补断言时缺少assert导入的调试失败另存，没有当作产品通过。最终源码、静态检查与适用闸门均成功，CI需随后核对提交SHA。

初轮844选角检查错误要求整张高卡片同时可见，导致最后一个配置失败；改为卡片至少44px可见区且实际坐标命中、开始按钮仍须完整可见，保留原生上滑/键盘End，不用DOM click/自动滚入或加长超时。两轮失败日志保留；早期未逐图写metadata的同名PNG由后来完整重拍取代，不称额外历史原图。当前每张记录逐次落盘，异常路径也能保留已完成记录。

首轮完整WebKit的新29状态已通过，但随后既有 `prepareHint` 的精确提示等待超时，原 [e2e-device-hint-timeout.log](e2e-device-hint-timeout.log) 保留。单独重走全部设备提示及11种宽屏回归未复现；只加超时时的视口/目标/实际状态诊断并原样重新走完整闸门，不修改提示条件、输入断言或超时，也不声称已找到这一次失败根因。

第二次完整WebKit通过。随后新增当前版本取证命名回归时，下一次完整运行在旧首木toast用例失败：墙钟3.628秒超出3.55秒上界。游戏原有 `update(dt)` 将每帧时间截到0.05秒，toast在普通帧/受击停顿帧均消耗该帧预算；本轮不改游戏的3.4秒参数或截帧规则。用例改以只读RAF采样预算保留原3.3–3.55秒判定，仍记录墙钟、要求不能过早消失、仅触发一次并自然隐藏。真实坐标激活前等待目标显示、启用且命中它本身，原坐标断言/触摸/键盘继续保留，不自动滚入、不延长超时。

[toast-clock-probes.mjs](toast-clock-probes.mjs) / [toast-clock-targeted.log](toast-clock-targeted.log) 单列普通320/390/1280输入与夹具：普通帧预算约3.386秒、墙钟约3.382秒；隔离浏览器渲染负载夹具中帧预算3.351–3.384秒、墙钟4.450–4.482秒，证明旧墙钟上界会误报；隔离DOM延迟隐藏400ms夹具被时长断言拒绝。两种夹具都不改产品响应、世界、库存或存档，未截图/冒充自然跑。早期响应改3.8秒的尝试被源码哈希闸门先拒绝，**不是时长负例通过**；旧全局DOM原型夹具在激活入口超时，也不是有效负例，失败日志保留。

取证工具当前本地阶段固定默认after，只有显式 `--before` 且产品仍是未修改52195fc父版才允许before，避免提交后clean被误称父版。独立审查发现一次阶段名被公网版本响应变量遮蔽，已改独立phase名，并在e2e检查29条当前路径均含after；错误只发生在未截图的日志试跑，87张既有原图/原始metadata未动。原覆盖检查器只接受DPR1，已按明确DPR验证原生物理尺寸，172/172旧基线、305历史、751补充记录只读覆盖通过，未缩图或跳过高DPR，也不表示全矩阵重拍。

按用户指定 `D:\office\runbooks\agent-temp-resources.md`，每个并行/顺序运行都有新GUID独占 `D:\.tmp\agents\cube-epoch\<id>`；为子进程单独设TEMP/TMP/TMPDIR与缓存、浏览器profile，既有C浏览器二进制只读，无安装。`environment.ps1`/`cleanup.ps1` 和各cleanup日志记录路径/marker/本次PID退出、精确目录清理，有限重试失败会非零拒绝；不清理其他项目/应用/旧目录。证据直接留项目D盘，不先写C Temp。

未覆盖实体设备、原截图精确设备/浏览器配置、强制OS杀进程路径、夜间/结算新原图或新的自然三夜。保留#25及旧诊断；新叠加PR保持开放，不合并、Pages/Tencent发布或修改验收包。
