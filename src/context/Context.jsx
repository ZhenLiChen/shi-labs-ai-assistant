import { createContext, useState, useEffect, useRef, useCallback } from "react";
import streamParser from "../services/streamParser";

export const Context = createContext();

const PARTICIPANT_FORM_INITIAL = {
  name: "",
  studentId: "",
  age: "",
  gender: "",
  trained: "",
  chineseLevel: "",
  englishLevel: "",
  otherLanguages: "",
};

const SCHEDULE_FORM_INITIAL = {
  title: "",
  date: "",
  startTime: "20:00",
  endTime: "23:00",
  note: "",
};

const API_BASE_URL = "http://localhost:3001";

const ContextProvider = (props) => {
  const [viewMode, setViewMode] = useState("chat");
  const [input, setInput] = useState("");
  const [recentPrompt, setRecentPrompt] = useState("");
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState("");
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [participantForm, setParticipantForm] = useState(
    PARTICIPANT_FORM_INITIAL,
  );
  const [editingParticipantId, setEditingParticipantId] = useState(null);
  const [participantFeedback, setParticipantFeedback] = useState("");
  const [documents, setDocuments] = useState([]);
  const [knowledgeFeedback, setKnowledgeFeedback] = useState("");
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [scheduleForm, setScheduleForm] = useState(SCHEDULE_FORM_INITIAL);
  const [scheduleFeedback, setScheduleFeedback] = useState("");

  const chatContainerRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  const fetchParticipants = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/participants`);
      if (!response.ok) {
        throw new Error("获取参与者列表失败");
      }

      const data = await response.json();
      setParticipants(data.participants || []);
    } catch (error) {
      console.error("Fetch participants error:", error);
      setParticipantFeedback("加载参与者列表失败，请检查后端服务。");
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents`);
      if (!response.ok) {
        throw new Error("获取知识库文档失败");
      }

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Fetch documents error:", error);
      setKnowledgeFeedback("加载知识库文档失败，请检查后端服务。");
    }
  }, []);

  const fetchSchedules = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/schedules`);
      if (!response.ok) {
        throw new Error("获取日程失败");
      }

      const data = await response.json();
      setSchedules(data.schedules || []);
    } catch (error) {
      console.error("Fetch schedules error:", error);
      setScheduleFeedback("加载日程失败，请检查后端服务。");
    }
  }, []);

  const createNewSession = useCallback(() => {
    const newSession = {
      id: Date.now(),
      title: "New Chat",
      messages: [],
      createdAt: new Date().toISOString(),
      showResult: false,
      resultData: "",
      isGenerating: false,
      input: "",
    };

    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setShowResult(false);
    setResultData("");
    setInput("");
    setLoading(false);
    setIsGenerating(false);
    setViewMode("chat");
  }, []);

  const loadSession = useCallback(
    (sessionId) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (session) {
        setCurrentSessionId(sessionId);
        setMessages(session.messages);
        setShowResult(
          session.showResult !== undefined
            ? session.showResult
            : session.messages.length > 0,
        );
        setRecentPrompt(session.title);
        setResultData(session.resultData || "");
        setIsGenerating(session.isGenerating || false);
        setInput(session.input || "");
        setViewMode("chat");
      }
    },
    [sessions],
  );

  const deleteSession = useCallback(
    (sessionId) => {
      setSessions((prev) => {
        const updatedSessions = prev.filter((item) => item.id !== sessionId);

        if (currentSessionId === sessionId) {
          if (updatedSessions.length > 0) {
            setTimeout(() => loadSession(updatedSessions[0].id), 0);
          } else {
            setTimeout(() => createNewSession(), 0);
          }
        }

        return updatedSessions;
      });
    },
    [currentSessionId, loadSession, createNewSession],
  );

  const updateSessionMessages = useCallback(
    (newMessages, additionalState = {}) => {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === currentSessionId
            ? {
                ...session,
                messages: newMessages,
                title:
                  newMessages.find((item) => item.role === "user")?.content?.slice(
                    0,
                    20,
                  ) || "New Chat",
                showResult:
                  additionalState.showResult !== undefined
                    ? additionalState.showResult
                    : session.showResult,
                resultData:
                  additionalState.resultData !== undefined
                    ? additionalState.resultData
                    : session.resultData,
                isGenerating:
                  additionalState.isGenerating !== undefined
                    ? additionalState.isGenerating
                    : session.isGenerating,
                input:
                  additionalState.input !== undefined
                    ? additionalState.input
                    : session.input,
              }
            : session,
        ),
      );
    },
    [currentSessionId],
  );

  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession();
    }
  }, [sessions.length, createNewSession]);

  useEffect(() => {
    fetchParticipants();
    fetchDocuments();
    fetchSchedules();
  }, [fetchParticipants, fetchDocuments, fetchSchedules]);

  const scrollToBottom = () => {
    if (chatContainerRef.current && !isUserScrollingRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

      isUserScrollingRef.current = !isAtBottom;

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 1000);
    }
  };

  const onSent = async (prompt) => {
    if (isGenerating) return;

    const messageText = prompt !== undefined ? prompt : input;
    if (!messageText.trim()) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: messageText.trim(),
      timestamp: new Date().toLocaleString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    updateSessionMessages(newMessages, {
      showResult: true,
      isGenerating: true,
      input: "",
    });
    setInput("");
    setShowResult(true);
    setLoading(true);
    setIsGenerating(true);
    setRecentPrompt(messageText);
    setViewMode("chat");

    const aiMessage = {
      id: Date.now() + 1,
      role: "assistant",
      content: "",
      timestamp: new Date().toLocaleString(),
      status: "generating",
    };

    const messagesWithAI = [...newMessages, aiMessage];
    setMessages(messagesWithAI);

    try {
      const apiMessages = newMessages.map((item) => ({
        role: item.role,
        content: item.content,
      }));

      let fullContent = "";

      await streamParser.fetchStream(
        apiMessages,
        (chunk) => {
          fullContent += chunk;
          const updatedMessages = messagesWithAI.map((item) =>
            item.id === aiMessage.id ? { ...item, content: fullContent } : item,
          );
          setMessages(updatedMessages);
          updateSessionMessages(updatedMessages, { resultData: fullContent });
          scrollToBottom();
        },
        (error) => {
          console.error("Stream error:", error);
          const errorMessages = messagesWithAI.map((item) =>
            item.id === aiMessage.id
              ? {
                  ...item,
                  status: "failed",
                  content: fullContent || "生成失败，请重试",
                }
              : item,
          );
          setMessages(errorMessages);
          updateSessionMessages(errorMessages, { isGenerating: false });
          setLoading(false);
          setIsGenerating(false);
        },
        () => {
          const completedMessages = messagesWithAI.map((item) =>
            item.id === aiMessage.id
              ? { ...item, status: "completed", content: fullContent }
              : item,
          );
          setMessages(completedMessages);
          updateSessionMessages(completedMessages, {
            resultData: fullContent,
            isGenerating: false,
          });
          setLoading(false);
          setIsGenerating(false);
          setResultData(fullContent);
        },
      );
    } catch (error) {
      console.error("Error:", error);
      const errorMessages = messagesWithAI.map((item) =>
        item.id === aiMessage.id
          ? { ...item, status: "failed", content: "生成失败，请重试" }
          : item,
      );
      setMessages(errorMessages);
      updateSessionMessages(errorMessages, { isGenerating: false });
      setLoading(false);
      setIsGenerating(false);
    }
  };

  const abortGeneration = () => {
    streamParser.abort();
    setLoading(false);
    setIsGenerating(false);
    const updatedMessages = messages.map((item) =>
      item.status === "generating" ? { ...item, status: "aborted" } : item,
    );
    setMessages(updatedMessages);
    updateSessionMessages(updatedMessages, { isGenerating: false });
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSent();
    }
  };

  const openParticipantsView = () => {
    setParticipantFeedback("");
    setViewMode("participants");
  };

  const openKnowledgeBaseView = () => {
    setKnowledgeFeedback("");
    setViewMode("knowledge");
  };

  const openScheduleView = () => {
    setScheduleFeedback("");
    setViewMode("schedule");
  };

  const updateParticipantFormField = (field, value) => {
    setParticipantForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetParticipantForm = () => {
    setParticipantForm(PARTICIPANT_FORM_INITIAL);
    setEditingParticipantId(null);
  };

  const startEditingParticipant = (participant) => {
    setParticipantForm({
      name: participant.name || "",
      studentId: participant.studentId || "",
      age: participant.age || "",
      gender: participant.gender || "",
      trained: participant.trained || "",
      chineseLevel: participant.chineseLevel || "",
      englishLevel: participant.englishLevel || "",
      otherLanguages: participant.otherLanguages || "",
    });
    setEditingParticipantId(participant.id);
    setParticipantFeedback(`正在编辑 ${participant.name} 的登记信息。`);
    setViewMode("participants");
  };

  const submitParticipantForm = async () => {
    if (!participantForm.name.trim() || !participantForm.studentId.trim()) {
      setParticipantFeedback("姓名和学号为必填项。");
      return;
    }

    const payload = {
      ...participantForm,
      name: participantForm.name.trim(),
      studentId: participantForm.studentId.trim(),
      age: participantForm.age.trim(),
      gender: participantForm.gender,
      trained: participantForm.trained,
      chineseLevel: participantForm.chineseLevel,
      englishLevel: participantForm.englishLevel,
      otherLanguages: participantForm.otherLanguages.trim(),
    };

    const isEditing = Boolean(editingParticipantId);
    const url = isEditing
      ? `${API_BASE_URL}/api/participants/${editingParticipantId}`
      : `${API_BASE_URL}/api/participants`;
    const method = isEditing ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "保存参与者失败");
      }

      await fetchParticipants();
      setParticipantFeedback(isEditing ? "参与者信息已更新。" : "参与者已登记。");
      resetParticipantForm();
    } catch (error) {
      console.error("Save participant error:", error);
      setParticipantFeedback(error.message || "保存参与者失败。");
    }
  };

  const removeParticipant = async (participantId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/participants/${participantId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "删除参与者失败");
      }

      await fetchParticipants();
      if (editingParticipantId === participantId) {
        resetParticipantForm();
      }
      setParticipantFeedback("参与者已删除。");
    } catch (error) {
      console.error("Delete participant error:", error);
      setParticipantFeedback(error.message || "删除参与者失败。");
    }
  };

  const uploadDocument = async (file) => {
    if (!file) return;

    try {
      setIsUploadingDocument(true);
      setKnowledgeFeedback("");
      const content = await file.text();

      const response = await fetch(`${API_BASE_URL}/api/documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: file.name,
          content,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "上传文档失败");
      }

      await fetchDocuments();
      setKnowledgeFeedback(`已上传文档：${file.name}`);
    } catch (error) {
      console.error("Upload document error:", error);
      setKnowledgeFeedback(error.message || "上传文档失败。");
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const updateScheduleFormField = (field, value) => {
    setScheduleForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetScheduleForm = () => {
    setScheduleForm(SCHEDULE_FORM_INITIAL);
  };

  const submitScheduleForm = async () => {
    if (!scheduleForm.title.trim() || !scheduleForm.date) {
      setScheduleFeedback("标题和日期为必填项。");
      return;
    }

    const payload = {
      ...scheduleForm,
      title: scheduleForm.title.trim(),
      note: scheduleForm.note.trim(),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/schedules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "新增日程失败");
      }

      await fetchSchedules();
      setScheduleFeedback("日程已添加。");
      resetScheduleForm();
    } catch (error) {
      console.error("Save schedule error:", error);
      setScheduleFeedback(error.message || "新增日程失败。");
    }
  };

  const removeSchedule = async (scheduleId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/schedules/${scheduleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "删除日程失败");
      }

      await fetchSchedules();
      setScheduleFeedback("日程已删除。");
    } catch (error) {
      console.error("Delete schedule error:", error);
      setScheduleFeedback(error.message || "删除日程失败。");
    }
  };

  const contextValue = {
    viewMode,
    setViewMode,
    sessions,
    currentSessionId,
    createNewSession,
    loadSession,
    deleteSession,
    onSent,
    setRecentPrompt,
    recentPrompt,
    showResult,
    loading,
    resultData,
    input,
    setInput,
    handleKeyPress,
    messages,
    isGenerating,
    abortGeneration,
    chatContainerRef,
    handleScroll,
    updateSessionMessages,
    participants,
    participantForm,
    editingParticipantId,
    participantFeedback,
    updateParticipantFormField,
    submitParticipantForm,
    startEditingParticipant,
    removeParticipant,
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
    openParticipantsView,
    openKnowledgeBaseView,
    openScheduleView,
    fetchParticipants,
    fetchDocuments,
    fetchSchedules,
  };

  return (
    <Context.Provider value={contextValue}>{props.children}</Context.Provider>
  );
};

export default ContextProvider;
