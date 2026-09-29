# Card Binding Preservation

When a user replaces a character card (**Replace / Update** in the character management menu), the incoming file overwrites the previous card PNG. Without protection, every local binding stored in `data.extensions.*` — bound chat completion presets, dedicated personas, orchestration card presets, Memory Graph overrides, CardApp enablement — would be lost with the old card.

Luker protects these bindings through a slot registry. Before the `CHARACTER_REPLACED` event is emitted, the core compares the previous card with the incoming one for every registered slot:

- **Local only** — the previous card had the binding and the new card does not. The engine writes the local value back silently.
- **Conflict** — both cards define the binding and the values differ. A popup lists every conflicting category and lets the user keep the local value or accept the new card's value, per category.
- **Equal** — the values are deep-equal. Nothing happens.
- **New card only** — the new card's own binding stays untouched (same as a plain import).

## Registering a slot

Owners register one descriptor per binding category from their extension init:

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

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Unique, stable slot id. Letters, digits, `_` and `-` only; must start with a letter. Re-registering the same id logs a warning and replaces the previous descriptor. |
| `label` | `() => string` | User-visible category name, translated by the owner. |
| `read` | `(character) => value \| null` | Pure read from a character object. Must not schedule writes or migrations. |
| `isPresent` | `(value) => boolean` | Whether the value counts as configured by the user. |
| `summarize` | `(value) => string` | One-line summary for this side of the conflict popup. |
| `write` | `async (characterId, value) => void` | Writes the value back. `characterId` is the index into `context.characters`. |

`registerCardBindingSlot` throws when the descriptor is missing a required function, so mistakes surface at load time instead of during a replacement.

## Write responsibility

`write` receives only the value produced by `read`. It is the owner's job to:

- resolve the character via `context.characters[characterId]`;
- merge sibling keys — `context.writeExtensionField` replaces the whole namespace value, so read the current blob and spread it before overlaying the preserved key;
- throw on failure. The engine toasts the failure and continues with the remaining slots; it never blocks the replacement.

## Disabled plugins

Slots are registered from extension init. A disabled or unloaded plugin never registers its slot, so its card binding is not preserved during a replacement. This is intentional: the engine does not hard-code plugin field semantics. Core bindings (bound presets, dedicated personas) are always protected.

## Runtime position

The engine runs inside the replace flow, after the new card is loaded into memory and before `CHARACTER_REPLACED` listeners are notified. Writes therefore land before any plugin reacts to the event. When a bound preset was preserved, the engine also re-runs the character-bound preset application so the current chat adopts the kept default.
