// scaffold-sections.js — 在新文件里生成标准分区骨架（等价于「Figma 模板」，但可参数化）。
// 用法：figma-link run scaffold-sections.js --node <任意作用域内节点>
//
// 只改这里 ↓：按项目需要的段位与尺寸列出骨架。已存在的同名 Section 会被跳过。
const LAYOUT = { gap: 200, padX: 32, titleBand: 56 };
const SKELETON = [
  { name: '00 · ASSETS', w: 600, h: 400 },
  { name: '01 · WEB · LIGHT', w: 6000, h: 1400 },
  { name: '02 · WEB · DARK', w: 6000, h: 1400 },
  { name: '03 · MOBILE · LIGHT', w: 1800, h: 1800 },
  { name: '04 · MOBILE · DARK', w: 1800, h: 1800 },
  { name: '11 · DESIGN KIT', w: 1600, h: 2000 },
  { name: '12 · BRAND', w: 3400, h: 2000 },
  { name: '99 · ARCHIVE — empty', w: 800, h: 400, hidden: true }
];

const page = figma.currentPage;
const made = [];
let cursor = 0;

for (const spec of SKELETON) {
  let s = page.children.find((n) => n.type === 'SECTION' && n.name === spec.name);
  const existed = !!s;
  if (!s) {
    s = figma.createSection();
    s.name = spec.name;
  }
  page.appendChild(s);
  s.resizeWithoutConstraints(spec.w, spec.h);
  s.x = 0;
  s.y = cursor;
  if (spec.hidden) s.visible = false;
  cursor += spec.h + LAYOUT.gap;
  made.push({ name: spec.name, id: s.id, existed, w: spec.w, h: spec.h, hidden: !!spec.hidden });
}

return { made, totalHeight: cursor, hint: '骨架已建好；把画板拖进去后，用 organise-canvas.js 统一流排' };
