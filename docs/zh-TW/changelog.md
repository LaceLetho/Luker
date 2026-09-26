# 更新日誌

> 🚧 完整的更新日誌正在整理中。以下是 Luker 主要版本的功能概覽。

## 當前版本

### 編排器

- **搜尋工具支援正則** —— `draft_search`（新增）以及既有的 `chat_search` / `lorebook_search` / `skill_search` 都接受 `pattern` 參數（JavaScript 正則表達式來源），並回傳 grep `-n` 風格輸出。critic 用它系統性地掃描詞彙模式，而不再仰賴人工通讀。
- **執行階段世界書瀏覽工具** —— 編排執行階段 agent（loop / director 主 agent 與子 agent / agenda agent / spec 節點）新增 `world_book_list`（可見世界書概覽）與 `lorebook_list`（按書索引條目，grep 風格的 `uid name key` 行）；`lorebook_get` 現在也接受 `uid` 作為定位代號，與 `entry_key` 擇一傳入。同步重寫迭代工作台提示詞：編輯器視角與執行階段視角的世界書工具集不再混為一談；並在所有迭代模板中加入一條硬規則，禁止把「執行階段如何注入上下文」之類的元描述寫進執行階段 agent 的提示詞。
- 自訂工具 —— 四個編排模式都能呼叫三種來源的工具：手寫工具、其他 Luker 擴充貢獻的工具，以及橋接進來的 SillyTavern function tool。
- 手寫工具跟隨編排走；角色卡覆寫裡的工具會隨角色卡一起匯出。
- 迭代工作台可查看這些可見的自訂工具，並能按編排逐項啟用或停用。

### 核心功能

- **記憶圖**：基於知識圖譜的長期記憶系統，兩種召回模式：LLM 召回（多輪 LLM 驅動的節點挑選）與 RAG 召回（向量檢索，可選重排與可選查詢改寫）
- **多 Agent 編排**：五種執行模式（Spec 工作流、單 Agent、Agenda 規劃器、Loop、Director）
- **角色卡編輯助手**：AI 驅動的對話式角色卡編輯，7 個工具
- **搜尋外掛**：DuckDuckGo、SearXNG、Brave Search 三引擎支援
- **補全預設助手**：AI 輔助預設編輯，IDE 風格的漂移處理與逐條訊息回滾；新增細粒度工具（str_replace / str_insert / list_insert / list_move），在長欄位編輯中更節省 token
- **Edits 函式庫**（`public/scripts/lib/edits/`）：op 類型的共享結構化編輯原語，帶漂移感知的套用與互動式衝突 UI，並以 ESM / lukerContext / ctx 三種形式暴露給第三方擴充功能。詳見 `docs/zh-TW/development/extension-api/edits-lib.md`。
- **CardApp**：角色卡內嵌互動式應用

### 架構改進

- **預設解耦**：連線參數與預設獨立管理
- **增量同步**：RFC 6902 格式的增量資料傳輸
- **後端即時儲存**：資料變更即時持久化
- **可選資料庫後端**：透過 `storage.mode` 選擇檔案系統（預設）、SQLite、MySQL 或 PostgreSQL；管理面板提供 `fs ↔ sqlite` 雙向遷移，並保留永久備份
- **函式呼叫執行時**：原生 + 純文字兩種模式
- **統一生成層**：多後端統一封裝
- **請求檢查器**：生成請求全生命週期追蹤
- **認證與配額**：GitHub/Discord OAuth + 儲存配額管理

### 使用者體驗

- 角色卡綁定預設與人設
- 提示詞分組 & 預設分組
- 鉤子執行排序
- 世界書啟動鏈路追蹤
- 聊天人設鎖定
- 撤銷 Toast 系統
- 動態模型列表
- 圖像生成增強
- 行動裝置適配最佳化
- 啟動效能最佳化

## 近期破壞性變更

- **搜尋工具 schema 重命名** —— `chat_search`、`lorebook_search`、`skill_search` 現在接受 `pattern`（JavaScript 正則表達式來源）參數，取代原先的 `query`（子字串）。舊的 `limit` / `contextLines` 參數已移除；輸出為 grep `-n` 風格。任何使用者自訂提示詞中硬編碼了 `query: "..."` 的工具呼叫範例，都需要改寫為 `pattern: "..."`。注意：編排器側的 `skill_search`（編排器 agent 使用）已遷移；經由 ToolManager 派發的 `skill_search`（非編排器 SillyTavern function-call agent 使用）為保持向後相容，仍保留子字串 API。

- **CardApp Studio 回滾到獨立全屏 UI**（2026 年 5 月短暫上線的「接入迭代工作台外殼」版本失去了 viewport 所有權，UX 明顯退化）。Studio 現在透過兩塊 `position:fixed` 面板再次接管 viewport，配合行動端 tab、檔案樹、CodeMirror 6 編輯器與對話流內聯的審批卡片 —— 與使用者此前在獨立版本中熟悉的 UX 一致。檔案操作仍然具備 edits-lib 的漂移檢測與單條 inverse —— 這是原獨立版本沒有的新能力。該期間產生的 session 桶（`cardapp_studio_sessions_v2`）首次打開時清空；磁碟上的 CardApp 檔案不受影響。

- **edits-lib 現在支援兩種整合方式**：透過 iteration-studio 外殼適配器封裝，適合彈窗形式的介面；直接用函式庫原語適合全屏 / 自定義 UI。CardApp Studio 是直接用法的倉庫內參考實作。

- **CPA 基於迭代工作台外殼重構**（適配器遷移的收尾一步）。309 行的 `dialog-ui.js` 被刪除；CPA 既有的 IDE 風格業務輔助函式（`handleApplyDraft`、`handleRollbackToMessage`、`handleMessageDiff`）保持不變，現在執行於共享外殼之上。這一步落地後，Luker 中全部五個 AI 驅動的編輯面（編排器、記憶圖、CEA CardApp Studio、CEA 角色編輯器、CPA）共享同一個外殼、同一種儲存模型、同一套 edits-lib 與同一個衝突解決 UI。
- **CEA CardApp Studio 基於迭代工作台外殼重構**（適配器遷移的一部分）。獨立的 session / 彈窗 / diff 基礎設施被 v2 適配器合約取代：`live()` 是唯一權威源，4 個檔案寫入工具經由 `normalizeToolCallToEdit` 路由，2 個檔案讀取工具經由 `executeControlToolCall` 路由，`commit()` 先與上一份快照做 diff，再分發給既有的 `saveFileContent / deleteFile` 輔助函式。舊的 `cardapp_studio_sessions` 角色側 session 桶會在升級後首次開啟時清空；磁碟上的 CardApp 檔案不受影響。
- **CEA 角色編輯器基於迭代工作台外殼重構**（適配器遷移的一部分）。世界書同步分析彈窗被多輪迭代會話替代。一個適配器同時編輯角色卡與世界書；新增 3 個 CEA 自有的 edits-lib 自定義 op（`lorebook_entry_add / update / remove`），以條目 uid 為鍵。外殼現每次開啟時呼叫一次 `adapter.registerCustomOps(registry)`。舊的 `lorebookSyncHistory` 設定項會在首次開啟時被清除；磁碟上的角色卡與世界書資料不受影響。
- **迭代工作台適配器合約 v2（IDE 風格）。** Shell 不再持有 `workingProfile` 快照；適配器的 `live()` 為唯一權威源。已遷移內建 orchestrator + memory-graph 適配器。外部適配器需要相應升級（參見 `docs/zh-TW/development/extension-api/iteration-studio.md`）。升級後首次打開時按適配器清空一次舊的迭代工作台會話數據；實時數據（預設文件、角色卡、設定）不受影響。
- **CPA 會話回滾會在升級時重置。** 基於 journal 的會話模型被替換為 IDE 風格的 live=authority + 逐條訊息 `appliedEdits`。預設檔案本身不變；只有先前會話的 CPA 回滾歷史會遺失。新會話的回滾按新機制正常運作。

---

如需了解具體功能的詳細資訊，請參閱對應的文件頁面。
