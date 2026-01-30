/**
 * AI Committee Types
 */

// 可用模型列表
export const AVAILABLE_MODELS = [
  "gpt-4.1",
  "gpt-5",
  "gpt-5-mini",
  "gpt-5.1",
  "gpt-5.1-codex",
  "gpt-5.2",
  "claude-sonnet-4.5",
  "claude-haiku-4.5",
  "claude-opus-4.5",
  "gemini-3-pro-preview",
] as const;

export type ModelId = (typeof AVAILABLE_MODELS)[number];

// 委員角色
export type MemberRole = "committee" | "tenth_man" | "secretary" | "arbiter";

// 委員會成員
export interface CommitteeMember {
  id: string;
  name: string;
  model: ModelId;
  role: MemberRole;
  customPrompt?: string; // 自訂 system prompt
}

// 辯論配置
export interface DebateConfig {
  topic: string;
  maxRounds: number;
  members: CommitteeMember[];
  hasSecretary: boolean;
  hasArbiter: boolean;
  enableWebSearch: boolean; // 是否啟用網路搜尋
}

// 發言記錄
export interface Statement {
  round: number;
  memberId: string;
  memberName: string;
  role: MemberRole;
  content: string;
  timestamp: Date;
  webSearchUsed?: boolean; // 是否使用了網路搜尋
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
    { name: "委員 A", model: "gpt-5-mini", role: "committee", customPrompt: "" },
    { name: "委員 B", model: "gpt-5-mini", role: "committee", customPrompt: "" },
    { name: "委員 C", model: "gpt-5-mini", role: "committee", customPrompt: "" },
    { name: "委員 D", model: "gpt-5-mini", role: "committee", customPrompt: "" },
    { name: "第十人", model: "gpt-5-mini", role: "tenth_man", customPrompt: "" },
    { name: "書記官", model: "gpt-5-mini", role: "secretary", customPrompt: "" },
    { name: "仲裁者", model: "gpt-5-mini", role: "arbiter", customPrompt: "" },
  ],
};
