# 踩坑清单（figma-link + Figma Plugin API）

每条都来自实战报错，按「症状 → 原因 → 修法」记录。写脚本前扫一遍，能省掉一整轮失败重跑。

---

## 1. 固定宽度文本被压成 20px 高

**症状**：`inspect` 读回标题/段落高度全是 `20`，画布上文字只显示一行并被截断。
**原因**：`textNode.resize(w, h)` 会把 `textAutoResize` 重置为 `NONE`。
**修法**：

```js
t.textAutoResize = 'HEIGHT';   // 必须在 resize 之后，或直接
t.resize(w, 20);
t.textAutoResize = 'HEIGHT';   // 最后再设一次
```

或挂到 auto-layout 父级后设 `t.layoutSizingHorizontal = 'FILL'`（会自动变成 HEIGHT）。
批量修复用 `scripts/fix-text-autosize.js`。

---

## 2. `FILL` 报错

```
Error: in set_layoutSizingHorizontal: FILL can only be set on children of auto-layout frames
```

**原因**：在 `appendChild` 之前设置 FILL，此时父级还是 page。
**修法**：先 append，再设 sizing。

```js
parent.appendChild(child);
child.layoutSizingHorizontal = 'FILL';
```

---

## 3. `appendChild` 返回 void

**症状**：`TypeError: cannot set property 'x' of null`
**原因**：写了 `board.appendChild(txt(...)).x = 0`。
**修法**：

```js
const t = txt(...);
board.appendChild(t);
t.x = 0;
```

---

## 4. 原型跳转 schema

**错误 1**（旧写法）：

```
Error: in set_reactions: Cannot call with documentAccess: dynamic-page. Use node.setReactionsAsync instead.
```

**错误 2**（字段名错）：

```
Property "reactions" failed validation: Expected [0].action to be one of ... Unrecognized keys: "destinationId", "navigation"
```

**正确写法**：

```js
await node.setReactionsAsync([{
  trigger: { type: 'ON_CLICK' },
  actions: [{ type: 'NODE', destinationId: dest.id, navigation: 'NAVIGATE', transition: null }]
}]);
```

要点：`actions` 是**复数数组**；`action.type` 是 `'NODE'`（不是 `'NAVIGATE'`）；`transition` 必须给 `null`。

---

## 5. 跳转目标不能是容器里的画板

```
Reaction at index 0 was invalid (destination ... for NAVIGATE actions,
destinations must be a different top-level frame on the same page)
```

**原因**：目标被放在容器 / Section 之外的子 Frame 里，或目标就是自己。
**修法**：
- 自跳转直接跳过（`topOf(source) === dest` 时跳过）
- 用 `scripts/promote-from-container.js` 把画板提到页面层

> 补充：画板放进 **Section** 里仍然算页面顶层，原型不受影响（实测 238 条链接在分区后全部保留）。

---

## 6. 2000 节点写入上限

**症状**：以 page 为 `--node` 的 `run` 被拒绝（目标超过 2000 节点 / 快照截断）。
**修法**：

| 需要做的事 | 手段 |
|---|---|
| 新建页面级节点 | 先在作用域内容器里 `createFrame()`，再 `page.appendChild` 提升 |
| 改已有页面级节点 | 直接 `page.appendChild(node)` + 赋 `x/y`（实测可行） |
| 批量新内容 | 建容器 → 后续 `--node <容器>` 限定快照 |
| 彻底不可用 | 换新文件重新 `figma-link init` |

**坐标系陷阱**：`appendChild` 后 `x/y` 数值不变但基准变了。改父级前先存 `absoluteBoundingBox`。

---

## 7. 变量集合只能 1 个 mode

```
Error: in addMode: Limited to 1 modes only
```

**原因**：当前套餐（Starter/Free）每个 variable collection 只允许 1 个 mode。
**修法**：改成「按主题拆集合」：`V1 · Light`、`V1 · Dark`、`V2 · Light`、`V2 · Dark`，
每个集合单 mode、同名变量、不同值。语义等价，代价是切换主题要换集合而不是换 mode。

---

## 8. `fillStyleId` 不能直接赋值

```
Error: in set_fillStyleId: Cannot call with documentAccess: dynamic-page. Use node.setFillStyleIdAsync instead.
```

**修法**：删掉 `node.fillStyleId = ''` 这类赋值；需要时用 `await node.setFillStyleIdAsync(id)`。

---

## 9. 目标节点已被删

```
Error: 局部目标不存在或超出绑定范围
```

**原因**：`--node` 传的节点在上一次任务里被删掉了（例如测试用的临时 Section）。
**修法**：每次都从 `inspect` / `list-top.js` 重新取 ID，不要复用旧 ID。

---

## 10. 文本宽度随字体回退变化

**症状**：中文标签的宽度在创建后变宽，右侧说明文字被压住。
**原因**：DM Sans / JetBrains Mono 没有中文字形，Figma 异步回退到 CJK 字体，宽度在布局后才稳定。
**修法**：
- 说明文字位置在**所有元素创建完**之后统一再排一次（见 `organise-canvas.js` 的 caption 重排）
- 或给说明文字设固定可用宽度：`room = 卡片右边 - 文字x - 8`

---

## 11. 渐变填充不能绑变量

`figma.variables.setBoundVariableForPaint(paint, 'color', v)` 只对 `SOLID` 有意义。
渐变请用 `gradientStops[i].boundVariables`，或干脆不绑（内容色不属于设计令牌）。

---

## 12. 导出 SVG 的字体依赖

- 交付素材一定要 `svgOutlineText: true`，否则对方缺字体就变样
- 想**验证**实际用的是哪个字体：用 `svgOutlineText: false` 导出，看 `font-family` 属性
- `exportAsync` 返回 `Uint8Array`；插件沙箱里没有 `Buffer`，要用手写 UTF-8 解码（见 `export-svg.js`）
- PNG 用 `{ format: 'PNG', constraint: { type: 'SCALE', value: 1 } }`，base64 分块 `btoa` 再回传
