// export-svg.js — 按图层名导出 SVG（文字转轮廓），可选导出 PNG（base64 回传）。
// 用法：figma-link run export-svg.js --node <区块 Section 或任意父节点>
//      然后宿主机执行：node extract-exports.mjs <job-id> ./out
//
// 只改这里 ↓
const JOBS = [
  { file: 'logo-primary', match: 'Mark / wordmark', type: 'svg' },
  { file: 'avatar-dark', match: 'Avatar / dark', type: 'svg+png' }
];
const MATCH_MODE = 'startsWith'; // 'exact' | 'startsWith'

const utf8 = (bytes) => {
  let out = '', i = 0;
  while (i < bytes.length) {
    const b = bytes[i++];
    if (b < 0x80) out += String.fromCharCode(b);
    else if (b < 0xE0) out += String.fromCharCode(((b & 0x1F) << 6) | (bytes[i++] & 0x3F));
    else if (b < 0xF0) out += String.fromCharCode(((b & 0x0F) << 12) | ((bytes[i++] & 0x3F) << 6) | (bytes[i++] & 0x3F));
    else {
      const cp = ((b & 0x07) << 18) | ((bytes[i++] & 0x3F) << 12) | ((bytes[i++] & 0x3F) << 6) | (bytes[i++] & 0x3F);
      out += String.fromCodePoint(cp);
    }
  }
  return out;
};
const b64 = (bytes) => {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(bin);
};

const root = target;
if (!root) throw new Error('缺少 --node 目标');

const jobFor = (nm) => JOBS.find((j) => (MATCH_MODE === 'exact' ? nm === j.match : nm.startsWith(j.match)));
const first = new Map();
const walk = (n) => {
  const j = jobFor(n.name);
  if (j && !first.has(j.file)) first.set(j.file, n);
  if (n.children) for (const c of n.children) walk(c);
};
walk(root);

const files = [];
for (const job of JOBS) {
  const node = first.get(job.file);
  if (!node) { files.push({ file: job.file, error: 'not found: ' + job.match }); continue; }
  if (job.type.includes('svg')) {
    const bytes = await node.exportAsync({ format: 'SVG', svgOutlineText: true, svgIdAttribute: false });
    files.push({ file: job.file + '.svg', w: Math.round(node.width), h: Math.round(node.height), data: utf8(bytes) });
  }
  if (job.type.includes('png')) {
    const bytes = await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 1 } });
    files.push({ file: job.file + '.png', bytes: bytes.length, data: b64(bytes) });
  }
}

return { count: files.filter((f) => !f.error).length, files };
