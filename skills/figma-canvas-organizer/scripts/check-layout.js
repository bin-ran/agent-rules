// check-layout.js — 三类布局校验：顶层重叠 / Section 内子元素重叠 / 越界。
// 用法：figma-link run check-layout.js --node <任意作用域内节点>   （只读，不改画布）
const MAX_DETAILS = 25;

const page = figma.currentPage;
const isSection = (n) => n.type === 'SECTION';

const box = (n) => ({ name: n.name, id: n.id, x: n.x, y: n.y, w: n.width, h: n.height, visible: n.visible !== false });
const overlap = (a, b) => {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return ox > 1 && oy > 1 ? { ox: Math.round(ox), oy: Math.round(oy) } : null;
};

// 顶层
const top = page.children.filter((n) => n.visible !== false && n.width > 2 && n.height > 2).map(box);
const pageOverlaps = [];
for (let i = 0; i < top.length; i++) {
  for (let j = i + 1; j < top.length; j++) {
    const o = overlap(top[i], top[j]);
    if (o) pageOverlaps.push({ a: top[i].name, b: top[j].name, ...o });
  }
}

// Section 内
const childOverlaps = [];
const overflow = [];
for (const s of page.children.filter(isSection)) {
  const kids = s.children.map(box);
  for (const k of kids) {
    if (k.x < -1 || k.y < -1 || k.x + k.w > s.width + 1 || k.y + k.h > s.height + 1) {
      overflow.push({ section: s.name, child: k.name, box: [Math.round(k.x), Math.round(k.y), Math.round(k.w), Math.round(k.h)], sectionSize: [Math.round(s.width), Math.round(s.height)] });
    }
  }
  for (let i = 0; i < kids.length; i++) {
    for (let j = i + 1; j < kids.length; j++) {
      if (!kids[i].visible || !kids[j].visible) continue;
      const o = overlap(kids[i], kids[j]);
      if (o) childOverlaps.push({ section: s.name, a: kids[i].name, b: kids[j].name, ...o });
    }
  }
}

const count = (n) => { let c = 1; if (n.children) for (const ch of n.children) c += count(ch); return c; };

return {
  pageNodes: count(page),
  topLevel: page.children.map((n) => n.type),
  sections: page.children.filter(isSection).map((n) => ({ name: n.name, y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height), kids: n.children.length, visible: n.visible })),
  counts: { pageOverlaps: pageOverlaps.length, childOverlaps: childOverlaps.length, overflow: overflow.length },
  pageOverlaps: pageOverlaps.slice(0, MAX_DETAILS),
  childOverlaps: childOverlaps.slice(0, MAX_DETAILS),
  overflow: overflow.slice(0, MAX_DETAILS)
};
