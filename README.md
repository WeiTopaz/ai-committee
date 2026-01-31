# 🏛️ AI 委員會 (AI Committee)

Multi-Model Debate System - 多模型 AI 辯論系統

## 功能特色

- **多模型辯論**：可選擇多個 AI 模型同時參與討論
- **多 CLI 支援**：支援 GitHub Copilot CLI 與 Gemini CLI（透過 A2C 協議）
- **角色系統**：
  - 委員（正方）- 支持議題的論點
  - 第十人（反方）- 根據「第十人原則」必須提出反對意見
  - 書記官 - 整理討論摘要與變化走向
  - 仲裁者 - 做出最終裁決
- **自訂功能**：可為每位委員命名、設定個人 System Prompt
- **預設配置**：4 種預設團隊組合，快速開始辯論
- **點數預估**：顯示辯論預估點數消耗
- **網路搜尋**：支援 Web Search 進行事實查核
- **即時串流**：即時顯示 AI 回應

## 系統需求

- macOS 11.0 或更新版本
- GitHub Copilot CLI（需預先安裝）
- （可選）Gemini CLI（若要使用 Gemini 模型）

## 安裝 GitHub Copilot CLI

在使用此應用程式前，請先安裝 GitHub Copilot CLI：

```bash
npm install -g @github/copilot
```

安裝後請確認：
```bash
copilot --version
```

## 安裝 Gemini CLI（可選）

若要使用 Gemini 模型：

```bash
npm install -g @anthropic-ai/gemini-cli
```

## 使用方式

### macOS

1. 確認已安裝 GitHub Copilot CLI
2. **雙擊 `AI委員會.app`** 即可啟動
3. 瀏覽器會自動開啟 http://localhost:3000

### 開發模式

如需修改程式碼：

```bash
cd ai-committee
npm install
npm run dev
```

### 打包（產出 dist/）

```bash
cd ai-committee
npm install
npm run build
```

### 以 dist/ 啟動（正式模式）

```bash
cd ai-committee
npm run build
npm run start
```

### macOS App 內部運作說明

`AI委員會.app` 內含 Node.js runtime 與已編譯的 `dist/`，透過 `Contents/MacOS/launch` 啟動本地伺服器。

### 打包 AI委員會.app 步驟

若需重新打包 macOS App：

```bash
# 1. 先編譯 TypeScript
npm run build

# 2. 清理 App bundle 中舊的檔案
rm -rf "AI委員會.app/Contents/Resources/app/dist"
rm -rf "AI委員會.app/Contents/Resources/app/node_modules"

# 3. 複製編譯後的檔案到 App bundle
cp -r dist "AI委員會.app/Contents/Resources/app/"
cp -r public "AI委員會.app/Contents/Resources/app/"
cp package.json "AI委員會.app/Contents/Resources/app/"
cp package-lock.json "AI委員會.app/Contents/Resources/app/"

# 4. 安裝 production dependencies
cd "AI委員會.app/Contents/Resources/app"
npm install --omit=dev
cd -

# 5. (可選) 如需更新內嵌的 Node.js runtime
# 下載對應 macOS 架構的 Node.js：https://nodejs.org/
# 解壓後複製到 AI委員會.app/Contents/Resources/node/
```

**一鍵打包指令：**
```bash
npm run build && \
rm -rf "AI委員會.app/Contents/Resources/app/dist" "AI委員會.app/Contents/Resources/app/node_modules" && \
cp -r dist public package.json package-lock.json "AI委員會.app/Contents/Resources/app/" && \
cd "AI委員會.app/Contents/Resources/app" && npm install --omit=dev && cd -
```

**App Bundle 結構：**
```
AI委員會.app/
└── Contents/
    ├── Info.plist           # App 描述檔
    ├── MacOS/
    │   └── launch           # 啟動腳本
    └── Resources/
        ├── app/             # 應用程式檔案
        │   ├── dist/        # 編譯後的 JS
        │   ├── public/      # 前端靜態檔案
        │   └── package.json
        └── node/            # 內嵌 Node.js runtime
            └── bin/node
```

### 指令一覽

| 指令 | 說明 |
| --- | --- |
| `npm run dev` | 先 `tsc` 編譯，再以 `node dist/index.js` 啟動 |
| `npm run build` | 只編譯 TypeScript，產出 `dist/` |
| `npm run start` | 以 `dist/index.js` 啟動伺服器 |

### 環境變數

- `PORT`：伺服器埠號，預設 `3000`。

### API 介面（HTTP）

- `GET /api/models`：取得可用模型與預設設定
- `GET /api/debate/status`：取得目前辯論狀態
- `POST /api/debate/start`：開始辯論（需要 topic 與成員設定）
- `POST /api/debate/run`：執行完整辯論流程
- `POST /api/debate/stop`：停止辯論
- `GET /api/events`：SSE 事件串流

### SSE 事件

- `connected`：SSE 連線成功
- `debate_event`：狀態/輪次/成員發言事件（`debate_started`、`status_changed`、`round_started`、`round_ended`、`member_speaking`、`statement_added`、`debate_ended`）
- `statement_delta`：串流中段落增量
- `statement_complete`：單次發言完成
- `error`：伺服器錯誤事件

### 運行注意事項

- 目前不會自動關閉伺服器，請使用 `Ctrl+C` 或關閉執行中的終端機停止。
- macOS App 版在使用者關閉視窗或終止 App 時會停止伺服器。

### 辯論流程概要

1. `POST /api/debate/start` 建立 session
2. `POST /api/debate/run` 執行流程
3. 每輪依序：委員（正方）→ 第十人（反方）
4. 若有書記官：整理摘要；若有仲裁者：給出裁決
5. 透過 SSE 推送狀態與內容到前端

## 預設配置

提供 4 種預設團隊組合：

| 配置名稱 | 成員組成 |
| --- | --- |
| 免費仔5人團 (Copilot GPT-5 mini) | 2正方 + 1反方 + 1書記官 + 1仲裁者 |
| 免費仔10人團 (Copilot GPT-5 mini) | 6正方 + 2反方 + 1書記官 + 1仲裁者 |
| 免費仔5人團 (Gemini Flash+Pro) | 2正方(Flash) + 1反方(Flash) + 1書記官(Pro) + 1仲裁者(Pro) |
| 免費仔10人團 (Gemini 全3 Pro) | 6正方 + 2反方 + 1書記官 + 1仲裁者 (全Pro) |

## 專案結構

```
ai-committee/
├── AI委員會.app/           # macOS 應用程式包（自包含 Node.js）
│   └── Contents/
│       ├── MacOS/launch    # 啟動腳本
│       └── Resources/
│           ├── node/       # 內嵌 Node.js runtime
│           └── app/        # 應用程式檔案
├── src/                    # TypeScript 原始碼
│   ├── index.ts           # Express 伺服器
│   ├── client.ts          # Copilot SDK 封裝
│   ├── debate.ts          # 辯論流程控制
│   └── types.ts           # 類型定義
├── public/                 # 前端檔案
│   ├── index.html
│   ├── style.css          # 莫蘭迪色系設計
│   └── app.js
└── package.json
```

## 可用模型

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


## 技術說明

- 使用 GitHub Copilot SDK for TypeScript
- Express.js 後端
- Server-Sent Events (SSE) 即時通訊
- 純 JavaScript 前端（無框架依賴）
- 支援 Gemini CLI 透過 A2C 協議整合


## 授權

MIT License
