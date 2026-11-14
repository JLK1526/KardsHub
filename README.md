# 2026-11-14

## KARDS 风格网页卡牌游戏（新建）
- 纯静态前端、无外部依赖：`index.html` + `css/style.css` + `js/{cards,art,game}.js`
- 卡池按要求仅收录德国 / 美国 / 英国（各 12 种，按费用权重铺成 30 张卡组）；卡面插画用程序化 SVG 二战宣传画风格生成，按卡牌 id 定种子，离线可用——未调用图像生成，避免额外积分消耗
- 开始页：8 条规则说明 + 低/中/高难度 + 阵营选择；游戏页：双方 HQ、三条战线、手牌、指挥点槽、战斗日志、结束回合、胜负结算
- 机制：指挥点槽每回合 +1（上限 12）、部署费/行动费双数值、支援线 4 格 / 前线 5 格、单方控制前线、闪击/守护/空降/防空、疲劳伤害、HQ 20 血
- 难度差异：AI 总部 16/20/25；高难度额外起始指挥点槽 + 每回合多抽 1 张 + 更优决策；中高难度 AI 会预留 2 点指挥点给行动
- 两个关键修复：① AI 原本把指挥点全花在铺场导致双方无费用进攻（13 回合零伤害僵局）；② 前线的飞机允许被地面单位攻击，避免单机永久锁死前线
- 验证方式：Edge headless + CDP 驱动真实点击和 13 回合自动对局，零运行时异常；三档难度参数、菜单往返、胜负弹窗均通过

## 修复：悬停预览过大 + 场上卡牌溢出槽位
- 症状：预览 207×304px 遮挡战场；矮屏（720px 高）槽位仅 118.7px 而场上卡固定 135.2px，纵向溢出 16.5px
- 方案：`.slot` 设 `container-type:size`，场上卡用 `--cw:min(92px, 61cqh)` 按槽位高度等比缩放（旧浏览器回退 92px）；删掉 `.field-unit .card` 里重复的固定 `--cw`；窄屏规则同步改用 `min(80px, 61cqh)`
- 新增 `@media (max-height:820px)` 压缩手牌区（190→166px）把高度让给战场；预览从 230px 缩到 158px，改为跟随鼠标并始终收在 `.bottom-zone` 之上
- 预览交互顺带修掉 hover 在卡内子元素间移动时的闪烁（mouseout 检查 relatedTarget、按 cardId 缓存避免重复重建）
- 复测：900px 高卡比框小 17.5px；720px 高卡比框小 14.9px（由溢出 16.5px 转为内缩）；预览在视口内且不盖手牌/HQ；真实鼠标点击部署成功，零异常

## 新增：经典 / 现代 UI 主题切换
- 左上角两处切换按钮（游戏界面 top-bar 内 + 开始界面固定左上角），点击在两套主题间切换，按钮文字显示目标主题，选择存 localStorage（key: kards-theme）并在加载时恢复
- 实现方式：`body.theme-modern` + style.css 末尾约 230 行覆盖层，HTML/JS 渲染逻辑零改动，卡面 SVG 插画两套主题共用
- 现代 UI 设计：深蓝黑底（#0f1420）+ 蓝图网格、青蓝主色（#5b8dff）、圆角 14px 面板、深色现代卡面（深蓝卡底白字、蓝紫渐变费用徽章、去掉纸纹噪点）、玻璃感槽位与发光前线带、现代胶囊按钮；国家识别色在主题内重新映射
- 顺带把牌库数字的内联金色样式挪进样式表，否则主题切换盖不住
- 验证：开始页/游戏页双向切换、两处按钮文字同步、刷新后从 localStorage 恢复，均通过且零异常

## 新增：指挥点=0 自动结束回合
- 统一入口 `afterKreditSpent(side)`：在 playCard / moveUnit / attack 结算后调用；玩家侧 kredit<=0 时 `scheduleAutoEnd()` 延迟 700ms 调用 endTurn，期间显示提示并写日志。AI 侧不调度，改为 runAI 三个循环加 `S.p[side].kredit > 0` 条件提前收尾
- 豁免条件：S.over、非玩家回合、phase='target' 或 S.pending（等选完目标，在 spell 分支与「点空白取消 / Esc 取消」后补调 afterKreditSpent）、等待期间 kredit 又 >0。`kredit` 效果（加指挥点指令）会 cancelAutoEnd
- `clearSelection()` 在 autoEndScheduled 时保留提示，避免被后续重绘清掉
- 顺带修复跨局异步污染：新增全局 `gameSeq` / `S.gen` 与 `S.aiTimer`；startNewGame 开头先 cancelAutoEnd + clearTimeout(aiTimer)，runAI(gen) 用 `alive()` 在每个 await 后校验局代号，避免重新开局后旧定时器串到新对局（曾导致回合数被提前推进）
- 验收：8 组场景（正常不触发 / 花光自动结束 / 加费卡 / 选目标豁免 / 取消选目标 / 手动提前结束防重复 / Esc 取消 / 游戏结束）全部通过，零异常

## 新增：站点图标 favicon
- 手绘 `favicon.svg`（深绿圆角底 + 黄铜双环 + 直臂铁十字 + 中心黄铜点，与游戏内德国徽记风格一致），并用无头浏览器把 SVG 渲染成 128×128 的 `favicon.png` 作兜底，两文件均在根目录
- index.html head 加入 `<link rel="icon" type="image/svg+xml">` + `<link rel="icon" type="image/png">`
- 注意：HTML 会被外部预览工具重写（加 data-page-node-id、title 被用户改为「模拟器」），编辑前必须重新 Read

## 重做：站点图标改现代扁平风（用户连否两版）
- 用户否掉 ① 初版手绘黄铜双环直臂铁十字（"简陋"）② ImageGen 生成的金属浮雕徽章（繁复古典 + 右下"AI生成"水印）；明确要求「符合现代人审美，但保留一点经典的感觉」
- 结论：这类几何图标优先手工矢量，可控、无水印、不耗积分，比 AI 生成更贴现代 UI 风格
- 默认 `favicon.svg/png`：深蓝渐变圆角底（#1d3057→#080e1e + 青蓝光晕，呼应现代 UI 主题）+ 米色纸卡与黄铜金后卡叠层（旋转 -8°/+12°）+ 卡内深绿几何铁十字（中心米色菱形）+ 右上青蓝点 → 现代构图 + 经典纸牌/黄铜/铁十字
- 备选 `favicon-alt.svg/png`：军绿底 + 黄铜金喇叭臂几何铁十字 + 细金环（经典味更重）；用户若想换只需对调两对文件的 href
- PNG 为 256×256 RGBA：Edge headless `--default-background-color=00000000` + 临时 _render.html 满屏 img 渲染 SVG 后截图导出，圆角处透明
- head 补充 `sizes="256x256"`、`apple-touch-icon`、`theme-color #101a33`；删除两张带水印的 AI 中间图（约 3.9MB）
- 验证：图标资源均 HTTP 200，64/48/32/16px 小尺寸下两版图形均可辨

## 新增：站点图标随经典 / 现代主题自动切换
- `THEME_ICONS` 映射：classic → `favicon-alt.svg/png`（军绿勋章）+ theme-color `#15261e`；modern → `favicon.svg/png`（深蓝卡牌）+ `#101a33`
- `syncThemeIcon(t)` 挂在 `applyTheme()` 末尾，因此切换按钮、localStorage 刷新恢复两条路径都会自动同步；会移除并重建 3 个 link（svg icon / png icon / apple-touch-icon）确保浏览器刷新标签图标，href 已一致时跳过重建避免首屏闪烁
- `index.html` 静态声明改为 classic（默认主题），避免加载瞬间先闪现代图标；meta theme-color 初值同步改为 `#15261e`
- 验收：CDP 真实点击 11 项断言全通过（默认经典 / 切现代 / 刷新恢复 / 第二处按钮切回 / link 数量恒为 3 / 按钮文字同步 / 四个资源 200），零运行时异常

## 改造：右侧固定信息栏 + 无可用行动自动结束回合
- 布局：`.arena` 三列（HQ / lanes / `.side-panel`），侧栏 208px 内分上下两块：上 `.log-block`「对局记录」(44%)、下 `.inspect-block`「卡牌预览」(56%)，各带标题＋可滚动 body；预览卡 134px 宽、底部脚注显示兵种/部署费/行动费/是否可打出
- 删除原跟随鼠标的 `#preview` 浮层（HTML 元素、CSS、positionPreview 与 mousemove 监听全部移除）；改为 `S.inspect={id,uid}` + `setInspect/renderInspect/applyInspectSelection`：hover 更新、`render()` 中选中项优先覆盖、鼠标移出回落到选中卡（无选中则 sticky 保留）、单位阵亡自动清空；hover 处理排除 `#inspectBody` 防重建循环
- 自动结束由「kredit=0」扩展为「无可用行动」：新增 `canPlayAnyCard`（费用够 + 单位卡需有空位）、`hasPlayerAction`（可出牌 or 场上单位 canMove/canAttack）、`checkAutoEnd`；`afterKreditSpent` 与 `startTurn('player')` 两处调用，定时器守卫由 `kredit>0` 改为 `hasPlayerAction()`；文案区分「指挥点耗尽」/「无牌可出」
- 矮屏修复：1280×720 下原预览卡 112×165 溢出 168px 容器，改为 `log-block 38% / inspect-block 62%` + padding 4px + `--cw:104px`（153px 高 / 194px 容器）；窄屏 168px 栏，`<900px` 隐藏侧栏
- 验收：26 项断言（布局/预览交互/双主题/8 组自动结束边界）+ 11 项（矮屏/多回合回归）全通过，零运行时异常；多回合回归 5 回合 HP 20→9，新逻辑未卡死对局

## 适配：手机竖屏 / 小屏设备
- 根因：`@media (max-width:900px)` 里 `.side-panel{display:none}` 直接隐藏右侧栏；`#gameScreen{overflow:hidden}` 导致既看不到也划不动
- 方案：`@media (max-width:900px)` 整页重排——`#gameScreen{overflow-y:auto}`、`.top-bar` sticky 吸顶、`.bottom-zone` sticky 吸底、`.arena{flex:1 0 auto;flex-direction:column}`（必须 grow 不 shrink：`1 1 auto` 会在内容超高时压缩战场、盖住侧栏并让页面失去滚动）
- 侧栏从右侧列改为战线下方一行左右并排（日志 50% / 预览 50%，高 196px、预览卡 86px）；HQ 横排、战线槽位 flex 平分、手牌横向可滑、结束回合按钮 fixed 到指挥点行右侧（bottom:132px）完全不压手牌
- `@media (orientation: landscape) and (max-height:520px)` 小屏横屏兜底（侧栏 160px、卡 64px、按钮 bottom:112px）
- 断点必须是 `max-width:900px` 不限 orientation：只写 portrait 时，删掉 display:none 后 800×600 窄窗口三列挤不下（槽位溢出 lanes、预览卡裁切）
- 手牌卡裁切修正：竖屏 hand-zone 128px + 卡 82px（120px 高）；横屏 110px + 70px
- 验收：CDP 模拟 390×844 / 360×740 / 768×1024 / 844×390 共 70 项断言全过（含真实坐标点击 悬停预览→点手牌→点槽位部署→结束回合、双主题、滚到底侧栏不被 footer 遮挡），零异常；800×600 / 1024×768 / 1440×900 桌面无回归
