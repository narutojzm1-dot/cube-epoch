# UI-018 补料后放置成功的反馈

## 真实首局依据与最小修改

正常矿工新局，真实触控采集(25,22)树并拾取木头；正常走到工作台交互，得到正确的“还差：石5、金3、麦3”。再走到(33,16)矿旁选火把、点空地，得到正确的“材料还差：石1”。挖(34,16)石头并拾取后成功放火把，实际扣1木1石，但c6165ae仍显示刚才的“材料还差：石1”。缺料数量本来正确，**本片不重复修改缺口文案或获取路线**，只修成功后保留错误反馈。

game.js只加一个两行else分支：火把成功“火把放好了。”、田成功“田开好了。”、营地已围好时普通栅栏成功“栅栏放好了。”。保留原“四边围好了”和“还差n面”围营进度分支。原配方、成品优先消耗、修墙、放置条件、采集、输入、昼夜、胜负、存档均不改；夜战折叠及44px核心布局不改。

## 原图

23张Web/Chromium真实首屏原图，zh-CN、DPR1、100%、full_page=false。逐项screen_id/state/viewport/language/build/source/path/repro/issue/status及画布、控件、反馈矩形见 [screenshots.json](screenshots.json)。

| 视口 | 正常补料后火把成功：前 | 后 | 原正确缺石提示（复用前图） |
|---|---|---|---|
| 320×568触屏 | [前](images/torch-success--320x568--before--73fa0632.png) | [后](images/torch-success--320x568--after--4f1d7f51.png) | [缺石](images/torch-shortage--320x568--before--73fa0632.png) |
| 390×844触屏 | [前](images/torch-success--390x844--before--73fa0632.png) | [后](images/torch-success--390x844--after--4f1d7f51.png) | [缺石](images/torch-shortage--390x844--before--73fa0632.png) |
| 844×390触屏 | [前](images/torch-success--844x390--before--73fa0632.png) | [后](images/torch-success--844x390--after--4f1d7f51.png) | [缺石](images/torch-shortage--844x390--before--73fa0632.png) |
| 1280×800键鼠 | [前](images/torch-success--1280x800--before--73fa0632.png) | [后](images/torch-success--1280x800--after--4f1d7f51.png) | 已有触屏缺石图复用，不额外重拍 |

上述11张是**正常输入路径，无库存/位置/地图/时间注入**；仅拍图时暂停模拟。真实树木/石头掉落会随机，数量不同不伪装成配方变化。[前后正常输入与实际库存](validation.json)各4路径，工作台拒绝和火把拒绝均不扣料；成功严格扣1木1石，生命、篝火不变且仍第一天。

下述12张是**明确夹具**，不是自然采集/围营：正常选角色后注玩家(30,25)面东、(31,25)草地及库存；农夫免费田库存全0，矿工栅栏仅木1/成栏0并注营地四面满血墙。真实开背包、选项和点图，成功不改原成本；仅原图时暂停。

| 视口 | 农夫免费开田前 | 后 | 已围营普通栅栏前 | 后 |
|---|---|---|---|---|
| 320×568 | [前](images/free-plot--320x568--before--73fa0632.png) | [后](images/free-plot--320x568--after--4f1d7f51.png) | [前](images/surrounded-fence--320x568--before--73fa0632.png) | [后](images/surrounded-fence--320x568--after--4f1d7f51.png) |
| 390×844 | [前](images/free-plot--390x844--before--73fa0632.png) | [后](images/free-plot--390x844--after--4f1d7f51.png) | [前](images/surrounded-fence--390x844--before--73fa0632.png) | [后](images/surrounded-fence--390x844--after--4f1d7f51.png) |
| 844×390 | [前](images/free-plot--844x390--before--73fa0632.png) | [后](images/free-plot--844x390--after--4f1d7f51.png) | [前](images/surrounded-fence--844x390--before--73fa0632.png) | [后](images/surrounded-fence--844x390--after--4f1d7f51.png) |

前正常图为c6165aed7dc2548986a43150a36b45356349472e未改产品；前夹具图从同Git版本内存提供game.js，严格校验字节哈希，未切换/覆盖工作区。before served-byte SHA256均 `73fa0632bd1c368e6eb0811360109e9f7f76f3b4501c3f2f7ca61386bb49ab9c`。后图拍于同HEAD加本片game.js dirty，hash `4f1d7f51868a67b11a0003ac5454b9758e62b1c85c72c5b52a46fe5e66430145`；不改写拍摄版本为之后的提交号。

## 检查与诚实限制

[适用检查](checks.log) · [正常路径/原生触控结果](normal-checks.log) · [一次现有完整WebKit集成](integration.log)。新测试还用六个独立夹具验证成火把优先、免费田、成田优先、已围营栅栏、原围营进度文案及缺石拒绝；与正常采集路径分开。Chromium触屏长按为原生CDP start/end，WebKit集成长按为键盘、触屏按钮为真tap，不冒称键盘是触控。反馈短句完整可见、44px核心控制首屏可命中、scroll=(0,0)；不重打自然三夜或重拍旧图集。

**另行观察、未修复：** 844正常挖石后立即向左点图，两次探查实际将火把放在面前刚挖出的(34,16)，而非点击的(32,16)；库存仍正确扣1木1石。尚未定位这一输入现象，本片没有修改输入代码，也不把它称为已修好。最终正常路径使用普通方向按钮先转向预留空地再点图；因此不外推任意朝向的点图准确性。完整失败现场摘要保存在checks.log，后续可针对该实际输入问题独立调查。

23图待协调人逐图审查，不代表真机/全量视觉通过。田/已围营栅栏未额外拍桌面，触屏三视口有同状态前后；正常素材缺料正确图复用、不重复做文案。白天详情/建造次说明仍按原限高区域内滚动，原裁切边界不在本片重构。保护PR14/c616基线、旧候选、natural诊断及本地LinuxCI记录；不合并、不发布Pages/腾讯云，不改变服务器。
