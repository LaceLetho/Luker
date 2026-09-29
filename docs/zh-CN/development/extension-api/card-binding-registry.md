# 卡绑定保护

用户在角色管理菜单中执行**替换 / 更新**时，新卡文件会覆盖旧卡 PNG。没有保护机制时，存在 `data.extensions.*` 里的本地绑定——绑定的对话补全预设、角色专属人设、编排的本卡预设、记忆图定制、CardApp 开关——都会随旧卡一起丢失。

Luker 通过槽位注册表保护这些绑定。在 `CHARACTER_REPLACED` 事件发出前，核心会针对每个已注册槽位比较旧卡和新卡：

- **仅旧卡有** —— 旧卡配置了该绑定，新卡没有。引擎静默写回本地值。
- **冲突** —— 两张卡都定义了该绑定且值不同。弹窗逐类列出冲突项，用户可按类选择保留本地值或采用新卡的值。
- **相同** —— 值深度相等，不做任何处理。
- **仅新卡有** —— 新卡自带的绑定原样保留（与普通导入一致）。

## 注册槽位

属主在扩展 init 中为每个绑定类别注册一个描述符：

```js
const context = Luker.getContext();

context.registerCardBindingSlot({
    id: 'my-binding',
    label: () => context.translate('My binding'),
    read: character => readMyBinding(character),
    isPresent: value => Boolean(value),
    summarize: value => summarizeMyBinding(value),
    write: async (characterId, value) => {
        const previous = context.characters[characterId]?.data?.extensions?.my_namespace;
        await context.writeExtensionField(characterId, 'my_namespace', { ...previous, my_binding: value });
    },
});
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 唯一且稳定的槽位 id。仅允许字母、数字、`_` 和 `-`，且必须以字母开头。重复注册同一 id 会打印警告并覆盖旧描述符。 |
| `label` | `() => string` | 用户可见的类别名称，由属主负责翻译。 |
| `read` | `(character) => value \| null` | 从角色对象纯读取，不得调度写入或迁移。 |
| `isPresent` | `(value) => boolean` | 该值是否算作"用户配置过"。 |
| `summarize` | `(value) => string` | 冲突弹窗中该侧的一行摘要。 |
| `write` | `async (characterId, value) => void` | 写回值。`characterId` 是 `context.characters` 的下标。 |

描述符缺少必需函数时 `registerCardBindingSlot` 会直接抛错，让错误在加载期暴露，而不是等到替换发生。

## 写回责任

`write` 只收到 `read` 产出的值。属主需要：

- 通过 `context.characters[characterId]` 解析角色；
- 合并兄弟键——`context.writeExtensionField` 会整体替换该命名空间的值，先读取当前数据再展开、覆盖被保护的键；
- 失败时抛错。引擎会 toast 报错并继续处理其余槽位，绝不阻断替换。

## 已禁用的插件

槽位在扩展 init 时注册。被禁用或未加载的插件不会注册槽位，因此其卡绑定在替换时不受保护。这是有意为之：引擎不硬编码插件的字段语义。核心绑定（绑定预设、角色专属人设）始终受保护。

## 运行时位置

引擎在替换流程内部运行，位于新卡载入内存之后、`CHARACTER_REPLACED` 监听器被通知之前。因此写入发生在任何插件响应事件之前。当绑定预设被保留时，引擎还会重新应用角色卡绑定预设，让当前会话采用保留的默认预设。
