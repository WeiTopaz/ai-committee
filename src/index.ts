/**
 * AI Committee - Express Server
 */

import express, { Request, Response } from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { execSync } from "child_process";
import { DebateController } from "./debate.js";
import {
  COPILOT_MODELS,
  GEMINI_MODELS,
  ALL_MODELS,
  DEFAULT_CONFIG,
  PRESET_CONFIGS,
  StartDebateRequest,
  Statement,
  CliServiceConfig,
} from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(join(__dirname, "../public")));

// 辯論控制器實例
let debateController: DebateController | null = null;

// 儲存 SSE 客戶端
const sseClients: Response[] = [];

let server: import("http").Server | null = null;
let isShuttingDown = false;

/**
 * 偵測 CLI 是否可用
 */
function detectCliAvailability(): { copilot: boolean; gemini: boolean } {
  let copilot = false;
  let gemini = false;

  try {
    execSync("which copilot", { stdio: "ignore" });
    copilot = true;
  } catch {
    // Copilot CLI not found
  }

  try {
    execSync("which gemini", { stdio: "ignore" });
    gemini = true;
  } catch {
    // Gemini CLI not found
  }

  return { copilot, gemini };
}

/**
 * 發送 SSE 事件給所有客戶端
 */
function sendSSE(event: string, data: unknown): void {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(message);
  }
}

async function shutdownServer(reason: string): Promise<void> {
  if (!server || isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  console.log(`\nShutting down... (${reason})`);
  for (const client of sseClients) {
    try {
      client.end();
    } catch {
    }
  }
  sseClients.length = 0;
  if (debateController) {
    await debateController.shutdown();
    debateController = null;
  }
  await new Promise<void>((resolve) => server?.close(() => resolve()));
  process.exit(0);
}

/**
 * GET /api/models - 獲取可用模型列表
 */
app.get("/api/models", (_req: Request, res: Response) => {
  const cliAvailability = detectCliAvailability();

  const services: CliServiceConfig[] = [
    {
      id: "copilot",
      name: "GitHub Copilot CLI",
      available: cliAvailability.copilot,
      models: COPILOT_MODELS,
    },
    {
      id: "gemini",
      name: "Gemini CLI (A2C)",
      available: cliAvailability.gemini,
      models: GEMINI_MODELS,
    },
  ];

  res.json({
    services,
    models: ALL_MODELS,
    presets: PRESET_CONFIGS,
    default: DEFAULT_CONFIG,
  });
});

/**
 * GET /api/debate/status - 獲取當前辯論狀態
 */
app.get("/api/debate/status", (_req: Request, res: Response) => {
  if (!debateController) {
    return res.json({ active: false });
  }

  const session = debateController.getSession();
  if (!session) {
    return res.json({ active: false });
  }

  return res.json({
    active: true,
    sessionId: session.id,
    status: session.status,
    currentRound: session.currentRound,
    maxRounds: session.config.maxRounds,
    topic: session.config.topic,
    members: session.config.members,
    statements: session.statements,
    secretarySummary: session.secretarySummary,
    arbiterConclusion: session.arbiterConclusion,
  });
});

/**
 * POST /api/debate/start - 開始新的辯論
 */
app.post("/api/debate/start", async (req: Request, res: Response) => {
  try {
    const request: StartDebateRequest = req.body;

    if (!request.topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    // 初始化控制器
    debateController = new DebateController();

    // 訂閱事件
    debateController.onEvent((event) => {
      sendSSE("debate_event", event);
    });

    // 開始辯論
    const session = await debateController.startDebate(request);

    res.json({
      success: true,
      sessionId: session.id,
      message: "Debate started. Use /api/debate/run to execute.",
    });

    return;
  } catch (error) {
    console.error("Failed to start debate:", error);
    return res.status(500).json({ error: String(error) });
  }
});

/**
 * POST /api/debate/run - 執行完整辯論流程
 */
app.post("/api/debate/run", async (_req: Request, res: Response) => {
  try {
    if (!debateController) {
      return res.status(400).json({ error: "No active debate. Start one first." });
    }

    // 立即回應，辯論在背景執行
    res.json({ success: true, message: "Debate running..." });

    // 執行辯論
    await debateController.runFullDebate((statement: Statement, delta?: string) => {
      if (delta) {
        sendSSE("statement_delta", {
          memberId: statement.memberId,
          memberName: statement.memberName,
          role: statement.role,
          round: statement.round,
          delta,
        });
      } else {
        sendSSE("statement_complete", statement);
      }
    });

    return;
  } catch (error) {
    console.error("Failed to run debate:", error);
    sendSSE("error", { message: String(error) });
    return;
  }
});

/**
 * POST /api/debate/stop - 停止辯論
 */
app.post("/api/debate/stop", async (_req: Request, res: Response) => {
  try {
    if (debateController) {
      await debateController.shutdown();
      debateController = null;
    }
    res.json({ success: true, message: "Debate stopped" });
  } catch (error) {
    console.error("Failed to stop debate:", error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * GET /api/events - SSE 端點
 */
app.get("/api/events", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // 發送初始連線訊息
  res.write(`event: connected\ndata: {"message": "Connected to SSE"}\n\n`);

  sseClients.push(res);

  req.on("close", () => {
    const index = sseClients.indexOf(res);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
  });
});

/**
 * GET / - 服務前端頁面
 */
app.get("/", (_req: Request, res: Response) => {
  res.sendFile(join(__dirname, "../public/index.html"));
});

// 啟動伺服器
server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║         AI Committee Server                ║
║                                            ║
║  🌐 http://localhost:${PORT}                  ║
║                                            ║
║  API Endpoints:                            ║
║  • GET  /api/models        - 模型列表       ║
║  • GET  /api/debate/status - 辯論狀態       ║
║  • POST /api/debate/start  - 開始辯論       ║
║  • POST /api/debate/run    - 執行辯論       ║
║  • POST /api/debate/stop   - 停止辯論       ║
║  • GET  /api/events        - SSE 事件       ║
╚════════════════════════════════════════════╝
`);
});

// 優雅關閉
process.on("SIGINT", async () => {
  await shutdownServer("SIGINT");
});

process.on("SIGTERM", async () => {
  await shutdownServer("SIGTERM");
});
