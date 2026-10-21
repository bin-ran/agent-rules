---
name: figma-canvas-organizer
description: 用 Figma 原生 Section 把散乱的设计画布整理成分区有序的画板（NN · 区域 · 变体 命名、统一 200 间距、归档区隐藏），并内置 figma-link 写入时的踩坑检查（2000 节点上限、FILL 时机、textAutoResize、原型目标必须是顶层 Frame）与三类布局校验。用户提到整理画板/画布、分区、Section、加版本对比、导出 SVG 素材，或新项目要按统一规范排布设计稿时使用。
license: Apache-2.0
compatibility: 需要 Node.js 22+、figma-link（本 skill 的脚本都通过 figma-link run 执行）；Figma Design 编辑器
---

# figma-canvas-organizer

把「设计画布」当代码仓库来管：每个逻辑区块一个 **Figma Section**，编号固定、间距固定、归档隐藏、布局可机器校验。

**依赖 [figma-link](../figma-link/SKILL.md)**：所有脚本都不是 Figma 插件本身，而是通过
`figma-link run <script> --node <目标节点>` 下发到 Figma 里执行的任务。先完成 figma-link 的
`init → connect → doctor`，再使用本 skill。

## 什么时候用

- 画布上画板越来越多，靠浮动文字标签区分版本 / 主题 / 页面
- 想给客户或同事交付一版「一眼能看懂」的结构
- 要在同一文件里并排放 V1 / V2、明暗两套、Web / Mobile
- 需要把废弃内容留档但不想看见（归档区）
- 需要批量导出 logo / favicon / 头像的 SVG、PNG

## 核心约定（完整数值见 `references/section-spec.md`）

```
Section 内边距   左/右 32 · 上 56（标题带）· 下 32
Section 间距     200
Section 位置     x = 0，y = 前一个 y + height + 200
命名             NN · 区域 · 变体           例：01 · V1 · WEB · LIGHT
编号段位         00 资源 / 01–10 屏幕 / 11 组件库 / 12–14 品牌 / 99 归档（隐藏，永远最后）
行内布局         Web 4 屏 ×1440 间距 80 / Mobile 4 屏 ×390 间距 80
行标签           进 Section 后删掉浮动 Label，标题由 Section 承担
归档             废弃内容 → 99 · ARCHIVE 且 visible=false，不删除
```

## 标准流程

```bash
# 0. 前置：figma-link 已就绪
figma-link doctor            # 必须 ready=true

# 1. 先读画布，拿到真实的顶层节点名
figma-link run scripts/list-top.js --node <任意节点>      # 或 figma-link inspect --node 1029:2

# 2. 把顶层节点按区块写进 organise-canvas.js 的 CONFIG.blocks
#    （名称必须和图层名完全一致；不确定就先 list，不要猜）
figma-link run scripts/organise-canvas.js --node <小节点>  # 见下方「作用域技巧」
figma-link wait <job-id>

# 3. 三查（缺一不可）
figma-link run scripts/check-layout.js --node <小节点>
figma-link wait <job-id>       # 期望：pageOverlaps 0 / childOverlaps 0 / overflow 0

# 4. 需要导出素材时
figma-link run scripts/export-svg.js --node <区块 Section>
figma-link wait <job-id>
node scripts/extract-exports.mjs <job-id> ./out
```

## 作用域技巧（很关键）

页面节点数超过 2000 时，**以 page 为 `--node` 的写入会被拒绝**。此时：

| 目标 | 做法 |
|---|---|
| 在页面层新建节点（Section / 画板） | 先 `figma.createFrame()`，`parent.appendChild` 到作用域内的容器，再 `page.appendChild` 提到页面层 |
| 移动 / 改属性页面上已有节点 | 直接 `page.appendChild` + 赋 `x/y`；实测允许（脚本里就是这么做分区收拢的） |
| 新建内容 | 先建一个容器（如 `Design Kit`），后续 `--node <容器>` 限定快照范围 |
| 页面级写入彻底不可用 | 目标换新文件重新 `figma-link init` |

**改坐标前先取 `absoluteBoundingBox`**：`appendChild` 到新父级后 `x/y` 数值不变但坐标系变了，
不换算会整体位移。

## 脚本清单

| 脚本 | 作用 | 参数 |
|---|---|---|
| `organise-canvas.js` | 按 CONFIG 把节点收进 Section、统一流排、隐藏行标签 | `--node` 任意作用域内节点 |
| `check-layout.js` | 顶层重叠 / 子元素重叠 / 越界 三查 | 同上 |
| `scaffold-sections.js` | 新文件生成标准骨架（等价于「模板」） | 同上 |
| `export-svg.js` | 按名字导出 SVG（文字转轮廓）+ 可选 PNG base64 | `--node` 区块 |
| `extract-exports.mjs` | 宿主机把 result.json 里的导出写盘 | jobId, 输出目录 |
| `fix-text-autosize.js` | 修复被 `resize()` 压成 20px 的文本 | `--node` 任意节点 |
| `promote-from-container.js` | 把容器内画板提到页面层（原型跳转前置条件） | `--node` 容器 |
| `list-top.js` | 只读：列出顶层节点 + 顶层重叠 | 同上 |

## 硬约束与已知坑

完整清单（含报错原文与修法）见 `references/pitfalls.md`。最容易踩的五条：

1. `resize()` 会把 `textAutoResize` 重置成 `NONE`，固定宽度文本被压成 20px 高 → 先 `resize` 再设 `HEIGHT`
2. `layoutSizingHorizontal='FILL'` 只能在 **appendChild 之后**设置
3. `appendChild` 返回 **void**，不能链式 `.x = ...`
4. 原型 `NAVIGATE` 的目标必须是**页面顶层 Frame**，容器里的画板必须先 promote
5. `setReactionsAsync` 的 schema 是 `{trigger, actions: [{type:'NODE', destinationId, navigation, transition:null}]}`（是 `actions` 复数，`type` 是 `NODE`）

## 脚本自检（必做）

`figma-link run` **不会**预先校验脚本语法：语法错会在 Figma 里报错，而且可能留下部分写入。
下发前先在本地过一遍：

```bash
node -e '
const fs=require("fs"), A=(async()=>{}).constructor;
for (const f of process.argv.slice(1)) {
  try { new A("figma","target",fs.readFileSync(f,"utf8")); console.log("ok  ", f); }
  catch (e) { console.log("FAIL", f, e.message); }
}' scripts/*.js
```

只读脚本优先验证（`list-top.js` → `check-layout.js`），确认能跑通再上写脚本。
本 skill 的 7 个脚本 + 1 个 mjs 已在真实文件（binran，2838 节点）上实测通过；
`check-layout.js` 上线首跑就抓到一个游离的 `Glyph / br` 孤儿节点（早期失败任务残留），
已清理 —— 说明「按顶层节点全量比对」比只比对 Section 更可靠。

## 收尾检查

- 页面顶层只有 SECTION（没有游离节点）
- 三查全 0
- `figma-link run check-reactions` 类脚本确认原型连线未丢（本会话实测 238 条链接在分区后全部保留）
- 导出的 SVG 用 `svgOutlineText: true`，避免对方缺字体
