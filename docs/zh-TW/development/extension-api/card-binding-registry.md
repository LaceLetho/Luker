# 卡繫結保護

使用者在角色管理選單中執行**取代／更新**時，新卡檔案會覆蓋舊卡 PNG。沒有保護機制時，存在 `data.extensions.*` 裡的本地繫結——繫結的對話補全預設、角色專屬人設、編排的本卡預設、記憶圖訂製、CardApp 開關——都會隨舊卡一起遺失。

Luker 透過槽位登錄表保護這些繫結。在 `CHARACTER_REPLACED` 事件發出前，核心會針對每個已登錄槽位比較舊卡和新卡：

- **僅舊卡有** —— 舊卡設定了該繫結，新卡沒有。引擎靜默寫回本地值。
- **衝突** —— 兩張卡都定義了該繫結且值不同。彈窗逐類列出衝突項，使用者可按類選擇保留本地值或採用新卡的值。
- **相同** —— 值深度相等，不做任何處理。
- **僅新卡有** —— 新卡自帶的繫結原樣保留（與一般匯入一致）。

## 登錄槽位

屬主在擴充 init 中為每個繫結類別登錄一個描述元：

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

| 欄位 | 類型 | 說明 |
| --- | --- | --- |
| `id` | `string` | 唯一且穩定的槽位 id。僅允許字母、數字、`_` 與 `-`，且必須以字母開頭。重複登錄同一 id 會印出警告並覆蓋舊描述元。 |
| `label` | `() => string` | 使用者可見的類別名稱，由屬主負責翻譯。 |
| `read` | `(character) => value \| null` | 從角色物件純讀取，不得排程寫入或遷移。 |
| `isPresent` | `(value) => boolean` | 該值是否算作「使用者設定過」。 |
| `summarize` | `(value) => string` | 衝突彈窗中該側的一行摘要。 |
| `write` | `async (characterId, value) => void` | 寫回值。`characterId` 是 `context.characters` 的索引。 |

描述元缺少必需函式時 `registerCardBindingSlot` 會直接拋錯，讓錯誤在載入期暴露，而不是等到取代發生。

## 寫回責任

`write` 只收到 `read` 產出的值。屬主需要：

- 透過 `context.characters[characterId]` 解析角色；
- 合併兄弟鍵——`context.writeExtensionField` 會整體置換該命名空間的值，先讀取目前資料再展開、覆蓋被保護的鍵；
- 失敗時拋錯。引擎會 toast 報錯並繼續處理其餘槽位，絕不阻斷取代。

## 已停用的擴充

槽位在擴充 init 時登錄。被停用或未載入的擴充不會登錄槽位，因此其卡繫結在取代時不受保護。這是刻意設計：引擎不硬編碼擴充的欄位語意。核心繫結（繫結預設、角色專屬人設）始終受保護。

## 執行期位置

引擎在取代流程內部執行，位於新卡載入記憶體之後、`CHARACTER_REPLACED` 監聽器被通知之前。因此寫入發生在任何擴充回應事件之前。當繫結預設被保留時，引擎還會重新套用角色卡繫結預設，讓目前工作階段採用保留的預設值。
