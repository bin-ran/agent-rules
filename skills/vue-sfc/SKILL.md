---
name: vue-sfc
description: "编写、修改或审查任何 Vue 3 单文件组件（.vue、<script setup>）时必须遵循的代码风格规则——块顺序 template → script → style、具名函数用 function 声明、<script setup> 内部按九段分区排序。只要任务涉及 .vue 文件就先读本文件，不要凭记忆写。"
---

# Vue 单文件组件（SFC）规则

适用范围：`.vue` 组件的 `<script setup>`。`.ts` 文件（store / composables / utils / api）不受本节约束。

**1. 块顺序**

- 新建组件按 `<template>` → `<script>` → `<style>` 书写；已有旧组件不回改。
- 脚手架与 IDE 的 Vue 片段默认生成 script-first，新建文件后需手动把 `<template>` 提到前面。
- 没有样式就不写空 `<style>` 块；多 `<style>` 块（如一个 scoped + 一个全局覆盖）顺序不做要求，均置于 `<script>` 之后。

**2. 方法声明：`function` 优先**

- 具名函数（有自己的标识符、被本组件逻辑或模板调用的）一律写 `function foo() {}` / `async function foo() {}`，不写 `const foo = () => {}`。
- 豁免（继续用箭头函数）：作为参数传入的匿名回调——`computed(() => ...)`、`watch(a, () => ...)`、`onMounted(() => ...)`、`list.map(x => ...)`、模板内联事件、props 默认值工厂等。
- 确需箭头函数的词法作用域或惰性创建时可用，但加注释说明原因。
- `function` 有提升、箭头函数没有：在响应式数据区调用方法区的函数（如 `const list = ref(fetchList())`）因此合法；但仍建议保持自上而下的阅读顺序。

**3. `<script setup>` 内部顺序**

依赖引入 → 类型 / 常量 → Props / Emits（编译器宏）→ 响应式数据 → 计算属性 → 方法 → 监听器 → 生命周期 → 暴露变量

- **依赖引入**：`import` 按「Vue 及路由/状态库 API → 第三方库 → 本地模块（组件 / composables / utils / types）→ 样式与静态资源」分组，组间空行。
  手写还是自动导入，以目标项目的实际配置为准：已由自动导入插件解析出的全局符号不要重复 import，其余 API（Vue 核心、路由、状态库等）必须显式 import；不确定时先查该项目的构建配置与自动导入生成的 `.d.ts`，不要凭印象。
- **类型 / 常量**：`interface`、`type`、枚举、常量表。props 的 `interface` 放这一区，紧接其后的 `defineProps` 才能引用。
- **Props / Emits**：`defineProps` / `defineEmits` / `defineSlots` / `defineModel` / `defineOptions` 归入此区（它们是顶层宏，不能下放到函数里）。
- **响应式数据**：`ref` / `reactive` / `shallowRef`、`useRoute()`、store 实例、`inject`。
- **计算属性**：`computed`。
- **方法**：本组件的具名方法（按第 2 条用 `function` 声明）。
- **监听器**：`watch` / `watchEffect`。
- **生命周期**：`onMounted` / `onUnmounted` 等；钩子内逻辑超过几行就抽成方法，钩子里只留调用。
- **暴露变量**：`defineExpose`，固定放最后；仅在父组件确实需要 `ref` 调用时才写。
- **聚合与分区的优先级**：默认按上述类型分区。当某一业务逻辑足够大、需要在各区之间来回跳读时，**抽成 `composables/useXxx.ts`**，而不是在 SFC 内打散顺序。
