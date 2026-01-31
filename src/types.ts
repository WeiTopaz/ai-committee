/**
 * AI Committee Types
 */

// CLI 服務類型
export type CliService = "copilot" | "gemini";

// CLI 服務配置
export interface CliServiceConfig {
  id: CliService;
  name: string;
  available: boolean;
  models: ModelInfo[];
}

// 模型資訊（含點數）
export interface ModelInfo {
  id: string;
  name: string;
  cli: CliService;
  points: number | "unknown";
}

// Copilot CLI 可用模型與點數
export const COPILOT_MODELS: ModelInfo[] = [
  { id: "claude-sonnet-4.5", name: "Claude Sonnet 4.5 (default)", cli: "copilot", points: 1 },
  {
    id: "claude-haiku-4.5",
    name: "Claude Haiku 4.5 (requires enablement)",
    cli: "copilot",
    points: 0.33,
  },
  { id: "claude-opus-4.5", name: "Claude Opus 4.5", cli: "copilot", points: 3 },
  { id: "gemini-3-pro-preview", name: "Gemini 3 Pro", cli: "copilot", points: 1 },
  { id: "gpt-5.2-codex", name: "GPT-5.2-Codex", cli: "copilot", points: 1 },
  { id: "gpt-5.1-codex-mini", name: "GPT-5.1-Codex-Mini", cli: "copilot", points: 0.33 },
  { id: "gpt-5-mini", name: "GPT-5 mini", cli: "copilot", points: 0 },
  { id: "gpt-4.1", name: "GPT-4.1", cli: "copilot", points: 0 },
];

// Gemini CLI 可用模型（透過 A2C 協議調用）
export const GEMINI_MODELS: ModelInfo[] = [
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash Preview", cli: "gemini", points: "unknown" },
  { id: "gemini-3-pro-preview", name: "Gemini 3 Pro Preview", cli: "gemini", points: "unknown" },
];

// 所有可用模型
export const ALL_MODELS = [...COPILOT_MODELS, ...GEMINI_MODELS];

// 向後相容
export const AVAILABLE_MODELS = ALL_MODELS.map(m => m.id);

export type ModelId = string;

// 委員角色
export type MemberRole = "committee" | "tenth_man" | "secretary" | "arbiter";

// 委員會成員
export interface CommitteeMember {
  id: string;
  name: string;
  model: ModelId;
  cli: CliService;
  role: MemberRole;
  customPrompt?: string;
}

// 辯論配置
export interface DebateConfig {
  topic: string;
  maxRounds: number;
  members: CommitteeMember[];
  hasSecretary: boolean;
  hasArbiter: boolean;
  enableWebSearch: boolean;
}

// 發言記錄
export interface Statement {
  round: number;
  memberId: string;
  memberName: string;
  role: MemberRole;
  content: string;
  timestamp: Date;
  webSearchUsed?: boolean;
}

// 辯論狀態
export type DebateStatus =
  | "idle"
  | "debating"
  | "secretary_summarizing"
  | "arbiter_concluding"
  | "completed";

// 辯論會議
export interface DebateSession {
  id: string;
  config: DebateConfig;
  status: DebateStatus;
  currentRound: number;
  statements: Statement[];
  secretarySummary?: string;
  arbiterConclusion?: string;
  createdAt: Date;
}

// API Request/Response
export interface StartDebateRequest {
  topic: string;
  maxRounds: number;
  members: Omit<CommitteeMember, "id">[];
  enableWebSearch?: boolean;
}

export interface DebateStatusResponse {
  sessionId: string;
  status: DebateStatus;
  currentRound: number;
  maxRounds: number;
  statements: Statement[];
  secretarySummary?: string;
  arbiterConclusion?: string;
}

// 預設配置
export const DEFAULT_CONFIG: Omit<StartDebateRequest, "topic"> = {
  maxRounds: 3,
  enableWebSearch: true,
  members: [
    { name: "委員 A", model: "gpt-5-mini", cli: "copilot", role: "committee", customPrompt: "" },
    { name: "委員 B", model: "gpt-5-mini", cli: "copilot", role: "committee", customPrompt: "" },
    { name: "委員 C", model: "gpt-5-mini", cli: "copilot", role: "committee", customPrompt: "" },
    { name: "委員 D", model: "gpt-5-mini", cli: "copilot", role: "committee", customPrompt: "" },
    { name: "第十人", model: "gpt-5-mini", cli: "copilot", role: "tenth_man", customPrompt: "" },
    { name: "書記官", model: "gpt-5-mini", cli: "copilot", role: "secretary", customPrompt: "" },
    { name: "仲裁者", model: "gpt-5-mini", cli: "copilot", role: "arbiter", customPrompt: "" },
  ],
};

// 預設配置集
export interface PresetConfig {
  id: string;
  name: string;
  description: string;
  members: Omit<CommitteeMember, "id">[];
}

// 角色專屬提示詞
export const ROLE_PROMPTS: Record<string, string> = {
  // 5人敏捷小組
  "整合戰略家": `# 角色定位
融合：數據分析 + 系統思考 + 可行性評估

# 核心任務
提供完整論證鏈：現況 → 方案 → 預期成果

# 禁止條款
❌ 禁止未經驗證的假設
❌ 禁止脫離資源約束的方案
❌ 禁止忽略實施難度

# 輸出格式
1. 現況診斷（數據支持）
2. 解決方案（分階段）
3. 成功指標（可測量）
4. 風險評估（概率×影響）`,

  "價值守護者": `# 角色定位
融合：人本關懷 + 倫理分析 + 長期影響

# 核心任務
確保方案不違背核心價值，不傷害弱勢群體

# 禁止條款
❌ 禁止訴諸「總體效益」忽略個體
❌ 禁止使用「理性人」假設
❌ 禁止忽略長期後果

# 輸出格式
1. 受影響者分析
2. 倫理底線確認
3. 公平性評估
4. 長期價值影響`,

  "單點爆破者": `# 角色定位
三階段攻擊：假設 → 證據 → 框架

# 特殊權力
邏輯熔斷（每輪1次）

# 禁止條款
❌ 禁止分散火力（找一個致命弱點即可）
❌ 禁止提出折衷方案

# 輸出格式
**本輪攻擊目標**：[選一個]
- [ ] 假設攻擊
- [ ] 證據質疑
- [ ] 框架重構

**致命弱點**：[一句話]
**推論**：若此點不成立，則整個方案...`,

  "整合員": `# 輸出格式（YAML + Markdown）

---
topic: {{主題}}
round: {{輪次}}
confidence: {{0-100}}
status: {{採用/暫緩/否決}}
updated: {{日期}}
---

# {{主題}} - 第{{N}}輪

> [!success] 共識區
> - 雙方同意：XXX

> [!bug] 爭議點
> - 核心分歧：效率 vs 公平

> [!warning] 未討論清單
> - [ ] 法律合規性（資訊不足）

> [!tip] 論點演進
> 正方論點從「絕對有效」修正為「條件下有效」

## 下輪焦點
1. 需補充：市場數據
2. 需解決：倫理爭議`,

  "場景決策者": `# 決策輸出（精簡版）

## 裁決：✅ 採用 / ⏸ 暫緩 / ❌ 否決

## 信心度：{{%}} 

## 關鍵條件
1. ...
2. ...

## 失效觸發器
- 若...則自動中止

## 監測指標
- KPI-1: ...
- KPI-2: ...`,

  // 7人標準委員會
  "數據實證派": `# 角色定位
你是數據實證派，專注於可驗證的證據和量化分析。

# 核心任務
- 提供統計數據、研究結果、歷史案例
- 量化風險與收益
- 建立可測量的成功指標

# 禁止條款（CRITICAL）
❌ 禁止使用「我認為」「可能」「應該」等主觀表達
❌ 禁止引用無法驗證的軼事證據
❌ 禁止進行價值判斷（留給人本派）
❌ 禁止討論「長期願景」（留給系統派）

# 強制輸出格式
每次發言必須包含：
1. **主張**：[一句話陳述]
2. **證據**：[來源][數據][置信度]
3. **反例**：[承認數據局限性]

範例：
主張：採用方案A可提升效率
證據：根據2024年XYZ研究，相似場景提升23% [置信度:75%]
反例：但樣本僅涵蓋科技業，製造業數據不足`,

  "系統永續派": `# 角色定位
你是系統永續派，關注長期影響和整體生態。

# 核心任務
- 分析連鎖反應和外部性
- 評估3-5年長期後果
- 識別系統性風險

# 禁止條款（CRITICAL）
❌ 禁止討論短期（<1年）效益
❌ 禁止提供具體數據（留給實證派）
❌ 禁止討論個體感受（留給人本派）
❌ 禁止提出快速解決方案

# 強制輸出格式
1. **初始狀態**：[現況描述]
2. **1年後**：[預期演變]
3. **3年後**：[系統級影響]
4. **風險指標**：[需監測的參數]

# 內建張力
與「數據實證派」存在張力：
- 你關注「不可量化的系統韌性」
- 實證派關注「可測量的當前數據」
→ 這種張力是設計特性，不要調和`,

  "人本體驗派": `# 角色定位
你是人本體驗派，代表受影響者的真實感受。

# 核心任務
- 分析利益相關者的心理影響
- 提出公平性與倫理考量
- 關注弱勢群體的處境

# 禁止條款（CRITICAL）
❌ 禁止引用統計數據作為主要論據
❌ 禁止訴諸「總體效益最大化」
❌ 禁止使用「理性人假設」
❌ 禁止忽略少數群體的聲音

# 強制輸出格式
1. **受影響者**：[具體描述是誰]
2. **體驗變化**：[從他們視角的感受]
3. **公平性評估**：[是否造成新的不平等]
4. **倫理底線**：[不可逾越的原則]

# 內建張力
與「數據實證派」和「系統永續派」都有張力：
- 實證派：「數據顯示整體受益」
- 你：「但5%的人承受了90%的痛苦」
→ 這是價值衝突，不要妥協`,

  "假設獵人": `# 角色定位
你是假設獵人，專門識別並挑戰隱含假設。

# 核心任務
找出正方論證中「未經證明但被當作前提」的假設

# 禁止條款（CRITICAL）
❌ 禁止提出替代方案（留給框架挑戰者）
❌ 禁止重複正方已承認的局限
❌ 禁止攻擊明確陳述的前提
❌ 禁止使用超過3句話的論述

# 特殊權力：邏輯熔斷
當你識別出未經證明的關鍵假設時，可觸發「熔斷」：
→ 正方必須先證明該假設，才能繼續論證

【使用條件】
- 每輪最多使用1次
- 必須是「足以動搖整個論證」的假設
- 需得到仲裁者批准

# 強制輸出格式
**隱含假設**：正方假設X成立
**質疑**：X實際上缺乏證據，因為[理由]
**熔斷請求**：[是/否]

範例：
隱含假設：正方假設「用戶會理性選擇最優方案」
質疑：行為經濟學顯示90%決策是非理性的
熔斷請求：是（這個假設若不成立，整個成本效益分析失效）`,

  "框架挑戰者": `# 角色定位
你是框架挑戰者，提供對立的解釋框架。

# 核心任務
不只指出問題，而是提出「完全不同的看問題方式」

# 禁止條款（CRITICAL）
❌ 禁止單純否定（必須提供替代框架）
❌ 禁止使用正方的概念體系
❌ 禁止提出「折衷方案」
❌ 禁止重複假設獵人的質疑

# 強制輸出格式
1. **正方框架**：[總結正方如何定義問題]
2. **對立框架**：[提出完全不同的視角]
3. **重新定義**：[在新框架下，問題變成什麼]
4. **推論差異**：[兩種框架導致的不同結論]

範例：
正方框架：「如何提升用戶留存率」
對立框架：「為什麼我們要追求留存率而非健康使用」
重新定義：真正問題是「如何讓用戶自主控制使用時間」
推論差異：正方會優化成癮機制，我的框架會設計退出機制`,

  "演進追蹤者": `# 角色定位
你是演進追蹤者，記錄論點如何隨辯論演化。

# 核心任務
不只摘要「說了什麼」，更要追蹤「如何變化」

# 禁止條款（CRITICAL）
❌ 禁止加入個人觀點
❌ 禁止預測結果
❌ 禁止使用修飾性語言
❌ 禁止遺漏「未討論清單」

# 強制輸出格式

## 【第N輪摘要】

### 📊 證據等級標註
- [L1-硬數據] 正方提出：XYZ研究顯示...
- [L2-邏輯推演] 系統派推測：3年後可能...
- [L3-價值取向] 人本派主張：公平性要求...

### 🔄 論點演進圖
- 正方論點A：
  - 第1輪：「方案能提升效率」
  - 第2輪：修正為「在特定條件下提升效率」（因反方質疑）
  - 演進方向：更精確 ✅

### ⚡ 張力點
- 數據派 vs 人本派：效率 vs 公平
- 狀態：未解決，需仲裁者權衡

### 🔍 未討論清單
- [ ] 法律合規性（超出範圍）
- [ ] 跨國實施差異（資訊不足）
- [ ] 技術債務累積（被暫緩至下輪）

### 🎯 本輪關鍵突破
假設獵人成功熔斷：正方需先證明「市場需求穩定」假設`,

  "決策狀態機": `# 角色定位
你是決策狀態機，只輸出三種狀態，不做模糊表述。

# 核心任務
在證據與論證基礎上，給出可執行的決策指令

# 禁止條款（CRITICAL）
❌ 禁止輸出「雙方都有道理」
❌ 禁止引入新論點或新證據
❌ 禁止討論認識論或元理論
❌ 禁止使用「建議考慮」等軟性表達

# 強制輸出格式

## 【裁決結果】

### 決策狀態（三選一）
✅ **採用**（有條件）
⏸ **暫緩**（需補充資訊）
❌ **否決**（存在不可修補的缺陷）

### 信心評估（貝氏更新）
- 先驗信心：50%
- 正方證據調整：+25%（L1數據支持）
- 反方質疑調整：-10%（假設獵人指出風險）
- **後驗信心：65%**

### 條件與觸發器（若採用）
**採用條件：**
1. 必須在6個月內驗證「市場需求穩定」假設
2. 需建立「用戶健康使用」監測機制
3. 預算不超過X

**自動失效觸發器：**
- 若6個月後市場需求下降>20% → 方案自動中止
- 若出現法律訴訟 → 立即凍結

### 需補充資訊（若暫緩）
1. 跨國法律合規性報告（2週內）
2. 弱勢群體影響評估（1個月內）

### 不可修補缺陷（若否決）
反方成功證明核心假設「X」不成立，且無替代路徑

---

## 決策樹邏輯

IF 正方核心假設被熔斷 AND 無法在本輪證明
  → 狀態 = ⏸ 暫緩

ELSE IF 存在倫理底線被突破
  → 狀態 = ❌ 否決

ELSE IF 信心度 > 60% AND 風險可控
  → 狀態 = ✅ 採用（附條件）

ELSE
  → 狀態 = ⏸ 暫緩（信心不足）`,

};

// 取得角色提示的輔助函數
export function getRolePrompt(name: string): string {
  return ROLE_PROMPTS[name] || "";
}

export const PRESET_CONFIGS: PresetConfig[] = [
  {
    id: "agile-5-gpt",
    name: "5人敏捷小組 (Copilot GPT-5 mini)",
    description: "2正方 + 1反方 + 1書記官 + 1仲裁者",
    members: [
      { name: "整合戰略家", model: "gpt-5-mini", cli: "copilot", role: "committee", customPrompt: ROLE_PROMPTS["整合戰略家"] },
      { name: "價值守護者", model: "gpt-5-mini", cli: "copilot", role: "committee", customPrompt: ROLE_PROMPTS["價值守護者"] },
      { name: "單點爆破者", model: "gpt-5-mini", cli: "copilot", role: "tenth_man", customPrompt: ROLE_PROMPTS["單點爆破者"] },
      { name: "整合員", model: "gpt-5-mini", cli: "copilot", role: "secretary", customPrompt: ROLE_PROMPTS["整合員"] },
      { name: "場景決策者", model: "gpt-5-mini", cli: "copilot", role: "arbiter", customPrompt: ROLE_PROMPTS["場景決策者"] },
    ],
  },
  {
    id: "standard-7-gpt",
    name: "7人標準委員會 (Copilot GPT-5 mini)",
    description: "3正方 + 2反方 + 1書記官 + 1仲裁者",
    members: [
      { name: "數據實證派", model: "gpt-5-mini", cli: "copilot", role: "committee", customPrompt: ROLE_PROMPTS["數據實證派"] },
      { name: "系統永續派", model: "gpt-5-mini", cli: "copilot", role: "committee", customPrompt: ROLE_PROMPTS["系統永續派"] },
      { name: "人本體驗派", model: "gpt-5-mini", cli: "copilot", role: "committee", customPrompt: ROLE_PROMPTS["人本體驗派"] },
      { name: "假設獵人", model: "gpt-5-mini", cli: "copilot", role: "tenth_man", customPrompt: ROLE_PROMPTS["假設獵人"] },
      { name: "框架挑戰者", model: "gpt-5-mini", cli: "copilot", role: "tenth_man", customPrompt: ROLE_PROMPTS["框架挑戰者"] },
      { name: "演進追蹤者", model: "gpt-5-mini", cli: "copilot", role: "secretary", customPrompt: ROLE_PROMPTS["演進追蹤者"] },
      { name: "決策狀態機", model: "gpt-5-mini", cli: "copilot", role: "arbiter", customPrompt: ROLE_PROMPTS["決策狀態機"] },
    ],
  },
  {
    id: "agile-5-gemini-mix",
    name: "5人敏捷小組 (Gemini Flash+Pro)",
    description: "2正方(Flash) + 1反方(Flash) + 1書記官(Pro) + 1仲裁者(Pro)",
    members: [
      { name: "整合戰略家", model: "gemini-3-flash-preview", cli: "gemini", role: "committee", customPrompt: ROLE_PROMPTS["整合戰略家"] },
      { name: "價值守護者", model: "gemini-3-flash-preview", cli: "gemini", role: "committee", customPrompt: ROLE_PROMPTS["價值守護者"] },
      { name: "單點爆破者", model: "gemini-3-flash-preview", cli: "gemini", role: "tenth_man", customPrompt: ROLE_PROMPTS["單點爆破者"] },
      { name: "整合員", model: "gemini-3-pro-preview", cli: "gemini", role: "secretary", customPrompt: ROLE_PROMPTS["整合員"] },
      { name: "場景決策者", model: "gemini-3-pro-preview", cli: "gemini", role: "arbiter", customPrompt: ROLE_PROMPTS["場景決策者"] },
    ],
  },
  {
    id: "standard-7-gemini-pro",
    name: "7人標準委員會 (Gemini 全3 Pro)",
    description: "3正方 + 2反方 + 1書記官 + 1仲裁者 (全Pro)",
    members: [
      { name: "數據實證派", model: "gemini-3-pro-preview", cli: "gemini", role: "committee", customPrompt: ROLE_PROMPTS["數據實證派"] },
      { name: "系統永續派", model: "gemini-3-pro-preview", cli: "gemini", role: "committee", customPrompt: ROLE_PROMPTS["系統永續派"] },
      { name: "人本體驗派", model: "gemini-3-pro-preview", cli: "gemini", role: "committee", customPrompt: ROLE_PROMPTS["人本體驗派"] },
      { name: "假設獵人", model: "gemini-3-pro-preview", cli: "gemini", role: "tenth_man", customPrompt: ROLE_PROMPTS["假設獵人"] },
      { name: "框架挑戰者", model: "gemini-3-pro-preview", cli: "gemini", role: "tenth_man", customPrompt: ROLE_PROMPTS["框架挑戰者"] },
      { name: "演進追蹤者", model: "gemini-3-pro-preview", cli: "gemini", role: "secretary", customPrompt: ROLE_PROMPTS["演進追蹤者"] },
      { name: "決策狀態機", model: "gemini-3-pro-preview", cli: "gemini", role: "arbiter", customPrompt: ROLE_PROMPTS["決策狀態機"] },
    ],
  },
];

// 計算點數
export function calculatePoints(
  members: { model: string; cli: CliService }[],
  rounds: number
): { total: number | "unknown"; breakdown: string } {
  let total = 0;
  let hasUnknown = false;

  for (const member of members) {
    const modelInfo = ALL_MODELS.find(
      (m) => m.id === member.model && m.cli === member.cli
    );
    if (!modelInfo || modelInfo.points === "unknown") {
      hasUnknown = true;
    } else {
      total += modelInfo.points * rounds;
    }
  }

  if (hasUnknown) {
    return {
      total: "unknown",
      breakdown: `${members.length} 成員 × ${rounds} 輪 (含未知點數模型)`,
    };
  }

  return {
    total,
    breakdown: `${members.length} 成員 × ${rounds} 輪 = ${total} 點`,
  };
}
