# 🏛️ AI 委員會 (AI Committee)

Multi-Model Debate System - 多模型 AI 辯論系統

## 功能特色

- **多模型辯論**：可選擇多個 AI 模型同時參與討論
- **角色系統**：
  - 委員（正方）- 支持議題的論點
  - 第十人（反方）- 根據「第十人原則」必須提出反對意見
  - 書記官 - 整理討論摘要與變化走向
  - 仲裁者 - 做出最終裁決
- **自訂功能**：可為每位委員命名、設定個人 System Prompt
- **網路搜尋**：支援 Web Search 進行事實查核
- **即時串流**：即時顯示 AI 回應

## 系統需求

- macOS 11.0 或更新版本
- GitHub Copilot CLI（需預先安裝）

## 安裝 GitHub Copilot CLI

在使用此應用程式前，請先安裝 GitHub Copilot CLI：

```bash
npm install -g @github/copilot
```

安裝後請確認：
```bash
copilot --version
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

## 預設配置

- 4 位委員（正方）- GPT-5 mini
- 1 位第十人（反方）- GPT-5 mini
- 1 位書記官 - GPT-5 mini
- 1 位仲裁者 - GPT-5 mini
- 最大辯論輪數：3 輪
- 網路搜尋：啟用

## 可用模型

- GPT-4.1, GPT-5, GPT-5 mini
- GPT-5.1, GPT-5.1 Codex, GPT-5.2
- Claude Sonnet 4.5, Claude Haiku 4.5, Claude Opus 4.5
- Gemini 3 Pro Preview


## 技術說明

- 使用 GitHub Copilot SDK for TypeScript
- Express.js 後端
- Server-Sent Events (SSE) 即時通訊
- 純 JavaScript 前端（無框架依賴）

## 授權

MIT License
