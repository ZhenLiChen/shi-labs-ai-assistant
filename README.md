# 史语所科研助手

一个基于 React + Node.js 的实验室科研协作应用，包含以下能力：

- AI 对话与流式回复
- 本地组会知识库上传与简易 RAG
- 实验参与者登记表单
- 组会日程日历与自定义 schedule 管理

## 技术栈

### 前端

- React 18
- Vite
- React Context API
- 自定义 CSS
- `react-markdown` + `remark-gfm` + `rehype-highlight`

### 后端

- Node.js 原生 `http/https`
- `dotenv`
- 本地 JSON 文件持久化
- 讯飞星火 MaaS API

## 当前功能

### 1. AI 对话

- 支持输入问题并流式展示模型回复
- 支持中断生成
- 支持历史对话切换与删除
- 首页提供预设科研问题卡片

### 2. 组会知识库

- 可上传 `.txt`、`.md`、`.markdown` 文本文件
- 上传后的文档保存到本地 `lab_docs/`
- 后端收到用户问题后，会先从 `lab_docs/` 中做简易关键词检索
- 检索出的文本片段会拼接到 system prompt 中，再发送给讯飞模型

### 3. 实验参与者登记

- 采用实验表单风格界面
- 当前包含字段：
  - `Name`
  - `Student ID`
  - `Age`
  - `Gender`
  - `trained`
  - `Chinese level`
  - `English level`
  - `Other languages`
- 前端只负责登记提交，不直接展示已登记列表
- 数据保存在后端 `data/participants.json`

### 4. 组会日程

- Sidebar 新增“组会日程”入口
- 提供简约月历视图
- 每周一晚 `20:00 - 23:00` 固定标记为组会
- `2026-04-19` 标记为“史语所踏青活动”
- 支持用户新增和删除自定义日程
- 数据保存在后端 `data/schedules.json`

## 项目结构

```text
CRUD/
├── data/
│   ├── participants.json      # 实验参与者登记数据
│   └── schedules.json         # 自定义日程数据
├── lab_docs/                  # 本地知识库文档目录
├── public/
├── src/
│   ├── assets/                # 图标与静态资源
│   ├── components/
│   │   ├── Main/
│   │   │   ├── Main.jsx       # 主工作区：聊天、登记、知识库、日历
│   │   │   └── Main.css
│   │   ├── MarkdownRenderer/
│   │   │   └── MarkdownRenderer.jsx
│   │   └── SideBar/
│   │       ├── SideBar.jsx    # Sidebar 工作区导航
│   │       └── SideBar.css
│   ├── context/
│   │   └── Context.jsx        # 全局状态与前端接口调用
│   ├── services/
│   │   └── streamParser.js    # SSE 流式解析与节奏渲染
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env
├── index.html
├── package.json
├── server.js                  # 后端 API、RAG、数据持久化
└── vite.config.js
```

## 运行方式

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env`：

```env
XUNFEI_API_KEY=your_xunfei_api_key_here
PORT=3001
```

### 3. 启动后端

```bash
npm run server
```

默认监听：

```text
http://localhost:3001
```

### 4. 启动前端

另开一个终端：

```bash
npm run dev
```

默认访问：

```text
http://localhost:5173
```

### 5. 构建生产版本

```bash
npm run build
```

## 数据流说明

### AI 对话链路

```text
用户输入
→ Context.jsx 调用 streamParser.fetchStream()
→ 前端请求 POST /api/chat
→ server.js 先从 lab_docs/ 检索相关文本
→ 后端将检索结果拼进 system prompt
→ 请求讯飞星火流式接口
→ 后端将 SSE 流返回前端
→ streamParser 解析并按节奏 flush
→ Main.jsx 渲染消息
```

### 参与者登记链路

```text
用户填写表单
→ Context.jsx 提交 POST /api/participants
→ server.js 校验字段
→ 写入 data/participants.json
```

### 日程管理链路

```text
用户填写 schedule 表单
→ Context.jsx 提交 POST /api/schedules
→ server.js 写入 data/schedules.json
→ 前端重新拉取并更新日历
```

## 后端 API

### 健康检查

```http
GET /health
```

### AI 对话

```http
POST /api/chat
Content-Type: application/json
```

请求体示例：

```json
{
  "messages": [
    {
      "role": "user",
      "content": "请总结本周组会重点"
    }
  ]
}
```

### 参与者登记

```http
GET /api/participants
POST /api/participants
PUT /api/participants/:id
DELETE /api/participants/:id
```

请求体示例：

```json
{
  "name": "张三",
  "studentId": "PB21000000",
  "age": "23",
  "gender": "Male",
  "trained": "Yes",
  "chineseLevel": "Native",
  "englishLevel": "Proficient",
  "otherLanguages": "Japanese"
}
```

### 日程管理

```http
GET /api/schedules
POST /api/schedules
DELETE /api/schedules/:id
```

请求体示例：

```json
{
  "title": "论文精读",
  "date": "2026-04-22",
  "startTime": "19:00",
  "endTime": "21:00",
  "note": "讨论新到文献"
}
```

### 文档上传

```http
GET /api/documents
POST /api/documents
```

当前上传方式不是 multipart，而是前端先读取文本内容，再以 JSON 发送：

```json
{
  "filename": "week-7.md",
  "content": "# 第七周组会\n\n本周讨论了……"
}
```

## RAG 实现说明

当前实现是“简易 RAG”，不是向量数据库方案。

处理逻辑如下：

1. 前端上传文本到 `lab_docs/`
2. 用户提问时，后端读取 `lab_docs/` 所有文本
3. 按段落切分文档
4. 对问题做简单关键词切分
5. 统计每个段落的关键词命中分数
6. 取分数最高的若干段落作为上下文
7. 将这些段落拼接进 system prompt 后调用模型

相关核心代码：

- `server.js` 中的 `retrieveRelevantContext`
- `server.js` 中的 `buildPromptMessages`

## 注意事项

- 当前知识库上传仅适合文本类文件，不支持 `.pdf`、`.docx`
- 前端接口地址目前写死为 `http://localhost:3001`
- 日历中的每周一组会与 `2026-04-19` 踏青活动属于前端固定规则
- 若要让踏青活动每年循环，或支持编辑固定组会，需要进一步扩展规则层

## 可继续扩展的方向

- 支持 PDF / Word 文档解析
- 接入向量数据库，替代关键词检索
- 为参与者登记增加管理员后台
- 为日程增加编辑功能
- 为前端请求增加 Vite 代理或环境变量配置
