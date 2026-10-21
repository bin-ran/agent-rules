// fix-text-autosize.js — 修复「固定宽度文本被压成 20px 高」。
// 病因：textNode.resize(w,h) 会把 textAutoResize 重置为 NONE。
// 用法：figma-link run fix-text-autosize.js --node <画面 / Section / 任意父节点>
const root = target;
if (!root) throw new Error('缺少 --node 目标');

const changed = [];
let scanned = 0;

const walk = (n) => {
  if (n.type === 'TEXT') {
    scanned++;
    if (n.textAutoResize === 'NONE') {
      const before = n.height;
      n.textAutoResize = 'HEIGHT';
      if (Math.round(n.height) !== Math.round(before)) {
        changed.push({ name: n.name, before: Math.round(before), after: Math.round(n.height), w: Math.round(n.width) });
      }
    }
  }
  if (n.children) for (const c of n.children) walk(c);
};
walk(root);

return { target: root.name, scanned, fixed: changed.length, changed: changed.slice(0, 40) };
