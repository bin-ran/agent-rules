# AGENTS Rules · AI 编码代理通用规则集

适用于 [pi](https://github.com/earendil-works/pi-coding-agent) 等 AI 编码代理的行为规则文件（`AGENTS.md`），让代理在读写文件、执行命令、提交代码时有统一的安全边界和工作习惯。

## 规则内容

**通用规则**

- 安全与不可逆操作 —— 危险操作先确认，敏感信息不入文件
- 操作规范 —— 专用工具优先、命令先说明、不顺手重构
- 交互与沟通 —— 中文回复、先结论后细节、不确定不臆造

**专项规则**

- 文件删除规则 —— 禁止批量删除，只删明确路径
- Git 提交规则 —— 只提交不推送、conventional commits 类型、每个提交独立可用、改历史安全线

## 使用方式

把 `AGENTS.md` 复制到代理的配置目录即可生效：

```bash
# pi coding agent（全局指令文件固定为 ~/.pi/agent/AGENTS.md）
cp AGENTS.md ~/.pi/agent/AGENTS.md
```

其他代理工具（如 Claude Code 的 `CLAUDE.md`、Cursor 的规则文件）也可参考其中的规则条目自行裁剪。

## 定制建议

- 规则按「通用规则 / 专项规则」两层组织，新增规则时对号入座
- 提交类型采用 conventional commits 风格：`feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore` / `revert`
- 可按个人习惯调整「Git 提交规则」中的推送策略（默认：只本地提交，不做远端同步）

## 许可证

MIT
