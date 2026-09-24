// 两级规则的安装脚本。
//
//   rules/   常驻规则：拼接成 AGENTS.md（Pi 每次请求都带进 system prompt）
//   skills/  按需规则：标准 skill 目录，只有 name + description 常驻，正文由模型按需 read
//
// 用法：
//   node build.mjs             仅重新生成仓库内的 AGENTS.md
//   node build.mjs --install   一并写入 Pi 全局指令文件与 ~/.pi/agent/skills/
//
// 新增常驻规则：在 rules/<分组>/ 下加 .md（数字前缀控制顺序，内容以 ### 标题开头）。
// 新增按需规则：在 skills/<name>/SKILL.md 写 frontmatter + 正文，并在 rules/ 里补一条索引。
// 新增分组：在 GROUPS 里登记「目录名 -> 二级标题」。

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const RULES_DIR = join(ROOT, 'rules');
const SKILLS_DIR = join(ROOT, 'skills');
const OUTPUT = join(ROOT, 'AGENTS.md');

/** 目录名 -> 出现在 AGENTS.md 中的二级标题；数组顺序即分组顺序 */
const GROUPS = [
  ['general', '通用规则'],
  ['specific', '专项规则'],
];

function readGroups() {
  const dirs = readdirSync(RULES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const unknown = dirs.filter((dir) => !GROUPS.some(([name]) => name === dir));
  if (unknown.length > 0) {
    console.error(`未登记的规则分组目录：${unknown.join(', ')}；请在 build.mjs 的 GROUPS 中补充`);
    process.exit(1);
  }

  return GROUPS.filter(([name]) => dirs.includes(name)).map(([name, title]) => ({
    title,
    files: readdirSync(join(RULES_DIR, name))
      .filter((file) => file.endsWith('.md'))
      .sort()
      .map((file) => ({
        file,
        body: readFileSync(join(RULES_DIR, name, file), 'utf8').trimEnd(),
      })),
  }));
}

/** skills/ 下符合规范的 skill 目录名（含 SKILL.md，且 frontmatter 有 name 与 description） */
function readSkills() {
  if (!existsSync(SKILLS_DIR)) return [];

  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(SKILLS_DIR, entry.name, 'SKILL.md')))
    .map((entry) => {
      const head = readFileSync(join(SKILLS_DIR, entry.name, 'SKILL.md'), 'utf8');
      const frontmatter = head.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatter || !/^name:/m.test(frontmatter[1]) || !/^description:/m.test(frontmatter[1])) {
        console.error(`skills/${entry.name}/SKILL.md 缺少 frontmatter 的 name 或 description，Pi 不会加载它`);
        process.exit(1);
      }
      return entry.name;
    });
}

function filesUnder(dir, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? filesUnder(join(dir, entry.name), rel) : [rel];
  });
}

function render(groups) {
  const sections = groups.map((group) => {
    const rules = group.files.map((item) => item.body).join('\n\n');
    return `## ${group.title}\n\n${rules}`;
  });
  const banner = '<!-- 本文件由 rules/ 下各主题规则拼接生成，请勿直接编辑；改规则请改 rules/ 后执行 node build.mjs --install -->';
  return `${banner}\n\n# 规则\n\n${sections.join('\n\n')}\n`;
}

function writeIfChanged(target, data) {
  if (existsSync(target) && readFileSync(target).equals(data)) return false;
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, data);
  return true;
}

const groups = readGroups();
const skills = readSkills();
const content = Buffer.from(render(groups), 'utf8');
writeFileSync(OUTPUT, content);

for (const group of groups) {
  console.log(`${group.title}：${group.files.map((file) => file.file).join('、')}`);
}
console.log(`按需规则（skills/）：${skills.join('、') || '（无）'}`);
console.log(`已生成 ${OUTPUT}`);

if (process.argv.includes('--install')) {
  const agentDir = process.env.PI_CODING_AGENT_DIR || join(homedir(), '.pi', 'agent');
  if (!existsSync(agentDir)) {
    console.error(`找不到 Pi 配置目录：${agentDir}`);
    process.exit(1);
  }

  const target = join(agentDir, 'AGENTS.md');
  console.log(writeIfChanged(target, content)
    ? `已安装到 ${target}`
    : `全局指令已是最新：${target}`);

  for (const name of skills) {
    const src = join(SKILLS_DIR, name);
    let installed = 0;
    for (const rel of filesUnder(src)) {
      if (writeIfChanged(join(agentDir, 'skills', name, rel), readFileSync(join(src, rel)))) installed += 1;
    }
    console.log(installed ? `已安装 skill ${name}（${installed} 个文件）` : `skill ${name} 已是最新`);
  }

  console.log('在 Pi 里执行 /reload 或重启生效');
}
