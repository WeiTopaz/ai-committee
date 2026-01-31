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

export const PRESET_CONFIGS: PresetConfig[] = [
  {
    id: "free-5-gpt",
    name: "免費仔5人團 (Copilot GPT-5 mini)",
    description: "2正方 + 1反方 + 1書記官 + 1仲裁者",
    members: [
      { name: "委員 A", model: "gpt-5-mini", cli: "copilot", role: "committee", customPrompt: "" },
      { name: "委員 B", model: "gpt-5-mini", cli: "copilot", role: "committee", customPrompt: "" },
      { name: "第十人", model: "gpt-5-mini", cli: "copilot", role: "tenth_man", customPrompt: "" },
      { name: "書記官", model: "gpt-5-mini", cli: "copilot", role: "secretary", customPrompt: "" },
      { name: "仲裁者", model: "gpt-5-mini", cli: "copilot", role: "arbiter", customPrompt: "" },
    ],
  },
  {
    id: "free-10-gpt",
    name: "免費仔10人團 (Copilot GPT-5 mini)",
    description: "6正方 + 2反方 + 1書記官 + 1仲裁者",
    members: [
      { name: "委員 A", model: "gpt-5-mini", cli: "copilot", role: "committee", customPrompt: "" },
      { name: "委員 B", model: "gpt-5-mini", cli: "copilot", role: "committee", customPrompt: "" },
      { name: "委員 C", model: "gpt-5-mini", cli: "copilot", role: "committee", customPrompt: "" },
      { name: "委員 D", model: "gpt-5-mini", cli: "copilot", role: "committee", customPrompt: "" },
      { name: "委員 E", model: "gpt-5-mini", cli: "copilot", role: "committee", customPrompt: "" },
      { name: "委員 F", model: "gpt-5-mini", cli: "copilot", role: "committee", customPrompt: "" },
      { name: "第十人 A", model: "gpt-5-mini", cli: "copilot", role: "tenth_man", customPrompt: "" },
      { name: "第十人 B", model: "gpt-5-mini", cli: "copilot", role: "tenth_man", customPrompt: "" },
      { name: "書記官", model: "gpt-5-mini", cli: "copilot", role: "secretary", customPrompt: "" },
      { name: "仲裁者", model: "gpt-5-mini", cli: "copilot", role: "arbiter", customPrompt: "" },
    ],
  },
  {
    id: "free-5-gemini-mix",
    name: "免費仔5人團 (Gemini Flash+Pro)",
    description: "2正方(Flash) + 1反方(Flash) + 1書記官(Pro) + 1仲裁者(Pro)",
    members: [
      { name: "委員 A", model: "gemini-3-flash-preview", cli: "gemini", role: "committee", customPrompt: "" },
      { name: "委員 B", model: "gemini-3-flash-preview", cli: "gemini", role: "committee", customPrompt: "" },
      { name: "第十人", model: "gemini-3-flash-preview", cli: "gemini", role: "tenth_man", customPrompt: "" },
      { name: "書記官", model: "gemini-3-pro-preview", cli: "gemini", role: "secretary", customPrompt: "" },
      { name: "仲裁者", model: "gemini-3-pro-preview", cli: "gemini", role: "arbiter", customPrompt: "" },
    ],
  },
  {
    id: "free-10-gemini-pro",
    name: "免費仔10人團 (Gemini 全3 Pro)",
    description: "6正方 + 2反方 + 1書記官 + 1仲裁者 (全Pro)",
    members: [
      { name: "委員 A", model: "gemini-3-pro-preview", cli: "gemini", role: "committee", customPrompt: "" },
      { name: "委員 B", model: "gemini-3-pro-preview", cli: "gemini", role: "committee", customPrompt: "" },
      { name: "委員 C", model: "gemini-3-pro-preview", cli: "gemini", role: "committee", customPrompt: "" },
      { name: "委員 D", model: "gemini-3-pro-preview", cli: "gemini", role: "committee", customPrompt: "" },
      { name: "委員 E", model: "gemini-3-pro-preview", cli: "gemini", role: "committee", customPrompt: "" },
      { name: "委員 F", model: "gemini-3-pro-preview", cli: "gemini", role: "committee", customPrompt: "" },
      { name: "第十人 A", model: "gemini-3-pro-preview", cli: "gemini", role: "tenth_man", customPrompt: "" },
      { name: "第十人 B", model: "gemini-3-pro-preview", cli: "gemini", role: "tenth_man", customPrompt: "" },
      { name: "書記官", model: "gemini-3-pro-preview", cli: "gemini", role: "secretary", customPrompt: "" },
      { name: "仲裁者", model: "gemini-3-pro-preview", cli: "gemini", role: "arbiter", customPrompt: "" },
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
