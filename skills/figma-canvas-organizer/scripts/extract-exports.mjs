#!/usr/bin/env node
// extract-exports.mjs — 宿主机侧：把 figma-link 任务里的导出结果写盘。
//
// 用法：
//   node extract-exports.mjs <job-id> <输出目录> [runs目录]
// 例：
//   node extract-exports.mjs 8b50c31b-d82c-4424-9888-928d8aa420e6 ./assets
//
// SVG 内容在 result.json 的 output.files[].data（字符串）
// PNG 内容是 base64（output.files[].data），此处解码成二进制
import fs from 'node:fs';
import path from 'node:path';

const [jobId, outDirArg, runsArg] = process.argv.slice(2);
if (!jobId) {
  console.error('用法: node extract-exports.mjs <job-id> <输出目录> [runs目录]');
  process.exit(1);
}
const outDir = path.resolve(outDirArg || './exports');
const runsDir = path.resolve(runsArg || '.figma-link/runs');
const resultPath = path.join(runsDir, jobId, 'result.json');

if (!fs.existsSync(resultPath)) {
  console.error('找不到 ' + resultPath + '（job-id 是否正确？）');
  process.exit(1);
}

const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
if (!result.ok) {
  console.error('任务失败: ' + (result.error || 'unknown'));
  process.exit(1);
}

const files = (result.output && result.output.files) || [];
if (!files.length) {
  console.error('result.json 里没有 output.files');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
let written = 0;
for (const f of files) {
  if (f.error) {
    console.warn('skip ' + (f.file || f.name) + ': ' + f.error);
    continue;
  }
  const name = f.file || f.name;
  const dest = path.join(outDir, name);
  if (name.endsWith('.png')) {
    fs.writeFileSync(dest, Buffer.from(f.data, 'base64'));
  } else {
    fs.writeFileSync(dest, f.data, 'utf8');
  }
  written++;
  console.log('wrote ' + dest + '  ' + fs.statSync(dest).size + 'B');
}
console.log('\n' + written + ' 个文件 → ' + outDir);
