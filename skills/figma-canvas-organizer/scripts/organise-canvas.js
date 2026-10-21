// organise-canvas.js — 把页面上的顶层节点收进 Figma Section，并按 NN 顺序统一流排。
// 用法：figma-link run organise-canvas.js --node <任意作用域内节点>
//
// 只改这里 ↓：按图层名把节点分配到区块。名称必须和图层名完全一致（先用 list-top.js 看）。
const CONFIG = {
  padX: 32,
  titleBand: 56,
  padBottom: 32,
  gap: 200,
  hideLabelPattern: /^Label \//, // 收进 Section 后隐藏的浮动行标签
  blocks: [
    // { name: '00 · ASSETS', nodes: ['Logo / Light', 'Logo / Dark'] },
    // { name: '01 · V1 · WEB · LIGHT', nodes: ['Web / Home — Light', 'Web / Blog — Light'] },
    // { name: '99 · ARCHIVE — deprecated', nodes: ['Old / Something'], hidden: true }
  ]
};

async function main() {
  if (!CONFIG.blocks.length) {
    throw new Error('CONFIG.blocks 为空：先用 list-top.js 读出顶层节点名，再把区块写进脚本');
  }
  const page = figma.currentPage;
  const report = { sections: [], missing: [], hiddenLabels: 0 };

  // 1) 建立名称索引（含 Section 内部节点）
  const byName = new Map();
  const index = (n) => {
    if (!byName.has(n.name)) byName.set(n.name, n);
    if (n.children) for (const c of n.children) index(c);
  };
  for (const n of page.children) index(n);

  // 2) 归一化坐标系：把节点拉回页面层，按绝对坐标重设 x/y
  for (const block of CONFIG.blocks) {
    for (const nm of block.nodes) {
      const n = byName.get(nm);
      if (!n) { report.missing.push({ block: block.name, node: nm }); continue; }
      const b = n.absoluteBoundingBox;
      if (!b) continue;
      if (n.parent && n.parent.type === 'SECTION') page.appendChild(n);
      n.x = b.x;
      n.y = b.y;
      if (n.type === 'TEXT' && CONFIG.hideLabelPattern.test(n.name)) n.x = 0;
    }
  }

  // 3) 逐块建 Section 并把节点搬进去（坐标换算成相对值）
  CONFIG.blocks.forEach((block) => {
    const nodes = block.nodes.map((nm) => byName.get(nm)).filter(Boolean);
    if (!nodes.length) return;

    let minX = Infinity, minY = Infinity, maxR = -Infinity, maxB = -Infinity;
    for (const n of nodes) {
      const b = n.absoluteBoundingBox;
      if (!b) continue;
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxR = Math.max(maxR, b.x + b.width);
      maxB = Math.max(maxB, b.y + b.height);
    }
    if (!isFinite(minX)) return;

    const w = Math.ceil(maxR - minX + CONFIG.padX * 2);
    const h = Math.ceil(maxB - minY + CONFIG.titleBand + CONFIG.padBottom);

    let section = page.children.find((n) => n.type === 'SECTION' && n.name === block.name);
    if (!section) {
      section = figma.createSection();
      section.name = block.name;
    }
    page.appendChild(section);
    section.resizeWithoutConstraints(w, h);

    for (const n of nodes) {
      const b = n.absoluteBoundingBox;
      section.appendChild(n);
      n.x = b.x - minX + CONFIG.padX;
      n.y = b.y - minY + CONFIG.titleBand;
    }

    if (CONFIG.hideLabelPattern) {
      for (const n of nodes) {
        if (n.type === 'TEXT' && CONFIG.hideLabelPattern.test(n.name) && n.visible) {
          n.visible = false;
          report.hiddenLabels++;
        }
      }
    }

    if (block.hidden) section.visible = false;
    report.sections.push({ name: block.name, id: section.id, w, h, items: nodes.length, hidden: !!block.hidden });
  });

  // 4) 流排：按名字开头的数字排序（99 自然最后），x 恒为 0
  const numOf = (n) => {
    const m = /^(\d+)/.exec(n.name);
    return m ? parseInt(m[1], 10) : 500;
  };
  const secs = page.children.filter((n) => n.type === 'SECTION').sort((a, b) => numOf(a) - numOf(b));
  let cursor = 0;
  for (const s of secs) {
    s.x = 0;
    s.y = cursor;
    cursor += s.height + CONFIG.gap;
  }

  return {
    sections: report.sections,
    missing: report.missing,
    hiddenLabels: report.hiddenLabels,
    pageChildren: page.children.map((n) => n.type + ': ' + n.name),
    totalHeight: cursor
  };
}

return await main();
