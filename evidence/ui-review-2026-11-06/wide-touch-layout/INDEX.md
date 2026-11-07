# UI-010 宽屏粗指针核心首屏

原01f5c71宽屏粗指针边界：正常首屏控件低于视口，原生选栏使页面滚动；先在未修改产品上真实截图/量矩形，不将其误称文案片引入。
1280×800五状态前后10图，加320/390/1280鼠标/844横屏4张选栏抽样后图；仅补本片，不重拍旧76或全基线。
实际touchLayout/输入、源码SHA/dirty/hash、scroll和画布/44px控件矩形逐项记录；Web/WebKit100%缩放DPR1真实首屏。

| 宽屏触控状态 | 前原图 | 后原图 |
|---|---|---|
| first-day | [原图](images/first-day--1280x800--touch--before--fc0bf115.png) | [原图](images/first-day--1280x800--touch--after--089fda92.png) |
| selected | [原图](images/selected--1280x800--touch--before--fc0bf115.png) | [原图](images/selected--1280x800--touch--after--089fda92.png) |
| details-open | [原图](images/details-open--1280x800--touch--before--fc0bf115.png) | [原图](images/details-open--1280x800--touch--after--089fda92.png) |
| cancelled | [原图](images/cancelled--1280x800--touch--before--fc0bf115.png) | [原图](images/cancelled--1280x800--touch--after--089fda92.png) |
| third-night | [原图](images/third-night--1280x800--touch--before--fc0bf115.png) | [原图](images/third-night--1280x800--touch--after--089fda92.png) |

## 未变布局抽样

- 1280×800 mouse/keyboard：[原图](images/selected--1280x800--mouse--after--089fda92.png)
- 390×844 native touch：[原图](images/selected--390x844--touch--after--089fda92.png)
- 320×568 native touch：[原图](images/selected--320x568--touch--after--089fda92.png)
- 844×390 native touch：[原图](images/selected--844x390--touch--after--089fda92.png)

## 验证与限制

- [逐图来源/实测](screenshots.json) · [前后矩形及实际输入](validation.json) · [检查/独立审查](checks.log)。
- CSS仅分配宽屏粗指针空间，保留5:3真实画布和44px核心触点；无玩法/成本/输入判定改动。
- 详情仍按需主动展开并可内部滚动，展开时覆盖部分主操作是既有面板行为；选择栏/关闭后回到核心首屏，不新增自动暂停。
- 选栏/同项取消使用原生输入；缩放后实际点地图放栏、交互/技能有针对性验证，其他四视口与原矩形直接对比。
- 普通首日/详情与注入建设/第三夜分开标识；不动用户存档，不重打自然三夜，不代表真机或视觉批准。
- 使用独立子分支/堆叠PR保留原PR6，不因推原分支而主动取消它的CI；不合并、不部署Pages/腾讯云。
- 最终 `npm test`、`node --check game.js` 与只读覆盖检查通过：84设备提示、11宽屏矩形/实际输入场景；不重拍旧图。独立只读 reviewer 未发现重要问题。原生双指采集/释放验证通过；手动关闭详情及再次选栏不滚动。协调人尚未复看本批原图，不标视觉通过。
