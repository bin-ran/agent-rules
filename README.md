# AGENTS Rules · AI 编码代理规则集

适用于 [pi](https://github.com/earendil-works/pi-coding-agent) 等 AI 编码代理的行为规则，让代理在读写文件、执行命令、提交代码时有统一的安全边界和工作习惯。

规则分两级：**常驻**（写进 `AGENTS.md`，每次请求都进 system prompt）与**按需**（标准 skill，只有名称和描述常驻，正文由模型在命中任务时自己读取）。

## 目录结构

```
rules/                       常驻规则源文件 → 拼接成 AGENTS.md
├─ general/                    通用规则
│  ├─ 10-safety.md               安全与不可逆操作
│  ├─ 20-workflow.md             操作规范（含指向 skill 的索引行）
│  └─ 30-communication.md        交互与沟通
└─ specific/                   专项规则（只留不可逆禁令 + 指向 skill 的索引）
   ├─ 10-file-deletion.md        文件删除
   └─ 20-git-commit.md           Git 提交禁令

skills/                      按需规则（标准 skill 目录，可直接复制使用）
├─ vue-sfc/
│  └─ SKILL.md                  Vue 3 单文件组件规则
└─ git-commit/
   └─ SKILL.md                  Git 提交工序

AGENTS.md                    拼接产物，代理实际读取的常驻指令文件
build.mjs                    拼接 / 安装脚本
```

数字前缀只用于控制同一分组内的顺序。

## 规则内容

**常驻 · 通用规则**

- 安全与不可逆操作 —— 危险操作先确认，敏感信息不入文件
- 操作规范 —— 专用工具优先、命令先说明、不顺手重构
- 交互与沟通 —— 中文回复、先结论后细节、不确定不臆造

**常驻 · 专项规则**

- 文件删除规则 —— 禁止批量删除，只删明确路径
- Git 提交禁令 —— 只提交不推送、不改写已推送的历史

**按需 · skills**

- `vue-sfc` —— Vue 3 单文件组件规则：块顺序、`function` 优先、`<script setup>` 九段分区
- `git-commit` —— 提交工序：conventional commits 类型、按工作项拆分、每个提交独立可构建、测试文件顺序、逐节点 checkout 验证

## 为什么不全放 AGENTS.md

Pi 只在启动时把每个 skill 的 `name` + `description` + 路径放进 system prompt，正文不占常驻上下文；任务涉及 `.vue` 时模型自己 `read` 一次即可。

| | 常驻成本 | 命中时 |
|---|---|---|
| 全放 `AGENTS.md` | ≈2.4k token | —— |
| 本仓库配法 | ≈1.0k token + 两条 skill 描述 | 多一次 `read` |

自动命中率不靠模型自觉：`rules/` 里有两条硬索引 ——「编辑任何 `.vue` 文件前先读 `vue-sfc` skill」「执行任何提交相关操作前先读 `git-commit` skill」。漏读时可用 `/skill:vue-sfc`、`/skill:git-commit` 强制加载。

搬进 skill 的判断标准是**违反后能不能补救**：工序类（提交粒度、代码风格、文件顺序）错了可以返工，按需即可；否决型禁令（不许 push、不改写已推送历史）必须常驻，因为风险恰恰发生在没有触发词的时候 —— 一句「把改动同步一下」也可能被理解成 `git push`。

## 使用方式

`AGENTS.md` 是生成产物，仓库里已带一份，直接复制也能用；改规则时改 `rules/` 或 `skills/` 下的源文件：

```bash
node build.mjs             # 重新生成 AGENTS.md
node build.mjs --install   # 同时写入 ~/.pi/agent/AGENTS.md 与 ~/.pi/agent/skills/
```

在已运行的 Pi 里执行 `/reload`（或重启）使改动生效。`--install` 是幂等的，内容未变会跳过写入。

用户级 skill（`~/.pi/agent/skills/`）对所有目录生效且不需要项目 trust；如果希望只在某个项目生效，可把 skill 目录改放到该项目的 `.pi/skills/`，代价是每个项目一份、首次进入需批准 trust。

其他代理工具（如 Claude Code 的 `CLAUDE.md`）同样读取拼接后的 `AGENTS.md`；`skills/` 遵循 [Agent Skills](https://agentskills.io/specification) 规范，可被支持该规范的实现直接复用。

## 定制建议

- 新增常驻规则：在 `rules/<分组>/` 下加 `.md`，文件内以 `### 标题` 开头，执行 `node build.mjs --install`
- 新增按需规则：写 `skills/<name>/SKILL.md`（frontmatter 必须有 `name` 与 `description`，缺失会被构建拦下），再在 `rules/` 里补一条索引
- 新增分组：在 `build.mjs` 的 `GROUPS` 中登记「目录名 → 二级标题」
- 判断该常驻还是该按需：看违反后能不能补救 —— 不可逆的留常驻，可返工的进 skill；体量大且只在特定任务用得上的（如 SFC 分区顺序）同样进 skill
- 提交类型采用 conventional commits 风格：`feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore` / `revert`

## 许可证

MIT
