import fs from "fs";
import path from "path";
import http from "http";
import https from "https";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.XUNFEI_API_KEY;
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, "data");
const PARTICIPANTS_FILE = path.join(DATA_DIR, "participants.json");
const SCHEDULES_FILE = path.join(DATA_DIR, "schedules.json");
const LAB_DOCS_DIR = path.join(__dirname, "lab_docs");

ensureStorage();

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === "POST" && url.pathname === "/api/chat") {
      const requestData = await readJsonBody(req);
      const { messages } = requestData;

      if (!Array.isArray(messages)) {
        sendJson(res, 400, { error: "messages 必须为数组" });
        return;
      }

      handleStreamRequest(messages, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/participants") {
      sendJson(res, 200, { participants: readDataFile(PARTICIPANTS_FILE) });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/participants") {
      const payload = await readJsonBody(req);
      const participants = readDataFile(PARTICIPANTS_FILE);
      const participant = buildParticipant(payload);

      participants.unshift(participant);
      writeDataFile(PARTICIPANTS_FILE, participants);
      sendJson(res, 201, { participant });
      return;
    }

    if (
      (req.method === "PUT" || req.method === "DELETE") &&
      url.pathname.startsWith("/api/participants/")
    ) {
      const participantId = url.pathname.split("/").pop();
      const participants = readDataFile(PARTICIPANTS_FILE);
      const index = participants.findIndex(
        (item) => String(item.id) === String(participantId),
      );

      if (index === -1) {
        sendJson(res, 404, { error: "未找到该参与者" });
        return;
      }

      if (req.method === "DELETE") {
        const [deletedParticipant] = participants.splice(index, 1);
        writeDataFile(PARTICIPANTS_FILE, participants);
        sendJson(res, 200, { participant: deletedParticipant });
        return;
      }

      const payload = await readJsonBody(req);
      participants[index] = {
        ...participants[index],
        ...sanitizeParticipantPayload(payload),
        updatedAt: new Date().toISOString(),
      };
      validateParticipant(participants[index]);
      writeDataFile(PARTICIPANTS_FILE, participants);
      sendJson(res, 200, { participant: participants[index] });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/schedules") {
      sendJson(res, 200, { schedules: readDataFile(SCHEDULES_FILE) });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/schedules") {
      const payload = await readJsonBody(req);
      const schedules = readDataFile(SCHEDULES_FILE);
      const schedule = buildSchedule(payload);

      schedules.unshift(schedule);
      writeDataFile(SCHEDULES_FILE, schedules);
      sendJson(res, 201, { schedule });
      return;
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/schedules/")) {
      const scheduleId = url.pathname.split("/").pop();
      const schedules = readDataFile(SCHEDULES_FILE);
      const index = schedules.findIndex(
        (item) => String(item.id) === String(scheduleId),
      );

      if (index === -1) {
        sendJson(res, 404, { error: "未找到该日程" });
        return;
      }

      const [deletedSchedule] = schedules.splice(index, 1);
      writeDataFile(SCHEDULES_FILE, schedules);
      sendJson(res, 200, { schedule: deletedSchedule });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/documents") {
      sendJson(res, 200, { documents: listDocuments() });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/documents") {
      const payload = await readJsonBody(req);
      const filename = sanitizeFilename(payload.filename);
      const content = typeof payload.content === "string" ? payload.content : "";

      if (!filename) {
        sendJson(res, 400, { error: "文档名不能为空" });
        return;
      }

      if (!content.trim()) {
        sendJson(res, 400, { error: "仅支持上传文本内容" });
        return;
      }

      const targetPath = path.join(LAB_DOCS_DIR, filename);
      fs.writeFileSync(targetPath, content, "utf-8");
      sendJson(res, 201, { document: buildDocumentMetadata(targetPath) });
      return;
    }

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, {
        status: "ok",
        message: "AI Chat API is running",
      });
      return;
    }

    res.statusCode = 404;
    res.end();
  } catch (error) {
    console.error("Server error:", error);
    if (!res.headersSent) {
      sendJson(res, error.statusCode || 500, {
        error: error.message || "服务异常",
      });
    } else {
      res.end();
    }
  }
});

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        error.statusCode = 400;
        error.message = "请求格式错误";
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function ensureStorage() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(LAB_DOCS_DIR, { recursive: true });

  if (!fs.existsSync(PARTICIPANTS_FILE)) {
    fs.writeFileSync(PARTICIPANTS_FILE, "[]", "utf-8");
  }

  if (!fs.existsSync(SCHEDULES_FILE)) {
    fs.writeFileSync(SCHEDULES_FILE, "[]", "utf-8");
  }
}

function readDataFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Read data file error: ${filePath}`, error);
    return [];
  }
}

function writeDataFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function sanitizeParticipantPayload(payload = {}) {
  return {
    name: typeof payload.name === "string" ? payload.name.trim() : "",
    studentId:
      typeof payload.studentId === "string" ? payload.studentId.trim() : "",
    age: typeof payload.age === "string" ? payload.age.trim() : "",
    gender: typeof payload.gender === "string" ? payload.gender.trim() : "",
    trained: typeof payload.trained === "string" ? payload.trained.trim() : "",
    chineseLevel:
      typeof payload.chineseLevel === "string"
        ? payload.chineseLevel.trim()
        : "",
    englishLevel:
      typeof payload.englishLevel === "string"
        ? payload.englishLevel.trim()
        : "",
    otherLanguages:
      typeof payload.otherLanguages === "string"
        ? payload.otherLanguages.trim()
        : "",
  };
}

function validateParticipant(participant) {
  if (!participant.name || !participant.studentId) {
    const error = new Error("姓名和学号为必填项");
    error.statusCode = 400;
    throw error;
  }
}

function buildParticipant(payload) {
  const participant = {
    id: Date.now(),
    ...sanitizeParticipantPayload(payload),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  validateParticipant(participant);
  return participant;
}

function sanitizeSchedulePayload(payload = {}) {
  return {
    title: typeof payload.title === "string" ? payload.title.trim() : "",
    date: typeof payload.date === "string" ? payload.date.trim() : "",
    startTime:
      typeof payload.startTime === "string" ? payload.startTime.trim() : "",
    endTime: typeof payload.endTime === "string" ? payload.endTime.trim() : "",
    note: typeof payload.note === "string" ? payload.note.trim() : "",
  };
}

function validateSchedule(schedule) {
  if (!schedule.title || !schedule.date) {
    const error = new Error("标题和日期为必填项");
    error.statusCode = 400;
    throw error;
  }
}

function buildSchedule(payload) {
  const schedule = {
    id: Date.now(),
    ...sanitizeSchedulePayload(payload),
    createdAt: new Date().toISOString(),
  };

  validateSchedule(schedule);
  return schedule;
}

function sanitizeFilename(filename) {
  if (typeof filename !== "string") return "";
  return path
    .basename(filename)
    .replace(/[^\w.\-\u4e00-\u9fa5]/g, "_")
    .trim();
}

function listDocuments() {
  return fs
    .readdirSync(LAB_DOCS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => buildDocumentMetadata(path.join(LAB_DOCS_DIR, entry.name)))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function buildDocumentMetadata(documentPath) {
  const stat = fs.statSync(documentPath);
  return {
    name: path.basename(documentPath),
    size: stat.size,
    updatedAt: stat.mtime.toLocaleString("zh-CN", {
      hour12: false,
    }),
  };
}

function handleStreamRequest(messages, res) {
  const latestQuestion =
    [...messages].reverse().find((item) => item.role === "user")?.content || "";
  const ragContext = retrieveRelevantContext(latestQuestion);

  const promptMessages = buildPromptMessages(messages, ragContext);
  const requestBody = {
    model: "lite",
    messages: promptMessages,
    max_tokens: 4000,
    temperature: 0.5,
    stream: true,
  };

  const options = {
    hostname: "spark-api-open.xf-yun.com",
    port: 443,
    path: "/v1/chat/completions",
    method: "POST",
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      "User-Agent": "Node.js-Client",
      Accept: "*/*",
    },
  };

  const maasReq = https.request(options, (maasRes) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    maasRes.pipe(res);
  });

  maasReq.on("error", (error) => {
    res.write(`data: {"error": "流式请求失败：${error.message}"} \n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  });

  maasReq.on("timeout", () => {
    maasReq.destroy();
    res.write('data: {"error": "请求超时"} \n\n');
    res.write("data: [DONE]\n\n");
    res.end();
  });

  maasReq.write(JSON.stringify(requestBody));
  maasReq.end();
}

function buildPromptMessages(messages, ragContext) {
  const contextSection = ragContext
    ? `以下是史语所实验室组会知识库中检索到的背景材料：\n${ragContext}\n\n请优先依据这些材料回答用户问题；如果材料不足，请明确说明“知识库中没有足够信息”，再结合通用知识补充。`
    : "当前知识库中没有检索到足够相关的组会材料。请明确告知用户，并谨慎使用通用知识回答。";

  const systemMessage = {
    role: "system",
    content: `${contextSection}\n\n你是“史语所科研助手”，负责服务实验参与者登记、组会知识库问答和科研协作场景。回答应清晰、准确、适合学术讨论。`,
  };

  return [systemMessage, ...messages];
}

function retrieveRelevantContext(question) {
  const normalizedQuestion = normalizeText(question);
  if (!normalizedQuestion) return "";

  const keywords = Array.from(
    new Set(
      normalizedQuestion
        .split(/\s+/)
        .flatMap((token) => tokenizeForSearch(token))
        .filter((token) => token.length >= 2),
    ),
  );

  const candidates = [];

  for (const entry of fs.readdirSync(LAB_DOCS_DIR, { withFileTypes: true })) {
    if (!entry.isFile()) continue;

    const filePath = path.join(LAB_DOCS_DIR, entry.name);
    const content = fs.readFileSync(filePath, "utf-8");
    const chunks = chunkDocument(content);

    chunks.forEach((chunk, index) => {
      const normalizedChunk = normalizeText(chunk);
      let score = 0;

      for (const keyword of keywords) {
        if (normalizedChunk.includes(keyword)) {
          score += keyword.length > 3 ? 2 : 1;
        }
      }

      if (score > 0) {
        candidates.push({
          score,
          file: entry.name,
          index,
          text: chunk.trim(),
        });
      }
    });
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(
      (item, idx) =>
        `[材料${idx + 1}，文件：${item.file}，片段：${item.index + 1}]\n${item.text}`,
    )
    .join("\n\n");
}

function chunkDocument(content) {
  return content
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((paragraph) => {
      if (paragraph.length <= 400) {
        return [paragraph];
      }

      const chunks = [];
      for (let index = 0; index < paragraph.length; index += 360) {
        chunks.push(paragraph.slice(index, index + 360));
      }
      return chunks;
    });
}

function normalizeText(text) {
  if (typeof text !== "string") return "";
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ");
}

function tokenizeForSearch(token) {
  const cleanToken = token.trim();
  if (!cleanToken) return [];

  if (/[\u4e00-\u9fa5]/.test(cleanToken)) {
    const terms = [];
    for (let index = 0; index < cleanToken.length - 1; index += 1) {
      terms.push(cleanToken.slice(index, index + 2));
    }
    terms.push(cleanToken);
    return terms;
  }

  return [cleanToken];
}

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
