# UI-037 夜间补给到清晨种植指南衔接

**44张Web原尺寸图**：320x568/390x844、中文、DPR1、UI100%。优先看下表前4张库存逐项完全相同的指南前后图；另40张是真实未改RNG击杀/拾种或麦、正常清晨、播种/原15秒成长/采收或工作台实际扣料的链路图。不是实体手机或完整自然三夜通关，视觉待用户/父协调逐图确认。

## 确证问题与唯一产品修复

第3清晨缺麦、有种且无苗，金框已正确指空田、顶部显示缺麦，展开教程却仍写去工作台合成；播种后/成熟后同样与金框下一动作冲突。仅在三夜后白天、其他材料齐/营墙齐/无心/缺麦时，现有指南正文和桌面此刻提示复用当前目标，分别提示金框空田播种、麦苗还在长/成熟再收、金框麦旁收麦。材料就绪工作台与已有心祭坛优先保持；目标逻辑、顶栏、配方、库存、墙、地图、输入、时间/波次、胜负/存档均未改。

基线`1ad39a6a8d129ae182c98384434b4e020da7252d`；before是该Git版本，after是该HEAD+dirty，产品字节SHA256`8a11563f643d72a9ab41d5282b80a6e29b1cfb7e76704d21bd401b01c4df8f19`。未来提交不倒填原图。每图实际CSS画布/控件/触点/时间/源码与复现见[screenshots.json](screenshots.json)；库存与成本简表见[validation.json](validation.json)，原始输入全量在两个raw_records。

## 自然输入与前置分开

原耗尽快照地形/四墙/空苗、缺麦1或2是明示前置，第三夜末波结束、20HP零速零伤害史莱姆。前11、后15个隔离样本都用真实CDP触控杀一只、原随机掉落并实际拾取，未得到所需物资的样本同样留存，不改RNG/掉率或成功链库存。成功8条链从夜间正常跨32秒边界，未暂停/改时钟，真实展开/取消栅栏、播种/等成熟/收麦，或沿原路线到工作台扣木4石5金3麦3合成，心1金框祭坛。

自然前后随机麦/木/金可能不同，均缺麦+种1等相同条件，不能假称数值全相同；所以补4张相同库存指南配对图，库存/位置逐项取自真实before拾种记录，明确重放第三夜末1.5秒后正常跨晨/点开，并非再自然打怪。原自然40图不刷掉、不伪造库存。

WebKit稳定回归用已证存在的种/麦掉落前置，真实移动后原吸引拾取、正常清晨；不将固定掉落当自然概率证据，也不把触控视口的键盘长按fallback称原生手机长按。原长按收麦后的自动重播保持，记录实际结果。

## 检查/失败/保留

[静态](static.log)、[新WebKit](webkit-final.log)、[完整原WebKit](e2e.log)、[独立审查](review.log)。两次新夹具失败有实际坐标/时间：格外误朝向、长路超过新输入wall预算；只改格内原生调位和分段原生移动，不改原首夜断言/预算或产品规则，失败日志保留。旧#25–33、旧dirty诊断不混入提交。当前旧全界面矩阵只读复用，未新增横屏/桌面原图/实体安全区；不合并、Pages/CD或腾讯云均不操作。本片独占D根逐次关闭进程/清理，见cleanup日志。

## 逐图清单

| screen_id/state | 阶段 | 视口 | 原图 | status |
|---|---|---|---|---|
| paired-guide | before | 320x568 | [原图](images/paired-guide--320x568--before.png) | 已截，待审 |
| paired-guide | after | 320x568 | [原图](images/paired-guide--320x568--after.png) | 已截，待审 |
| paired-guide | before | 390x844 | [原图](images/paired-guide--390x844--before.png) | 已截，待审 |
| paired-guide | after | 390x844 | [原图](images/paired-guide--390x844--after.png) | 已截，待审 |
| seed-picked-night | before | 320x568 | [原图](images/seed-picked-night--320x568--before--37c84035.png) | 已截，待审 |
| seed-dawn | before | 320x568 | [原图](images/seed-dawn--320x568--before--37c84035.png) | 已截，待审 |
| seed-guide | before | 320x568 | [原图](images/seed-guide--320x568--before--37c84035.png) | 已截，待审 |
| seed-build-selected | before | 320x568 | [原图](images/seed-build-selected--320x568--before--37c84035.png) | 已截，待审 |
| seed-growing | before | 320x568 | [原图](images/seed-growing--320x568--before--37c84035.png) | 已截，待审 |
| seed-ripe | before | 320x568 | [原图](images/seed-ripe--320x568--before--37c84035.png) | 已截，待审 |
| seed-harvested | before | 320x568 | [原图](images/seed-harvested--320x568--before--37c84035.png) | 已截，待审 |
| wheat-picked-night | before | 320x568 | [原图](images/wheat-picked-night--320x568--before--37c84035.png) | 已截，待审 |
| wheat-dawn-ready | before | 320x568 | [原图](images/wheat-dawn-ready--320x568--before--37c84035.png) | 已截，待审 |
| wheat-crafted | before | 320x568 | [原图](images/wheat-crafted--320x568--before--37c84035.png) | 已截，待审 |
| seed-picked-night | before | 390x844 | [原图](images/seed-picked-night--390x844--before--37c84035.png) | 已截，待审 |
| seed-dawn | before | 390x844 | [原图](images/seed-dawn--390x844--before--37c84035.png) | 已截，待审 |
| seed-guide | before | 390x844 | [原图](images/seed-guide--390x844--before--37c84035.png) | 已截，待审 |
| seed-build-selected | before | 390x844 | [原图](images/seed-build-selected--390x844--before--37c84035.png) | 已截，待审 |
| seed-growing | before | 390x844 | [原图](images/seed-growing--390x844--before--37c84035.png) | 已截，待审 |
| seed-ripe | before | 390x844 | [原图](images/seed-ripe--390x844--before--37c84035.png) | 已截，待审 |
| seed-harvested | before | 390x844 | [原图](images/seed-harvested--390x844--before--37c84035.png) | 已截，待审 |
| wheat-picked-night | before | 390x844 | [原图](images/wheat-picked-night--390x844--before--37c84035.png) | 已截，待审 |
| wheat-dawn-ready | before | 390x844 | [原图](images/wheat-dawn-ready--390x844--before--37c84035.png) | 已截，待审 |
| wheat-crafted | before | 390x844 | [原图](images/wheat-crafted--390x844--before--37c84035.png) | 已截，待审 |
| seed-picked-night | after | 320x568 | [原图](images/seed-picked-night--320x568--after--cebba2e9.png) | 已截，待审 |
| seed-dawn | after | 320x568 | [原图](images/seed-dawn--320x568--after--cebba2e9.png) | 已截，待审 |
| seed-guide | after | 320x568 | [原图](images/seed-guide--320x568--after--cebba2e9.png) | 已截，待审 |
| seed-build-selected | after | 320x568 | [原图](images/seed-build-selected--320x568--after--cebba2e9.png) | 已截，待审 |
| seed-growing | after | 320x568 | [原图](images/seed-growing--320x568--after--cebba2e9.png) | 已截，待审 |
| seed-ripe | after | 320x568 | [原图](images/seed-ripe--320x568--after--cebba2e9.png) | 已截，待审 |
| seed-harvested | after | 320x568 | [原图](images/seed-harvested--320x568--after--cebba2e9.png) | 已截，待审 |
| wheat-picked-night | after | 320x568 | [原图](images/wheat-picked-night--320x568--after--cebba2e9.png) | 已截，待审 |
| wheat-dawn-ready | after | 320x568 | [原图](images/wheat-dawn-ready--320x568--after--cebba2e9.png) | 已截，待审 |
| wheat-crafted | after | 320x568 | [原图](images/wheat-crafted--320x568--after--cebba2e9.png) | 已截，待审 |
| seed-picked-night | after | 390x844 | [原图](images/seed-picked-night--390x844--after--cebba2e9.png) | 已截，待审 |
| seed-dawn | after | 390x844 | [原图](images/seed-dawn--390x844--after--cebba2e9.png) | 已截，待审 |
| seed-guide | after | 390x844 | [原图](images/seed-guide--390x844--after--cebba2e9.png) | 已截，待审 |
| seed-build-selected | after | 390x844 | [原图](images/seed-build-selected--390x844--after--cebba2e9.png) | 已截，待审 |
| seed-growing | after | 390x844 | [原图](images/seed-growing--390x844--after--cebba2e9.png) | 已截，待审 |
| seed-ripe | after | 390x844 | [原图](images/seed-ripe--390x844--after--cebba2e9.png) | 已截，待审 |
| seed-harvested | after | 390x844 | [原图](images/seed-harvested--390x844--after--cebba2e9.png) | 已截，待审 |
| wheat-picked-night | after | 390x844 | [原图](images/wheat-picked-night--390x844--after--cebba2e9.png) | 已截，待审 |
| wheat-dawn-ready | after | 390x844 | [原图](images/wheat-dawn-ready--390x844--after--cebba2e9.png) | 已截，待审 |
| wheat-crafted | after | 390x844 | [原图](images/wheat-crafted--390x844--after--cebba2e9.png) | 已截，待审 |
