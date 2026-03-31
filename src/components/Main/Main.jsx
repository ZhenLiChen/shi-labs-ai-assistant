import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import "./Main.css";
import { assets } from "../../assets/assets";
import { Context } from "../../context/Context";
import MarkdownRenderer from "../MarkdownRenderer/MarkdownRenderer";

const WEEK_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
const LANGUAGE_LEVELS = ["Native", "Proficient", "Intermediate", "Beginner"];

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (dateString) =>
  new Date(`${dateString}T00:00:00`).toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

const buildRecurringMeetingEvents = (year, monthIndex) => {
  const events = [];
  const current = new Date(year, monthIndex, 1);

  while (current.getMonth() === monthIndex) {
    if (current.getDay() === 1) {
      events.push({
        id: `weekly-${formatDateKey(current)}`,
        date: formatDateKey(current),
        title: "组会",
        startTime: "20:00",
        endTime: "23:00",
        note: "固定组会，默认持续约三个小时。",
        category: "weekly",
        isFixed: true,
      });
    }
    current.setDate(current.getDate() + 1);
  }

  return events;
};

const buildSpecialEvents = (year, monthIndex) => {
  const specialEvents = [];

  if (year === 2026 && monthIndex === 3) {
    specialEvents.push({
      id: "outing-2026-04-19",
      date: "2026-04-19",
      title: "踏青活动",
      startTime: "09:30",
      endTime: "17:00",
      note: "一起去踏青吧",
      category: "outing",
      icon: "🌿",
      isFixed: true,
    });
  }

  return specialEvents;
};

const buildCalendarDays = (currentMonth) => {
  const year = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - startOffset);

  const days = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    days.push(date);
  }

  return days;
};

const Main = () => {
  const {
    viewMode,
    onSent,
    recentPrompt,
    showResult,
    loading,
    setInput,
    input,
    handleKeyPress,
    messages,
    isGenerating,
    abortGeneration,
    chatContainerRef,
    handleScroll,
    updateSessionMessages,
    participantForm,
    editingParticipantId,
    participantFeedback,
    updateParticipantFormField,
    submitParticipantForm,
    resetParticipantForm,
    documents,
    knowledgeFeedback,
    isUploadingDocument,
    uploadDocument,
    schedules,
    scheduleForm,
    scheduleFeedback,
    updateScheduleFormField,
    submitScheduleForm,
    removeSchedule,
    resetScheduleForm,
  } = useContext(Context);

  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 3, 1));
  const fileInputRef = useRef(null);

  const handleInputChange = (event) => {
    const value = event.target.value;
    setInput(value);
    updateSessionMessages(messages, { input: value });
  };

  useEffect(() => {
    if (chatContainerRef.current && viewMode === "chat") {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages, chatContainerRef, viewMode]);

  const handleDocumentButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDocumentChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await uploadDocument(file);
    event.target.value = "";
  };

  const monthLabel = currentMonth.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
  });
  const calendarDays = useMemo(
    () => buildCalendarDays(currentMonth),
    [currentMonth],
  );

  const monthEvents = useMemo(() => {
    const year = currentMonth.getFullYear();
    const monthIndex = currentMonth.getMonth();
    const recurring = buildRecurringMeetingEvents(year, monthIndex);
    const specials = buildSpecialEvents(year, monthIndex);
    const customEvents = schedules.filter((item) => {
      const date = new Date(`${item.date}T00:00:00`);
      return date.getFullYear() === year && date.getMonth() === monthIndex;
    });

    return [...recurring, ...specials, ...customEvents];
  }, [currentMonth, schedules]);

  const eventsByDate = useMemo(() => {
    const map = new Map();
    monthEvents.forEach((item) => {
      const currentEvents = map.get(item.date) || [];
      currentEvents.push(item);
      map.set(item.date, currentEvents);
    });
    return map;
  }, [monthEvents]);

  const renderChatView = () => (
    <>
      {!showResult ? (
        <>
          <div className="greet">
            <p>
              <span>史语所科研助手</span>
            </p>
            <p>欢迎进入组会知识库问答与科研协作空间。</p>
          </div>
          <div className="cards">
            <div
              className="card"
              onClick={() =>
                onSent("请根据已上传的组会纪要，总结本周最重要的研究进展。")
              }
            >
              <p>请根据已上传的组会纪要，总结本周最重要的研究进展。</p>
              <img src={assets.compass_icon} alt="" />
            </div>
            <div
              className="card"
              onClick={() => onSent("如果我要准备下周组会，需要关注哪些文献？")}
            >
              <p>如果我要准备下周组会，需要关注哪些文献？</p>
              <img src={assets.bulb_icon} alt="" />
            </div>
            <div
              className="card"
              onClick={() =>
                onSent("基于知识库，向我解释这段基于GAM模型的R脚本。")
              }
            >
              <p>基于知识库，向我解释这段基于GAM模型的R脚本。</p>
              <img src={assets.message_icon} alt="" />
            </div>
            <div
              className="card"
              onClick={() =>
                onSent("请从知识库中提取元音标注、基频提取的规范。")
              }
            >
              <p>请从知识库中提取元音标注、基频提取的规范。。</p>
              <img src={assets.code_icon} alt="" />
            </div>
          </div>
        </>
      ) : (
        <div className="result">
          <div
            className="chat-messages"
            ref={chatContainerRef}
            onScroll={handleScroll}
          >
            {messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`message-item ${
                  message.role === "assistant" ? "ai-message" : "user-message"
                }`}
              >
                <img
                  src={
                    message.role === "assistant"
                      ? assets.gemini_icon
                      : assets.user_icon
                  }
                  alt=""
                  className="message-avatar"
                />
                <div className="message-content">
                  {message.status === "generating" && !message.content ? (
                    <div className="loader">
                      <hr />
                      <hr />
                      <hr />
                    </div>
                  ) : (
                    <div className="markdown-content">
                      <MarkdownRenderer content={message.content} />
                    </div>
                  )}
                  {message.status === "aborted" && (
                    <span className="message-status">已中断</span>
                  )}
                  {message.status === "failed" && (
                    <span className="message-status error">生成失败</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="main-bottom">
        <div className="search-box">
          <input
            onChange={handleInputChange}
            value={input}
            type="text"
            onKeyDown={handleKeyPress}
            placeholder="请输入科研问题，系统会优先检索组会知识库"
          />
          <div className="search-actions">
            {isGenerating ? (
              <img
                src={assets.send_icon}
                alt=""
                onClick={abortGeneration}
                className="stop-icon"
                title="停止生成"
              />
            ) : input ? (
              <img onClick={() => onSent()} src={assets.send_icon} alt="" />
            ) : null}
          </div>
        </div>
        <p className="bottom-info">
          史语所科研助手会优先结合本地组会知识库作答；若知识不足，会明确说明。
        </p>
        {loading && recentPrompt ? (
          <p className="helper-text">正在处理问题：{recentPrompt}</p>
        ) : null}
      </div>
    </>
  );

  const renderRadioGroup = (field, options) => (
    <div className="option-grid">
      {options.map((option) => (
        <label key={option} className="option-card">
          <input
            type="radio"
            name={field}
            value={option}
            checked={participantForm[field] === option}
            onChange={(event) =>
              updateParticipantFormField(field, event.target.value)
            }
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );

  const renderParticipantsView = () => (
    <div className="workspace-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">实验参与者登记</p>
          <h2>Pitch Perception Experiment</h2>
          <p className="panel-subtitle">
            请填写实验参与者信息，界面结构参考你提供的表单，并适配当前整体视觉风格。
          </p>
        </div>
      </div>

      <div className="participant-layout participant-layout-single">
        <div className="participant-form-card participant-reference-card">
          <div className="reference-header">
            Please fill in your information
          </div>
          <div className="participant-form-content">
            <label>
              Name:
              <input
                type="text"
                value={participantForm.name}
                onChange={(event) =>
                  updateParticipantFormField("name", event.target.value)
                }
                placeholder="请输入姓名"
              />
            </label>

            <label>
              Student ID (eg: PB21000000)
              <input
                type="text"
                value={participantForm.studentId}
                onChange={(event) =>
                  updateParticipantFormField("studentId", event.target.value)
                }
                placeholder="请输入学号"
              />
            </label>

            <label>
              Age:
              <input
                type="number"
                min="0"
                value={participantForm.age}
                onChange={(event) =>
                  updateParticipantFormField("age", event.target.value)
                }
                placeholder="请输入年龄"
              />
            </label>

            <div className="form-group-block">
              <p>Gender:</p>
              {renderRadioGroup("gender", ["Male", "Female"])}
            </div>

            <div className="form-group-block">
              <p>trained:（是否受过专业音乐训练）</p>
              {renderRadioGroup("trained", ["Yes", "No"])}
            </div>

            <div className="form-group-block">
              <p className="section-heading">Language Background:</p>
              <div className="language-block">
                <p>Chinese:</p>
                {renderRadioGroup("chineseLevel", LANGUAGE_LEVELS)}
              </div>
              <div className="language-block">
                <p>English:</p>
                {renderRadioGroup("englishLevel", LANGUAGE_LEVELS)}
              </div>
              <label>
                Other languages (please specify):
                <input
                  type="text"
                  value={participantForm.otherLanguages}
                  onChange={(event) =>
                    updateParticipantFormField(
                      "otherLanguages",
                      event.target.value,
                    )
                  }
                  placeholder="如有其他语言背景，请补充"
                />
              </label>
            </div>
          </div>
          <div className="panel-actions">
            <button type="button" onClick={submitParticipantForm}>
              {editingParticipantId ? "保存修改" : "登记参与者"}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={resetParticipantForm}
            >
              清空表单
            </button>
          </div>
          {participantFeedback ? (
            <p className="helper-text">{participantFeedback}</p>
          ) : null}
        </div>
      </div>
    </div>
  );

  const renderKnowledgeView = () => (
    <div className="workspace-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">组会知识库</p>
          <h2>上传与管理 RAG 文档</h2>
        </div>
        <button type="button" onClick={handleDocumentButtonClick}>
          {isUploadingDocument ? "上传中..." : "上传文档"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.markdown"
          className="hidden-file-input"
          onChange={handleDocumentChange}
        />
      </div>

      <div className="knowledge-card">
        <p>
          已上传的文本会写入后端 `lab_docs`
          目录。对话时，系统会先从这些文档中抽取相关段落，再把它们作为背景知识发送给模型。
        </p>
        {knowledgeFeedback ? (
          <p className="helper-text">{knowledgeFeedback}</p>
        ) : null}
      </div>

      <div className="participant-table-card">
        <h3>已收录文档</h3>
        {documents.length === 0 ? (
          <p className="empty-state">知识库中还没有文档，请先上传组会纪要。</p>
        ) : (
          <div className="document-list">
            {documents.map((document) => (
              <div key={document.name} className="document-item">
                <div>
                  <h4>{document.name}</h4>
                  <p>大小：{document.size} 字节</p>
                  <p>更新时间：{document.updatedAt}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderScheduleView = () => (
    <div className="workspace-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">组会日程</p>
          <h2>简约日历视图</h2>
          <p className="panel-subtitle">
            每周一晚 20:00-23:00 固定为组会时间，4 月 19 日为史语所踏青活动。
          </p>
        </div>
      </div>

      <div className="schedule-layout">
        <div className="participant-form-card schedule-form-card">
          <h3>新增日程</h3>
          <label>
            标题
            <input
              type="text"
              value={scheduleForm.title}
              onChange={(event) =>
                updateScheduleFormField("title", event.target.value)
              }
              placeholder="例如：论文讨论、读书会"
            />
          </label>
          <label>
            日期
            <input
              type="date"
              value={scheduleForm.date}
              onChange={(event) =>
                updateScheduleFormField("date", event.target.value)
              }
            />
          </label>
          <div className="time-grid">
            <label>
              开始时间
              <input
                type="time"
                value={scheduleForm.startTime}
                onChange={(event) =>
                  updateScheduleFormField("startTime", event.target.value)
                }
              />
            </label>
            <label>
              结束时间
              <input
                type="time"
                value={scheduleForm.endTime}
                onChange={(event) =>
                  updateScheduleFormField("endTime", event.target.value)
                }
              />
            </label>
          </div>
          <label>
            备注
            <textarea
              value={scheduleForm.note}
              onChange={(event) =>
                updateScheduleFormField("note", event.target.value)
              }
              placeholder="可以写地点、主持人或提醒事项"
            />
          </label>
          <div className="panel-actions">
            <button type="button" onClick={submitScheduleForm}>
              添加日程
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={resetScheduleForm}
            >
              清空表单
            </button>
          </div>
          {scheduleFeedback ? (
            <p className="helper-text">{scheduleFeedback}</p>
          ) : null}
        </div>

        <div className="participant-table-card schedule-calendar-card">
          <div className="calendar-toolbar">
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                setCurrentMonth(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() - 1,
                    1,
                  ),
                )
              }
            >
              上个月
            </button>
            <h3>{monthLabel}</h3>
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                setCurrentMonth(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() + 1,
                    1,
                  ),
                )
              }
            >
              下个月
            </button>
          </div>

          <div className="calendar-grid calendar-weekdays">
            {WEEK_LABELS.map((label) => (
              <div key={label} className="calendar-weekday">
                周{label}
              </div>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarDays.map((day) => {
              const dateKey = formatDateKey(day);
              const dayEvents = eventsByDate.get(dateKey) || [];
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

              return (
                <div
                  key={dateKey}
                  className={`calendar-day ${isCurrentMonth ? "" : "is-muted"}`}
                >
                  <div className="calendar-day-header">
                    <span>{day.getDate()}</span>
                  </div>
                  <div className="calendar-events">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`calendar-event ${event.category || "custom"}`}
                      >
                        <div>
                          <strong>
                            {event.icon ? `${event.icon} ` : ""}
                            {event.title}
                          </strong>
                          <p>
                            {event.startTime} - {event.endTime}
                          </p>
                        </div>
                        {!event.isFixed ? (
                          <button
                            type="button"
                            className="calendar-delete"
                            onClick={() => removeSchedule(event.id)}
                          >
                            删除
                          </button>
                        ) : (
                          <span className="calendar-badge">
                            {event.category === "outing" ? "活动" : "固定"}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="participant-table-card">
        <h3>本月日程清单</h3>
        {monthEvents.length === 0 ? (
          <p className="empty-state">这个月还没有任何日程。</p>
        ) : (
          <div className="document-list">
            {monthEvents.map((event) => (
              <div key={event.id} className="document-item">
                <div>
                  <h4>
                    {event.icon ? `${event.icon} ` : ""}
                    {event.title}
                  </h4>
                  <p>{formatDisplayDate(event.date)}</p>
                  <p>
                    {event.startTime} - {event.endTime}
                  </p>
                  {event.note ? <p>{event.note}</p> : null}
                </div>
                {!event.isFixed ? (
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => removeSchedule(event.id)}
                  >
                    删除
                  </button>
                ) : (
                  <span className="calendar-badge">
                    {event.category === "outing" ? "快乐出行" : "固定日程"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="main">
      <div className="nav">
        <p>史语所科研助手</p>
        <img src={assets.user_icon} alt="" />
      </div>
      <div className="main-container">
        {viewMode === "participants"
          ? renderParticipantsView()
          : viewMode === "knowledge"
            ? renderKnowledgeView()
            : viewMode === "schedule"
              ? renderScheduleView()
              : renderChatView()}
      </div>
    </div>
  );
};

export default Main;
