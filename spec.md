# AI 委員會（AI Committee）規格書

## 1. 目標與範圍
本專案提供一個「多模型 AI 辯論系統」，由多位 AI 成員依角色規則進行多輪討論，並透過 SSE 即時串流前端顯示。

範圍包含：
- 後端 API（Express + SSE）
- 辯論流程控制（DebateController）
- Copilot SDK session 管理
- 純前端頁面與互動

不在範圍：使用者帳號/登入、資料永久儲存、權限控管。

## 2. 系統需求
- Node.js 18+（內建於 macOS App 或自行安裝）
- GitHub Copilot CLI 已安裝並可使用
- （可選）Gemini CLI（若要使用 Gemini 模型，透過 A2C 協議調用）

## 2.1 可用模型

### Copilot CLI
| 模型 | 點數 |
| --- | --- |
| Claude Sonnet 4.5 (default) | 1 |
| Claude Haiku 4.5 (requires enablement) | 0.33 |
| Claude Opus 4.5 | 3 |
| Gemini 3 Pro | 1 |
| GPT-5.2-Codex | 1 |
| GPT-5.1-Codex-Mini | 0.33 |
| GPT-5 mini | 0 |
| GPT-4.1 | 0 |

### Gemini CLI (透過 A2C 協議)
| 模型 | 點數 |
| --- | --- |
| Gemini 3 Flash Preview | Unknown |
| Gemini 3 Pro Preview | Unknown |
| Gemini 2.5 Pro | Unknown |
| Gemini 2.5 Flash | Unknown |

## 3. 模組與職責

### 3.1 Express 伺服器（src/index.ts）
- 提供 HTTP API 與 SSE
- 管理 DebateController 實例
- 靜態服務前端（public/）

### 3.2 DebateController（src/debate.ts）
- 建立辯論 session、控制輪次與狀態
- 產生提示詞（prompt）
- 收集並保存發言（Statement）
- 發送辯論事件（DebateEvent）

### 3.3 Copilot Client（src/client.ts）
- 封裝 Copilot SDK
- 管理多個成員 session
- 控制可用工具（web_search / web_fetch）

### 3.4 前端（public/）
- 顯示設定與辯論流程
- 以 SSE 即時接收內容
- 支援增刪成員與角色配置

## 4. 資料模型

### 4.1 CommitteeMember
- id: string
- name: string
- model: ModelId
- cli: CliService (copilot | gemini)
- role: committee | tenth_man | secretary | arbiter
- customPrompt?: string

### 4.2 DebateConfig
- topic: string
- maxRounds: number
- members: CommitteeMember[]
- hasSecretary: boolean
- hasArbiter: boolean
- enableWebSearch: boolean

### 4.3 Statement
- round: number
- memberId: string
- memberName: string
- role: MemberRole
- content: string
- timestamp: Date

### 4.4 DebateSession
- id: string
- config: DebateConfig
- status: idle | debating | secretary_summarizing | arbiter_concluding | completed
- currentRound: number
- statements: Statement[]
- secretarySummary?: string
- arbiterConclusion?: string
- createdAt: Date

## 5. API 規格

### GET /api/models
回傳可用模型與預設配置。

Response:
```
{ "models": string[], "default": StartDebateRequest }
```

### GET /api/debate/status
回傳目前辯論狀態與完整 session。

Response:
```
{ "active": boolean, "sessionId"?: string, "status"?: string, ... }
```

### POST /api/debate/start
建立新的辯論 session。

Request:
```
{ "topic": string, "maxRounds": number, "members": CommitteeMember[], "enableWebSearch"?: boolean }
```

Response:
```
{ "success": true, "sessionId": string, "message": string }
```

### POST /api/debate/run
執行完整辯論流程（非同步）。

Response:
```
{ "success": true, "message": "Debate running..." }
```

### POST /api/debate/stop
停止辯論並釋放資源。

Response:
```
{ "success": true, "message": "Debate stopped" }
```

### GET /api/events (SSE)
SSE 事件流。

事件：
- connected
- debate_event
- statement_delta
- statement_complete
- error

## 6. SSE 事件 payload

### debate_event
- debate_started
- debate_ended
- status_changed
- round_started
- round_ended
- member_speaking
- statement_added

### statement_delta
```
{ memberId, memberName, role, round, delta }
```

### statement_complete
完整 Statement

## 7. 辯論流程
1. /api/debate/start 建立 session
2. /api/debate/run 開始執行：
   - status: debating
   - 每輪依序：committee -> tenth_man
3. 若有書記官：產生摘要
4. 若有仲裁者：產生結論
5. status: completed
6. 發出 debate_ended

## 8. 前端流程
- 取得模型與預設配置
- 由使用者設定成員與角色
- 觸發 start -> run
- 透過 SSE 即時更新畫面

## 9. 錯誤處理
- 無 topic: /api/debate/start 回 400
- 無 active session: /api/debate/run 回 400
- SSE error 事件用於前端顯示

## 10. 限制
- 不保存歷史辯論紀錄
- 不支援並行多個 session
- 需要 Copilot CLI 登入狀態
