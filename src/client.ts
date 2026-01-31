/**
 * CopilotClient 封裝 - 管理多個 AI Session
 * 支援 Copilot CLI 與 Gemini CLI（透過 A2C 協議）
 */

import { CopilotClient, SessionEvent } from "@github/copilot-sdk";
import { MemberRole, CommitteeMember, CliService, ROLE_PROMPTS } from "./types.js";

interface MemberSession {
  member: CommitteeMember;
  session: Awaited<ReturnType<CopilotClient["createSession"]>>;
}

export class CommitteeClient {
  private client: CopilotClient;
  private sessions: Map<string, MemberSession> = new Map();
  private started = false;
  private enableWebSearch = true;

  constructor() {
    this.client = new CopilotClient({
      cliArgs: ["--no-custom-instructions"],
    });
  }

  async start(): Promise<void> {
    if (!this.started) {
      await this.client.start();
      this.started = true;
    }
  }

  async stop(): Promise<void> {
    for (const [id, memberSession] of this.sessions) {
      try {
        await memberSession.session.destroy();
      } catch (e) {
        console.error(`Failed to destroy session ${id}:`, e);
      }
    }
    this.sessions.clear();

    if (this.started) {
      await this.client.stop();
      this.started = false;
    }
  }

  setWebSearchEnabled(enabled: boolean): void {
    this.enableWebSearch = enabled;
  }

  /**
   * 為委員會成員創建 session
   * 根據 CLI 類型選擇不同的模型調用方式
   */
  async createMemberSession(member: CommitteeMember): Promise<void> {
    const systemContent = this.getSystemMessage(member);

    // 設定可用的內建工具 (web search 和 web fetch)
    const availableTools = this.enableWebSearch
      ? ["web_search", "web_fetch"]
      : [];

    // 根據 CLI 類型決定模型 ID
    // Gemini CLI 透過 A2C 協議調用，模型 ID 需加上 gemini: 前綴
    const modelId = member.cli === "gemini"
      ? `gemini:${member.model}`
      : member.model;

    const session = await this.client.createSession({
      model: modelId,
      streaming: true,
      systemMessage: {
        mode: "append",
        content: systemContent,
      },
      availableTools: availableTools.length > 0 ? availableTools : undefined,
    });

    this.sessions.set(member.id, { member, session });
  }

  /**
   * 為所有成員創建 sessions
   */
  async createAllSessions(members: CommitteeMember[]): Promise<void> {
    for (const member of members) {
      await this.createMemberSession(member);
    }
  }

  /**
   * 銷毀所有 sessions
   */
  async destroyAllSessions(): Promise<void> {
    for (const [id, memberSession] of this.sessions) {
      try {
        await memberSession.session.destroy();
      } catch (e) {
        console.error(`Failed to destroy session ${id}:`, e);
      }
    }
    this.sessions.clear();
  }

  /**
   * 向特定成員發送訊息並獲取回應
   */
  async sendToMember(
    memberId: string,
    prompt: string,
    onDelta?: (chunk: string) => void
  ): Promise<string> {
    const memberSession = this.sessions.get(memberId);
    if (!memberSession) {
      throw new Error(`Member session not found: ${memberId}`);
    }

    return new Promise<string>((resolve, reject) => {
      let content = "";

      const handler = (event: SessionEvent) => {
        if (event.type === "assistant.message_delta" && onDelta) {
          const delta = event.data.deltaContent ?? "";
          onDelta(delta);
        }
        if (event.type === "assistant.message") {
          content = event.data.content ?? "";
        }
        if (event.type === "session.idle") {
          resolve(content);
        }
      };

      memberSession.session.on(handler);

      memberSession.session.send({ prompt }).catch(reject);
    });
  }



  /**
   * 根據角色產生系統提示
   */
  private getSystemMessage(member: CommitteeMember): string {
    const baseContext = `你是「${member.name}」，參與一個 AI 委員會辯論。
請用繁體中文回答。
${this.enableWebSearch ? "你可以使用網路搜尋 (web_search) 來查找事實、驗證資訊或加強論點。當你需要查證資料或引用最新資訊時，請主動使用此工具。" : ""}`;

    // 如果有自訂 prompt，優先使用
    if (member.customPrompt && member.customPrompt.trim()) {
      return `${baseContext}\n\n${member.customPrompt}`;
    }

    // 嘗試獲取基於名稱的專屬提示
    const rolePrompt = ROLE_PROMPTS[member.name];
    if (rolePrompt) {
      return `${baseContext}\n\n${rolePrompt}`;
    }

    // 回退到基於角色的通用提示
    switch (member.role) {
      case "committee":
        return `${baseContext}
你是正方委員，需要理性分析議題，提出支持的觀點和論據。
在辯論中你應該：
- 提出有建設性的意見
- 回應其他委員的觀點
- 支持有利的論點`;

      case "tenth_man":
        return `${baseContext}
你是「第十人」(Devil's Advocate)，根據「第十人原則」你必須持反對意見。
無論其他人意見如何一致，你都必須：
- 找出可能的漏洞和風險
- 提出反對意見和質疑
- 挑戰主流觀點
- 指出可能被忽略的問題`;

      case "secretary":
        return `${baseContext}
你是書記官，負責記錄和整理討論內容。
你需要：
- 客觀記錄各方觀點
- 整理討論的重點和變化
- 總結各方立場的異同
- 指出討論中的關鍵轉折點`;

      case "arbiter":
        return `${baseContext}
你是仲裁者，在所有討論結束後給出最終裁決。
你需要：
- 綜合考慮所有觀點
- 根據自己的判斷做出結論
- 給出明確的建議或決定
- 解釋你的裁決理由`;

      default:
        return baseContext;
    }
  }

  getMemberSession(memberId: string): MemberSession | undefined {
    return this.sessions.get(memberId);
  }

  getAllMembers(): CommitteeMember[] {
    return Array.from(this.sessions.values()).map((s) => s.member);
  }
}
