/**
 * AI Committee Frontend
 */

// 可用模型、服務與預設配置
let cliServices = [];
let allModels = [];
let presetConfigs = [];
let defaultConfig = null;
let members = [];
let eventSource = null;

// 角色名稱對照
const ROLE_NAMES = {
  committee: "委員",
  tenth_man: "第十人",
  secretary: "書記官",
  arbiter: "仲裁者",
};

const ROLE_ICONS = {
  committee: "👤",
  tenth_man: "😈",
  secretary: "📝",
  arbiter: "⚖️",
};

// DOM 元素
const elements = {
  configPanel: document.getElementById("config-panel"),
  debatePanel: document.getElementById("debate-panel"),
  appVersion: document.getElementById("app-version"),
  topic: document.getElementById("topic"),
  maxRounds: document.getElementById("max-rounds"),
  enableWebSearch: document.getElementById("enable-web-search"),
  presetConfig: document.getElementById("preset-config"),
  membersList: document.getElementById("members-list"),
  addMember: document.getElementById("add-member"),
  resetDefault: document.getElementById("reset-default"),
  startDebate: document.getElementById("start-debate"),
  startBtnText: document.getElementById("start-btn-text"),
  startBtnPoints: document.getElementById("start-btn-points"),
  pointsEstimate: document.getElementById("points-estimate"),
  pointsValue: document.getElementById("points-value"),
  stopDebate: document.getElementById("stop-debate"),
  newDebate: document.getElementById("new-debate"),
  debateStatus: document.getElementById("debate-status"),
  roundInfo: document.getElementById("round-info"),
  webSearchBadge: document.getElementById("web-search-badge"),
  currentTopic: document.getElementById("current-topic"),
  conversation: document.getElementById("conversation"),
  secretarySection: document.getElementById("secretary-section"),
  secretarySummary: document.getElementById("secretary-summary"),
  arbiterSection: document.getElementById("arbiter-section"),
  arbiterConclusion: document.getElementById("arbiter-conclusion"),
};

/**
 * 初始化
 */
async function init() {
  try {
    const response = await fetch("/api/models");
    const data = await response.json();
    cliServices = data.services || [];
    allModels = data.models || [];
    presetConfigs = data.presets || [];
    defaultConfig = data.default;
    if (elements.appVersion && data.version) {
      elements.appVersion.textContent = `v${data.version}`;
    }

    loadPresetOptions();
    loadDefaultMembers();
    setupEventListeners();
    setupShutdownHandlers();
    connectSSE();
    updatePointsEstimate();
  } catch (error) {
    console.error("Failed to initialize:", error);
    alert("初始化失敗: " + error.message);
  }
}

/**
 * 載入預設配置選項
 */
function loadPresetOptions() {
  elements.presetConfig.innerHTML = '<option value="">-- 自訂 --</option>';
  for (const preset of presetConfigs) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.name;
    option.title = preset.description;
    elements.presetConfig.appendChild(option);
  }
}

/**
 * 載入預設成員
 */
function loadDefaultMembers() {
  members = defaultConfig.members.map((m, i) => ({
    ...m,
    id: `member-${i}`,
    cli: m.cli || "copilot",
    customPrompt: m.customPrompt || "",
  }));
  renderMembers();
}

/**
 * 取得模型的點數標示
 */
function getPointsLabel(modelId, cli) {
  const model = allModels.find((m) => m.id === modelId && m.cli === cli);
  if (!model) return "Unknown";
  if (model.points === "unknown") return "Unknown";
  return `x${model.points}`;
}

/**
 * 取得可用的模型（根據 CLI 類型）
 */
function getAvailableModels(cli) {
  return allModels.filter((m) => m.cli === cli);
}

/**
 * 渲染成員列表
 */
function renderMembers() {
  elements.membersList.innerHTML = members
    .map(
      (member, index) => `
    <div class="member-card ${member.role}" data-index="${index}">
      <div class="member-card-header">
        <div class="role-indicator">
          <span class="role-dot"></span>
          <span>${ROLE_ICONS[member.role]} ${ROLE_NAMES[member.role]}</span>
        </div>
        <button class="btn-remove" onclick="removeMember(${index})">✕</button>
      </div>
      <div class="member-card-body">
        <div class="form-group">
          <label>名稱</label>
          <input type="text" class="member-name" value="${member.name}" placeholder="委員名稱" />
        </div>
        <div class="form-group">
          <label>CLI 服務</label>
          <select class="member-cli">
            ${cliServices
          .map(
            (svc) =>
              `<option value="${svc.id}" ${member.cli === svc.id ? "selected" : ""} ${!svc.available ? "disabled" : ""}>
                    ${svc.name}${!svc.available ? " (未安裝)" : ""}
                  </option>`
          )
          .join("")}
          </select>
        </div>
        <div class="form-group">
          <label>模型</label>
          <select class="member-model">
            ${getAvailableModels(member.cli)
          .map(
            (model) =>
              `<option value="${model.id}" ${member.model === model.id ? "selected" : ""}>
                    ${model.name} (${getPointsLabel(model.id, member.cli)})
                  </option>`
          )
          .join("")}
          </select>
        </div>
        <div class="form-group">
          <label>角色</label>
          <select class="member-role">
            <option value="committee" ${member.role === "committee" ? "selected" : ""}>委員 (正方)</option>
            <option value="tenth_man" ${member.role === "tenth_man" ? "selected" : ""}>第十人 (反方)</option>
            <option value="secretary" ${member.role === "secretary" ? "selected" : ""}>書記官</option>
            <option value="arbiter" ${member.role === "arbiter" ? "selected" : ""}>仲裁者</option>
          </select>
        </div>
        <div class="form-group custom-prompt-group">
          <label>自訂指示 (System Prompt) - 選填</label>
          <textarea class="member-custom-prompt" rows="2" placeholder="例如：你是一位保守派經濟學家，傾向自由市場...">${member.customPrompt || ""}</textarea>
        </div>
      </div>
    </div>
  `
    )
    .join("");

  // 綁定變更事件
  document.querySelectorAll(".member-card").forEach((card, index) => {
    card.querySelector(".member-name").addEventListener("change", (e) => {
      members[index].name = e.target.value;
    });

    card.querySelector(".member-cli").addEventListener("change", (e) => {
      members[index].cli = e.target.value;
      // 切換 CLI 後，重設模型為該 CLI 的第一個可用模型
      const availableModels = getAvailableModels(e.target.value);
      if (availableModels.length > 0) {
        members[index].model = availableModels[0].id;
      }
      renderMembers();
      updatePointsEstimate();
    });

    card.querySelector(".member-model").addEventListener("change", (e) => {
      members[index].model = e.target.value;
      updatePointsEstimate();
    });

    card.querySelector(".member-role").addEventListener("change", (e) => {
      members[index].role = e.target.value;
      card.className = `member-card ${e.target.value}`;
      card.querySelector(".role-indicator").innerHTML = `
        <span class="role-dot"></span>
        <span>${ROLE_ICONS[e.target.value]} ${ROLE_NAMES[e.target.value]}</span>
      `;
    });

    card.querySelector(".member-custom-prompt").addEventListener("change", (e) => {
      members[index].customPrompt = e.target.value;
    });
  });

  updatePointsEstimate();
}

/**
 * 計算點數估計
 */
function calculatePoints() {
  const rounds = parseInt(elements.maxRounds.value, 10) || 3;
  let total = 0;
  let hasUnknown = false;

  for (const member of members) {
    const model = allModels.find((m) => m.id === member.model && m.cli === member.cli);
    if (!model || model.points === "unknown") {
      hasUnknown = true;
    } else {
      total += model.points * rounds;
    }
  }

  if (hasUnknown) {
    return {
      total: "unknown",
      display: `${members.length} 成員 × ${rounds} 輪 (含未知點數)`,
    };
  }

  return {
    total,
    display: `${members.length} 成員 × ${rounds} 輪 = ${total} 點`,
  };
}

/**
 * 更新點數估計顯示
 */
function updatePointsEstimate() {
  const estimate = calculatePoints();
  elements.pointsValue.textContent = estimate.display;

  if (estimate.total === "unknown") {
    elements.startBtnPoints.textContent = "(含未知點數)";
  } else {
    elements.startBtnPoints.textContent = `(預估 ${estimate.total} 點)`;
  }
}

/**
 * 新增成員
 */
function addMember() {
  const defaultCli = cliServices.find((s) => s.available)?.id || "copilot";
  const defaultModel = getAvailableModels(defaultCli)[0]?.id || "gpt-5-mini";

  // 取得下一個可用的委員後綴 (A-Z, 然後 1, 2, 3...)
  const usedSuffixes = new Set(
    members
      .filter((m) => m.name.startsWith("委員 "))
      .map((m) => m.name.replace("委員 ", ""))
  );

  let suffix = "";
  // 先嘗試 A-Z
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i); // A = 65
    if (!usedSuffixes.has(letter)) {
      suffix = letter;
      break;
    }
  }
  // 如果 A-Z 都用完了，使用數字
  if (!suffix) {
    let num = 1;
    while (usedSuffixes.has(String(num))) {
      num++;
    }
    suffix = String(num);
  }

  members.push({
    id: `member-${Date.now()}`,
    name: `委員 ${suffix}`,
    model: defaultModel,
    cli: defaultCli,
    role: "committee",
    customPrompt: "",
  });
  renderMembers();
}

/**
 * 移除成員
 */
function removeMember(index) {
  members.splice(index, 1);
  renderMembers();
}

/**
 * 設定事件監聽
 */
function setupEventListeners() {
  elements.addMember.addEventListener("click", addMember);
  elements.resetDefault.addEventListener("click", loadDefaultMembers);
  elements.startDebate.addEventListener("click", startDebate);
  elements.stopDebate.addEventListener("click", stopDebate);
  elements.newDebate.addEventListener("click", newDebate);
  elements.maxRounds.addEventListener("change", updatePointsEstimate);

  // 預設配置選擇
  elements.presetConfig.addEventListener("change", (e) => {
    const presetId = e.target.value;
    if (!presetId) return;

    const preset = presetConfigs.find((p) => p.id === presetId);
    if (preset) {
      members = preset.members.map((m, i) => ({
        ...m,
        id: `member-${i}`,
        customPrompt: m.customPrompt || "",
      }));
      renderMembers();
    }
  });
}

function setupShutdownHandlers() {
  window.addEventListener("pagehide", () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    navigator.sendBeacon("/api/shutdown");
  });
}

/**
 * 連接 SSE
 */
function connectSSE() {
  eventSource = new EventSource("/api/events");

  eventSource.addEventListener("connected", () => {
    console.log("SSE connected");
  });

  eventSource.addEventListener("debate_event", (e) => {
    const event = JSON.parse(e.data);
    handleDebateEvent(event);
  });

  eventSource.addEventListener("statement_delta", (e) => {
    const data = JSON.parse(e.data);
    handleStatementDelta(data);
  });

  eventSource.addEventListener("statement_complete", (e) => {
    const statement = JSON.parse(e.data);
    handleStatementComplete(statement);
  });

  eventSource.addEventListener("error", (e) => {
    console.error("SSE error:", e);
  });
}

/**
 * 處理辯論事件
 */
function handleDebateEvent(event) {
  console.log("Debate event:", event);

  switch (event.type) {
    case "status_changed":
      updateStatus(event.status);
      break;
    case "round_started":
      elements.roundInfo.textContent = `第 ${event.round} / ${elements.maxRounds.value} 輪`;
      break;
    case "member_speaking":
      createStreamingMessage(event.member, event.round);
      break;
  }
}

/**
 * 處理串流 delta
 */
function handleStatementDelta(data) {
  const msgEl = document.getElementById(`streaming-${data.memberId}`);
  if (msgEl) {
    const contentEl = msgEl.querySelector(".message-content");
    contentEl.textContent += data.delta;
    scrollToBottom();
  }
}

/**
 * 處理完整發言
 */
function handleStatementComplete(statement) {
  const msgEl = document.getElementById(`streaming-${statement.memberId}`);
  if (msgEl) {
    msgEl.id = "";
    const contentEl = msgEl.querySelector(".message-content");
    contentEl.classList.remove("streaming");
    contentEl.textContent = statement.content;
  }

  if (statement.role === "secretary") {
    elements.secretarySection.classList.remove("hidden");
    elements.secretarySummary.textContent = statement.content;
  } else if (statement.role === "arbiter") {
    elements.arbiterSection.classList.remove("hidden");
    elements.arbiterConclusion.textContent = statement.content;
  }

  scrollToBottom();
}

/**
 * 創建串流訊息框
 */
function createStreamingMessage(member, round) {
  // 取得 CLI 與模型顯示名稱
  const cliLabel = member.cli === "gemini" ? "Gemini CLI" : "Copilot CLI";
  const modelLabel = member.model;

  const roleLabel =
    round === 0
      ? member.role === "secretary"
        ? "摘要整理"
        : "最終裁決"
      : `第 ${round} 輪`;

  const html = `
    <div class="message" id="streaming-${member.id}">
      <div class="message-header">
        <div class="message-avatar ${member.role}">${ROLE_ICONS[member.role]}</div>
        <span class="message-name">${member.name} (${cliLabel} / ${modelLabel})</span>
        <span class="message-role">${ROLE_NAMES[member.role]}</span>
        <span class="message-round">${roleLabel}</span>
      </div>
      <div class="message-content streaming"></div>
    </div>
  `;

  elements.conversation.insertAdjacentHTML("beforeend", html);
  scrollToBottom();
}

/**
 * 更新狀態
 */
function updateStatus(status) {
  elements.debateStatus.textContent = getStatusText(status);
  elements.debateStatus.className = `status-badge ${status}`;

  if (status === "completed") {
    elements.stopDebate.classList.add("hidden");
    elements.newDebate.classList.remove("hidden");
  }
}

/**
 * 取得狀態文字
 */
function getStatusText(status) {
  const statusMap = {
    idle: "準備中",
    debating: "辯論中",
    secretary_summarizing: "書記官整理中",
    arbiter_concluding: "仲裁者總結中",
    completed: "已完成",
  };
  return statusMap[status] || status;
}

/**
 * 捲動到底部
 */
function scrollToBottom() {
  elements.conversation.scrollTop = elements.conversation.scrollHeight;
}

/**
 * 開始辯論
 */
async function startDebate() {
  const topic = elements.topic.value.trim();
  if (!topic) {
    alert("請輸入議題");
    return;
  }

  const maxRounds = parseInt(elements.maxRounds.value, 10);
  const enableWebSearch = elements.enableWebSearch.checked;

  const memberData = members.map((m) => ({
    name: m.name,
    model: m.model,
    cli: m.cli,
    role: m.role,
    customPrompt: m.customPrompt || "",
  }));

  const hasArbiter = memberData.some((m) => m.role === "arbiter");
  if (!hasArbiter) {
    alert("請至少指定一位仲裁者");
    return;
  }

  try {
    elements.startDebate.disabled = true;
    elements.startBtnText.textContent = "啟動中...";

    const startRes = await fetch("/api/debate/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, maxRounds, members: memberData, enableWebSearch }),
    });

    if (!startRes.ok) {
      throw new Error(await startRes.text());
    }

    // 切換面板
    elements.configPanel.classList.add("hidden");
    elements.debatePanel.classList.remove("hidden");
    elements.currentTopic.textContent = topic;
    elements.roundInfo.textContent = `第 0 / ${maxRounds} 輪`;
    elements.conversation.innerHTML = "";
    elements.secretarySection.classList.add("hidden");
    elements.arbiterSection.classList.add("hidden");
    elements.stopDebate.classList.remove("hidden");
    elements.newDebate.classList.add("hidden");

    // 顯示 web search badge
    if (enableWebSearch) {
      elements.webSearchBadge.classList.remove("hidden");
    } else {
      elements.webSearchBadge.classList.add("hidden");
    }

    // 執行辯論
    await fetch("/api/debate/run", { method: "POST" });
  } catch (error) {
    console.error("Failed to start debate:", error);
    alert("開始辯論失敗: " + error.message);
  } finally {
    elements.startDebate.disabled = false;
    elements.startBtnText.textContent = "🚀 開始辯論";
  }
}

/**
 * 停止辯論
 */
async function stopDebate() {
  try {
    await fetch("/api/debate/stop", { method: "POST" });
    newDebate();
  } catch (error) {
    console.error("Failed to stop debate:", error);
  }
}

/**
 * 新辯論
 */
function newDebate() {
  elements.configPanel.classList.remove("hidden");
  elements.debatePanel.classList.add("hidden");
}

// 初始化
init();
