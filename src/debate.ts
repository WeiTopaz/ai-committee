/**
 * 辯論流程控制器
 */

import { randomUUID } from "crypto";
import { CommitteeClient } from "./client.js";
import {
  DebateConfig,
  DebateSession,
  DebateStatus,
  Statement,
  CommitteeMember,
  StartDebateRequest,
} from "./types.js";

export class DebateController {
  private client: CommitteeClient;
  private session: DebateSession | null = null;
  private eventCallbacks: ((event: DebateEvent) => void)[] = [];

  constructor() {
    this.client = new CommitteeClient();
  }

  /**
   * 訂閱辯論事件
   */
  onEvent(callback: (event: DebateEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  private emit(event: DebateEvent): void {
    for (const cb of this.eventCallbacks) {
      cb(event);
    }
  }

  /**
   * 開始新的辯論
   */
  async startDebate(request: StartDebateRequest): Promise<DebateSession> {
    // 如果有進行中的辯論，先結束
    if (this.session) {
      await this.endDebate();
    }

    // 啟動 client
    await this.client.start();

    // 設定是否啟用 web search
    this.client.setWebSearchEnabled(request.enableWebSearch ?? true);

    // 為每個成員分配 ID
    const members: CommitteeMember[] = request.members.map((m) => ({
      ...m,
      id: randomUUID(),
    }));

    const config: DebateConfig = {
      topic: request.topic,
      maxRounds: request.maxRounds,
      members,
      hasSecretary: members.some((m) => m.role === "secretary"),
      hasArbiter: members.some((m) => m.role === "arbiter"),
      enableWebSearch: request.enableWebSearch ?? true,
    };

    // 創建所有成員的 session
    await this.client.createAllSessions(members);

    this.session = {
      id: randomUUID(),
      config,
      status: "idle",
      currentRound: 0,
      statements: [],
      createdAt: new Date(),
    };

    this.emit({ type: "debate_started", session: this.session });

    return this.session;
  }

  /**
   * 執行完整辯論流程
   */
  async runFullDebate(
    onStatement?: (statement: Statement, delta?: string) => void
  ): Promise<DebateSession> {
    if (!this.session) {
      throw new Error("No active debate session");
    }

    this.session.status = "debating";
    this.emit({ type: "status_changed", status: "debating" });

    // 執行辯論輪次
    for (let round = 1; round <= this.session.config.maxRounds; round++) {
      this.session.currentRound = round;
      this.emit({ type: "round_started", round });

      await this.executeRound(round, onStatement);

      this.emit({ type: "round_ended", round });
    }

    // 書記官整理
    if (this.session.config.hasSecretary) {
      this.session.status = "secretary_summarizing";
      this.emit({ type: "status_changed", status: "secretary_summarizing" });

      const secretary = this.session.config.members.find(
        (m) => m.role === "secretary"
      );
      if (secretary) {
        const summary = await this.getSecretarySummary(secretary, onStatement);
        this.session.secretarySummary = summary;
      }
    }

    // 仲裁者總結
    if (this.session.config.hasArbiter) {
      this.session.status = "arbiter_concluding";
      this.emit({ type: "status_changed", status: "arbiter_concluding" });

      const arbiter = this.session.config.members.find(
        (m) => m.role === "arbiter"
      );
      if (arbiter) {
        const conclusion = await this.getArbiterConclusion(
          arbiter,
          onStatement
        );
        this.session.arbiterConclusion = conclusion;
      }
    }

    this.session.status = "completed";
    this.emit({ type: "status_changed", status: "completed" });
    this.emit({ type: "debate_ended", session: this.session });

    return this.session;
  }

  /**
   * 執行單一輪次
   */
  private async executeRound(
    round: number,
    onStatement?: (statement: Statement, delta?: string) => void
  ): Promise<void> {
    if (!this.session) return;

    const debaters = getDebaters(this.session.config.members);

    for (const member of debaters) {
      const prompt = buildDebatePrompt(
        member,
        this.session.config.topic,
        round,
        this.session.statements
      );

      this.emit({ type: "member_speaking", member, round });

      const statement = createStatement(member, round);

      const content = await this.client.sendToMember(
        member.id,
        prompt,
        (delta) => {
          if (onStatement) {
            onStatement(statement, delta);
          }
        }
      );

      statement.content = content;
      this.session.statements.push(statement);

      if (onStatement) {
        onStatement(statement);
      }

      this.emit({ type: "statement_added", statement });
    }
  }

  /**
   * 建構辯論提示
   */
  private buildDebatePrompt(member: CommitteeMember, round: number): string {
    if (!this.session) return "";
    return buildDebatePrompt(
      member,
      this.session.config.topic,
      round,
      this.session.statements
    );
  }

  /**
   * 書記官總結
   */
  private async getSecretarySummary(
    secretary: CommitteeMember,
    onStatement?: (statement: Statement, delta?: string) => void
  ): Promise<string> {
    if (!this.session) return "";

    const prompt = buildSecretaryPrompt(
      this.session.config.topic,
      this.session.statements
    );
    const statement = createStatement(secretary, 0);

    this.emit({ type: "member_speaking", member: secretary, round: 0 });

    const content = await this.client.sendToMember(
      secretary.id,
      prompt,
      (delta) => {
        if (onStatement) {
          onStatement(statement, delta);
        }
      }
    );

    statement.content = content;

    if (onStatement) {
      onStatement(statement);
    }

    return content;
  }

  /**
   * 仲裁者結論
   */
  private async getArbiterConclusion(
    arbiter: CommitteeMember,
    onStatement?: (statement: Statement, delta?: string) => void
  ): Promise<string> {
    if (!this.session) return "";

    const prompt = buildArbiterPrompt(
      this.session.config.topic,
      this.session.statements,
      this.session.secretarySummary
    );
    const statement = createStatement(arbiter, 0);

    this.emit({ type: "member_speaking", member: arbiter, round: 0 });

    const content = await this.client.sendToMember(
      arbiter.id,
      prompt,
      (delta) => {
        if (onStatement) {
          onStatement(statement, delta);
        }
      }
    );

    statement.content = content;

    if (onStatement) {
      onStatement(statement);
    }

    return content;
  }

  /**
   * 結束辯論
   */
  async endDebate(): Promise<void> {
    await this.client.destroyAllSessions();
    this.session = null;
    this.eventCallbacks = [];
  }

  /**
   * 停止並清理
   */
  async shutdown(): Promise<void> {
    await this.endDebate();
    await this.client.stop();
  }

  getSession(): DebateSession | null {
    return this.session;
  }
}

// 辯論事件類型
export type DebateEvent =
  | { type: "debate_started"; session: DebateSession }
  | { type: "debate_ended"; session: DebateSession }
  | { type: "status_changed"; status: DebateStatus }
  | { type: "round_started"; round: number }
  | { type: "round_ended"; round: number }
  | { type: "member_speaking"; member: CommitteeMember; round: number }
  | { type: "statement_added"; statement: Statement };

export function getDebaters(members: CommitteeMember[]): CommitteeMember[] {
  const debaters = members.filter(
    (m) => m.role === "committee" || m.role === "tenth_man"
  );
  return debaters.sort((a, b) => {
    if (a.role === "tenth_man") return 1;
    if (b.role === "tenth_man") return -1;
    return 0;
  });
}

export function buildDebatePrompt(
  member: CommitteeMember,
  topic: string,
  round: number,
  statements: Statement[]
): string {
  const previousStatements = statements
    .filter((s) => s.round < round || (s.round === round && s.memberId !== member.id))
    .map((s) => `【${s.memberName}】(第${s.round}輪): ${s.content}`)
    .join("\n\n");

  if (round === 1 && !previousStatements) {
    return `議題：${topic}

這是第 ${round} 輪辯論的開始。請針對此議題發表你的看法。`;
  }

  return `議題：${topic}

目前是第 ${round} 輪辯論。以下是之前的討論內容：

${previousStatements}

請根據以上討論，發表你的看法。`;
}

export function buildSecretaryPrompt(
  topic: string,
  statements: Statement[]
): string {
  const allStatements = statements
    .map((s) => `【${s.memberName}】(第${s.round}輪): ${s.content}`)
    .join("\n\n");

  return `議題：${topic}

以下是完整的辯論記錄：

${allStatements}

請整理這次討論的重點，包括：
1. 各方的主要觀點
2. 討論中的關鍵轉折點
3. 觀點的變化走向
4. 總結摘要`;
}

export function buildArbiterPrompt(
  topic: string,
  statements: Statement[],
  secretarySummary?: string
): string {
  const allStatements = statements
    .map((s) => `【${s.memberName}】(第${s.round}輪): ${s.content}`)
    .join("\n\n");

  const summaryBlock = secretarySummary
    ? `\n\n書記官整理：\n${secretarySummary}`
    : "";

  return `議題：${topic}

以下是完整的辯論記錄：

${allStatements}
${summaryBlock}

作為仲裁者，請根據所有討論內容，給出你的最終裁決：
1. 綜合評估各方觀點
2. 你個人的判斷和立場
3. 明確的結論或建議
4. 裁決理由`;
}

export function createStatement(
  member: CommitteeMember,
  round: number
): Statement {
  return {
    round,
    memberId: member.id,
    memberName: member.name,
    role: member.role,
    content: "",
    timestamp: new Date(),
  };
}
