# UI-015 明确开启声音时恢复AudioContext

实际依据：b292b98只在进入游戏时ensureAudio；cycleAudio仅改开关/增益。正常骑士320首局，调用真实原生AudioContext.suspend模拟浏览器挂起，再真实点声音按钮：仅音效、静音、声音开三标签切换正确，但上下文一直suspended、currentTime固定。随后原生点技能，原骑士SFX振荡器已创建但未执行到ended。不是猜测网络/音频设备问题。

产品仅加一行：当用户切换后音乐或音效开启时复用ensureAudio，再执行原setMusicLevel。恢复现有上下文和底音，不重新建图；静音不触发恢复。保持原「声音开→仅音效→静音→声音开」循环、音乐0.26/底音0.05增益、技能音效及内容。不新增静音到仅音效的快捷入口、不自动取消静音、不改玩法/音量/节奏/存档。

14张原图：320×568、390×844、844×390触屏，仅音效/声音开 × 前后12张；1280×800桌面声音开前后2张。Web/Chromium，中文zh-CN，DPR1、100%缩放、full_page=false，真实首屏原图。实际画布及backing精确矩形保留在[screenshots.json](screenshots.json)，游戏逻辑视口320×192。

前图是真实b292b98未改产品，served-byte SHA256 `295f970e60da09f874f7fcbf0df3f33cd8f04f5846c42523431f74f50817db5c`；后图是同SHA加本片game.js dirty，hash `d52f5123fa405b3cc70d52076ecbadbbb438d1682df433b62627b0d6cf2945a3`。模型连接中断前已拍完/验证，恢复后当前源码哈希完全一致，复用原图和已过检查，不重拍或重跑。

| 状态 / 视口 | 前原图 | 后原图 |
|---|---|---|
| 仅音效 / 320触屏 | [前](images/sfx-resume--320x568--before--295f970e.png) | [后](images/sfx-resume--320x568--after--d52f5123.png) |
| 声音开 / 320触屏 | [前](images/all-resume--320x568--before--295f970e.png) | [后](images/all-resume--320x568--after--d52f5123.png) |
| 仅音效 / 390触屏 | [前](images/sfx-resume--390x844--before--295f970e.png) | [后](images/sfx-resume--390x844--after--d52f5123.png) |
| 声音开 / 390触屏 | [前](images/all-resume--390x844--before--295f970e.png) | [后](images/all-resume--390x844--after--d52f5123.png) |
| 仅音效 / 844横屏 | [前](images/sfx-resume--844x390--before--295f970e.png) | [后](images/sfx-resume--844x390--after--d52f5123.png) |
| 声音开 / 844横屏 | [前](images/all-resume--844x390--before--295f970e.png) | [后](images/all-resume--844x390--after--d52f5123.png) |
| 声音开 / 1280桌面 | [前](images/all-resume--1280x800--before--295f970e.png) | [后](images/all-resume--1280x800--after--d52f5123.png) |

图片中的设置标签原来就正确，因此**图片本身不能证明声音恢复或听感**。实际行为看[validation.json](validation.json)：前后各12记录、四真实视口。Chromium使用原生AudioContext/增益/振荡器，只记录对象，未伪造API或音源；实际suspend为明示测试夹具，不修改游戏时钟/资源/位置/胜负。原生触屏点声音/技能，桌面M/Q。

| 行为 | 修前 | 修后 |
|---|---|---|
| 挂起后明确启用仅音效 | suspended，时钟不走 | running，时钟推进 |
| 骑士实际技能SFX | 创建1个原音效节点，ended=false | 同原音效节点执行完成，ended=true |
| 再挂起后切静音 | 保持suspended | 同样保持suspended，不恢复 |
| 静音再切声音开 | suspended | running，时钟推进 |
| 上下文/增益 | 1个上下文；原设置增益 | 仍1个；仅音效音乐/底音0，声音开0.26/0.05 |

例如320前两态currentTime都为0.312，修后仅音效0.3306667、声音开0.5306667；四视口技能ended记录均由false变true。游戏库存/生命不变，首屏无滚动、声音按钮与核心触点≥44px，真实点按及释放不留下held。

**当前本地WebKit不提供AudioContext或webkitAudioContext**，原生构造探查报TypeError/undefined constructor。这不是Chromium恢复失败，也不能算WebKit原生恢复通过。现有WebKit e2e明确输出AUDIO_NATIVE_UNAVAILABLE，只检查原按钮循环、技能正常触发、无API时原静音降级不报错；没有伪造音频API来拿绿。Chromium的实际原生验证单独运行并记录。

[原始检查/环境差异/恢复记录](checks.log)。语法/静态、Chromium原生行为、一次现有完整e2e及独立只读审查均已通过，代码未变后全部复用。未重新打自然三夜或重拍旧图集；旧172基线/305历史和旧片原图保留，累计追加372图仅表示文件覆盖。

**仍待协调人审查；未真机听感/扬声器输出、实际切后台/来电或有Web Audio的Safari验收。** 不用截图/ended事件冒充耳听验证；系统持续禁止播放时不能承诺能绕过浏览器/OS限制。旧a342候选、PR6–11、用户存档和本地natural诊断保持；不合并、不发布Pages/腾讯云。
