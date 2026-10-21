// promote-from-container.js — 把容器里的画板提到页面层，保持视觉位置不变。
// 为什么要这一步：Figma 原型 NAVIGATE 的目标必须是**页面顶层 Frame**，
// 放在容器里的画板不能作为跳转目标。
// 用法：figma-link run promote-from-container.js --node <容器>
const container = target;
if (!container) throw new Error('缺少 --node 容器');

// 只改这里 ↓：需要提升的画板名前缀（不填则提升容器内所有 FRAME）
const NAME_PATTERN = /^/;

const page = figma.currentPage;
const promoted = [];

const kids = [...container.children];
for (const k of kids) {
  if (k.type !== 'FRAME') continue;
  if (!NAME_PATTERN.test(k.name)) continue;
  const absX = container.x + k.x;
  const absY = container.y + k.y;
  page.appendChild(k);
  k.x = absX;
  k.y = absY;
  promoted.push({ name: k.name, id: k.id, x: Math.round(k.x), y: Math.round(k.y), w: Math.round(k.width), h: Math.round(k.height) });
}

return {
  container: container.name,
  promoted: promoted.length,
  frames: promoted,
  note: promoted.length ? '现在可以把这些画板设为原型跳转目标' : '容器里没有匹配的 FRAME'
};
