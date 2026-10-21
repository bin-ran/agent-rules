// list-top.js — 只读：列出页面顶层全部节点（含文字标签）与顶层重叠。
// 用法：figma-link run list-top.js --node <任意作用域内节点>
// 整理前先跑这个，拿到真实的图层名，再写 organise-canvas.js 的 CONFIG.blocks。

const page = figma.currentPage;
const count = (n) => { let c = 1; if (n.children) for (const ch of n.children) c += count(ch); return c; };

const rows = page.children.map((n) => ({
  type: n.type,
  name: n.name,
  x: Math.round(n.x),
  y: Math.round(n.y),
  w: Math.round(n.width),
  h: Math.round(n.height),
  nodes: count(n),
  visible: n.visible !== false
}));

const vis = rows.filter((r) => r.visible && r.w > 2 && r.h > 2);
const overlaps = [];
for (let i = 0; i < vis.length; i++) {
  for (let j = i + 1; j < vis.length; j++) {
    const a = vis[i], b = vis[j];
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > 1 && oy > 1) overlaps.push(a.name + ' <-> ' + b.name + ' ' + Math.round(ox) + 'x' + Math.round(oy));
  }
}

return {
  pageNodes: count(page),
  topLevelCount: rows.length,
  rows: rows.sort((a, b) => a.y - b.y),
  overlaps
};
