import test from "node:test";
import assert from "node:assert/strict";
import {
  getDebaters,
  buildDebatePrompt,
  buildSecretaryPrompt,
  buildArbiterPrompt,
  createStatement,
} from "../../dist/debate.js";

const members = [
  { id: "1", name: "A", model: "gpt-5-mini", cli: "copilot", role: "committee" },
  { id: "2", name: "B", model: "gpt-5-mini", cli: "copilot", role: "tenth_man" },
  { id: "3", name: "S", model: "gpt-5-mini", cli: "copilot", role: "secretary" },
];

const statements = [
  {
    round: 1,
    memberId: "1",
    memberName: "A",
    role: "committee",
    content: "贊成，因為...",
    timestamp: new Date("2025-01-01T00:00:00.000Z"),
  },
  {
    round: 1,
    memberId: "2",
    memberName: "B",
    role: "tenth_man",
    content: "反對，因為...",
    timestamp: new Date("2025-01-01T00:01:00.000Z"),
  },
];

test("getDebaters orders committee before tenth_man", () => {
  const ordered = getDebaters(members);
  assert.equal(ordered[0].role, "committee");
  assert.equal(ordered[1].role, "tenth_man");
});

test("buildDebatePrompt uses opening template for first round", () => {
  const prompt = buildDebatePrompt(members[0], "測試議題", 1, []);
  assert.match(prompt, /第 1 輪辯論的開始/);
  assert.match(prompt, /測試議題/);
});

test("buildDebatePrompt includes previous statements", () => {
  const prompt = buildDebatePrompt(members[0], "測試議題", 2, statements);
  assert.match(prompt, /之前的討論內容/);
  assert.match(prompt, /贊成，因為/);
  assert.match(prompt, /反對，因為/);
});

test("buildSecretaryPrompt includes all statements", () => {
  const prompt = buildSecretaryPrompt("測試議題", statements);
  assert.match(prompt, /完整的辯論記錄/);
  assert.match(prompt, /贊成，因為/);
  assert.match(prompt, /反對，因為/);
});

test("buildArbiterPrompt includes secretary summary when provided", () => {
  const prompt = buildArbiterPrompt("測試議題", statements, "摘要內容");
  assert.match(prompt, /書記官整理/);
  assert.match(prompt, /摘要內容/);
});

test("createStatement sets base fields", () => {
  const statement = createStatement(members[0], 3);
  assert.equal(statement.round, 3);
  assert.equal(statement.memberId, "1");
  assert.equal(statement.memberName, "A");
  assert.equal(statement.role, "committee");
  assert.equal(statement.content, "");
  assert.ok(statement.timestamp instanceof Date);
});
