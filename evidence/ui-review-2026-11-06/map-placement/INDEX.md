# UI-019 快速触屏点图丢失候选

## 正常首局复现与规则区分

矿工真实采树、工作台缺料、选火把缺石、挖(34,16)拾取石头；保持面朝东(dir=2)，玩家约(540,262)、格(33,16)，直接点左侧空地(32,16)，不先转向。没有库存、位置、地图或时间注入。

原版844×390：画布CSS矩形(109.328,54,333.328,199.984)，backing640×384、scale2，镜头约(380,166)。真实点(255.159,156.069)换算逻辑画布约(140,98)、世界(520,264)，确实是(32,16)，在原两格选择范围内。点击前显示面朝候选(34,16)；可信pointerdown/up时瞄准(32,16)，随后可信兼容mouseleave把inside清掉。游戏帧仍有pressed，却退回面朝(34,16)，火把误放，木6→5、石2→1。

修后同输入：兼容mouseleave仍真实发生，inside仍false；待消费触屏点击保留有效点图瞄准，实际放(32,16)，木5→4、石3→2，(34,16)保持挖出的泥地。角色仍面朝东，未强制转向。原图不加点位覆盖层，精确点坐标、事件时间、可信标志、画布映射、显示候选、实际消费候选、库存见[逐次行为](validation.json)和[真实输入日志](after.log)。

**既定近身规则不改：** aimTile可直接选两格内的点；超过两格时沿有效点图方向取14像素近身候选，不是无条件取角色朝向。本轮实际验点(36,16)→近身(34,16)，栅栏扣木1；点(29,16)→已占用(32,16)，不扣料；两格内(31,16)开田扣原木1。后两项含明确合成兼容mouseleave边界事件，不冒称全部自然浏览器事件。

产品只增加触屏待消费标记，共享给aimTile/facingTile；帧消费、hitstop丢弃、reset、取消/失去捕获及桌面mousedown清理。aimVec、两格阈值/14像素规则、放置条件、资源优先、成品优先、配方、键鼠/移动/攻击、昼夜、胜负、存档结构不改。

## 16张同状态原图

| 真实视口 | 原版点击前 | 原版点击后 | 修后点击前 | 修后点击后 |
|---|---|---|---|---|
| 320×568触控 | [前](images/map-before-tap--320x568--before--4f1d7f51.png) | [后](images/map-after-tap--320x568--before--4f1d7f51.png) | [前](images/map-before-tap--320x568--after--a044aefa.png) | [后](images/map-after-tap--320x568--after--a044aefa.png) |
| 390×844触控 | [前](images/map-before-tap--390x844--before--4f1d7f51.png) | [后](images/map-after-tap--390x844--before--4f1d7f51.png) | [前](images/map-before-tap--390x844--after--a044aefa.png) | [后](images/map-after-tap--390x844--after--a044aefa.png) |
| 844×390触控 | [前](images/map-before-tap--844x390--before--4f1d7f51.png) | [后](images/map-after-tap--844x390--before--4f1d7f51.png) | [前](images/map-before-tap--844x390--after--a044aefa.png) | [后](images/map-after-tap--844x390--after--a044aefa.png) |
| 1280×800键鼠 | [前](images/map-before-tap--1280x800--before--4f1d7f51.png) | [后](images/map-after-tap--1280x800--before--4f1d7f51.png) | [前](images/map-before-tap--1280x800--after--a044aefa.png) | [后](images/map-after-tap--1280x800--after--a044aefa.png) |

Web/Chromium，zh-CN、DPR1、100%、原生首屏，未缩放或拼图。320/390本次原版正常输入没有出现兼容mouseleave误放，保留通过状态，不伪造失败。桌面原版/修后均点中(32,16)。关键44px核心触控首屏可达、scroll=(0,0)，原白天次说明限高/内滚未改。

**来源严格区分：** 普通玩家首局路径加只读调试观测桥，非纯净生产字节；桥只读取输入/候选，并记录帧消费和原绘制候选，不改输入事件、规则或渲染。仅拍图时暂停模拟。前图从Git a510ac1200163f88e5579d888df8ea772a38c57b内存提供，未切换/覆盖工作区；后图同HEAD+game.js dirty。未经观测桥的产品字节哈希前`4f1d7f51868a67b11a0003ac5454b9758e62b1c85c72c5b52a46fe5e66430145`，后`a044aefa5d053ba7b9cc566b8a4ffa4614478149c7b33a481eb88a7f9eb4542a`；实际带桥服务字节另列每张[截图记录](screenshots.json)的source_sha256，不冒称生产字节截图或把拍摄SHA改成将来的提交号。

## 检查与限制

[检查记录](checks.log) · [原版事件](before.log) · [修后事件/范围/取消](after.log) · [完整本地集成](integration.log)。

Chromium方向/攻击长按为原生CDP，背包/地图为原生tap；WebKit集成长按为键盘、触屏按钮为原生tap，桌面为真键鼠。独立320合成pointercancel/lostpointercapture/blur边界配真实tap，验证无消费、无库存变化与无残留pending；这些是事件生命周期夹具，不是自然系统切后台或真机手势。旧正常放置/修墙/资源优先等适用集成覆盖复用，不重打自然三夜或重拍全界面。

16图待协调逐图审查，非真机/全量视觉通过。只修真实点图候选丢失，不保证所有浏览器工具栏/手势/并发输入均验收；白天次说明裁切不是本片整改。保留PR15/a510及旧候选、natural-loop本地结果和旧CI本地记录。不合并、不发布Pages/腾讯云、不改服务器。
