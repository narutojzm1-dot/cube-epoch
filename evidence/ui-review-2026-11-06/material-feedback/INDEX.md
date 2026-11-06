# UI-008 材料缺口反馈

独立追加批次：保留产品a342ef0、证据d80f0e8及原自然三夜记录。本片只修正缺料文案，不改变成本、资源、节奏或胜负。
36张原图：9状态×320×568/390×844×前后。Web/WebKit，中文，100%缩放、DPR1，均为真实首屏，不是全页缩图。
前图route提供d80f0e8原源码；后图为工作区实际源码，SHA/dirty/产品字节hash逐项记录。
全部为隔离fixture：库存和目标格明确注入；操作走正常选角、详情选择、原生触屏点击和交互。只在截图时冻结模拟，不接触用户存档。
核心修正：法师栅栏需2木，已有1木时，从「材料不够：木2」改为「材料还差：木 1」。
方块之心原缺口算法已正确，抽取成共享格式规则后文案保持不变；修墙仍消耗1木，缺料时明确「修墙还差：木 1」。

| 状态 | 视口 | 前原图 | 后原图 |
|---|---|---|---|
| fence-partial | 320×568 | [原图](images/fence-partial--320x568--before--2d9abdc5.png) | [原图](images/fence-partial--320x568--after--e30ac7d8.png) |
| fence-partial | 390×844 | [原图](images/fence-partial--390x844--before--2d9abdc5.png) | [原图](images/fence-partial--390x844--after--e30ac7d8.png) |
| fence-zero | 320×568 | [原图](images/fence-zero--320x568--before--2d9abdc5.png) | [原图](images/fence-zero--320x568--after--e30ac7d8.png) |
| fence-zero | 390×844 | [原图](images/fence-zero--390x844--before--2d9abdc5.png) | [原图](images/fence-zero--390x844--after--e30ac7d8.png) |
| fence-enough | 320×568 | [原图](images/fence-enough--320x568--before--2d9abdc5.png) | [原图](images/fence-enough--320x568--after--e30ac7d8.png) |
| fence-enough | 390×844 | [原图](images/fence-enough--390x844--before--2d9abdc5.png) | [原图](images/fence-enough--390x844--after--e30ac7d8.png) |
| torch-zero | 320×568 | [原图](images/torch-zero--320x568--before--2d9abdc5.png) | [原图](images/torch-zero--320x568--after--e30ac7d8.png) |
| torch-zero | 390×844 | [原图](images/torch-zero--390x844--before--2d9abdc5.png) | [原图](images/torch-zero--390x844--after--e30ac7d8.png) |
| repair-zero | 320×568 | [原图](images/repair-zero--320x568--before--2d9abdc5.png) | [原图](images/repair-zero--320x568--after--e30ac7d8.png) |
| repair-zero | 390×844 | [原图](images/repair-zero--390x844--before--2d9abdc5.png) | [原图](images/repair-zero--390x844--after--e30ac7d8.png) |
| repair-enough | 320×568 | [原图](images/repair-enough--320x568--before--2d9abdc5.png) | [原图](images/repair-enough--320x568--after--e30ac7d8.png) |
| repair-enough | 390×844 | [原图](images/repair-enough--390x844--before--2d9abdc5.png) | [原图](images/repair-enough--390x844--after--e30ac7d8.png) |
| craft-partial | 320×568 | [原图](images/craft-partial--320x568--before--2d9abdc5.png) | [原图](images/craft-partial--320x568--after--e30ac7d8.png) |
| craft-partial | 390×844 | [原图](images/craft-partial--390x844--before--2d9abdc5.png) | [原图](images/craft-partial--390x844--after--e30ac7d8.png) |
| craft-zero | 320×568 | [原图](images/craft-zero--320x568--before--2d9abdc5.png) | [原图](images/craft-zero--320x568--after--e30ac7d8.png) |
| craft-zero | 390×844 | [原图](images/craft-zero--390x844--before--2d9abdc5.png) | [原图](images/craft-zero--390x844--after--e30ac7d8.png) |
| craft-enough | 320×568 | [原图](images/craft-enough--320x568--before--2d9abdc5.png) | [原图](images/craft-enough--320x568--after--e30ac7d8.png) |
| craft-enough | 390×844 | [原图](images/craft-enough--390x844--before--2d9abdc5.png) | [原图](images/craft-enough--390x844--after--e30ac7d8.png) |

## 检查与限制

- [逐图复现、构建与实际画布/控件尺寸](screenshots.json) · [30个后版本场景](validation.json) · [真实检查输出](checks.log)。
- 部分/零/足够库存、现成栅栏优先、法师火把免石、农夫免费田、修墙固定1木及已有心不再扣料，均有针对性断言。
- 原生点击不滚页面、无按键保持；反馈区保持60px限高，缺口文本完整可见，画布与≥44px核心控件首屏可达且未被反馈盖住。
- 初次截图执行等待超时；后续记录确认一次立即点画布未被处理，消息仍是建造选择。测试现让原生详情toggle输入重置与渲染完成后再点画布，不修改游戏输入规则；失败记录保留在checks.log及会话输出。
- 36图及场景断言完成后，索引拼接引用缺失的version字段报错。现改用已记录state并从原元数据恢复INDEX，不重拍、不改图；归档错误与游戏检查分开记录。
- 只新增320/390缺料对照；桌面/横屏等未变布局复用原批次，适用e2e覆盖四视口。本片不代表全界面重新截图、真机体验或自然三夜再通关。
- 视觉状态：待用户/协调人实际逐图复看；自动检查不等于视觉通过。未合并或发布腾讯云/Pages。
