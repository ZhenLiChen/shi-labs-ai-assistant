import React, { useContext, useState } from "react";
import "./SideBar.css";
import { assets } from "../../assets/assets";
import { Context } from "../../context/Context";

const SideBar = () => {
  const [extended, setExtended] = useState(true);
  const {
    viewMode,
    sessions,
    currentSessionId,
    createNewSession,
    loadSession,
    deleteSession,
    openParticipantsView,
    openKnowledgeBaseView,
    openScheduleView,
  } = useContext(Context);

  return (
    <div className="sidebar">
      <div className="top">
        <img
          className="menu"
          src={assets.menu_icon}
          alt=""
          onClick={() => setExtended(!extended)}
        />
        <div onClick={() => createNewSession()} className="new-chat">
          <img src={assets.plus_icon} alt="" />
          {extended ? <p>新建对话</p> : null}
        </div>
        {extended ? (
          <div className="sidebar-section">
            <p className="recent-title">工作区</p>
            <div
              onClick={() => createNewSession()}
              className={`recent-entry ${viewMode === "chat" ? "active" : ""}`}
            >
              <img src={assets.message_icon} alt="" />
              <p>智能问答</p>
            </div>
            <div
              onClick={openParticipantsView}
              className={`recent-entry ${
                viewMode === "participants" ? "active" : ""
              }`}
            >
              <img src={assets.question_icon} alt="" />
              <p>参与者登记</p>
            </div>
            <div
              onClick={openKnowledgeBaseView}
              className={`recent-entry ${
                viewMode === "knowledge" ? "active" : ""
              }`}
            >
              <img src={assets.history_icon} alt="" />
              <p>组会知识库</p>
            </div>
            <div
              onClick={openScheduleView}
              className={`recent-entry ${
                viewMode === "schedule" ? "active" : ""
              }`}
            >
              <img src={assets.setting_icon} alt="" />
              <p>组会日程</p>
            </div>
          </div>
        ) : null}
        {extended && (
          <div className="recent">
            <p className="recent-title">最近对话</p>
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => loadSession(session.id)}
                className={`recent-entry ${
                  session.id === currentSessionId && viewMode === "chat"
                    ? "active"
                    : ""
                }`}
              >
                <img src={assets.message_icon} alt="" />
                <p>{session.title.slice(0, 18)}...</p>
                <img
                  src={assets.trash}
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteSession(session.id);
                  }}
                  alt=""
                  className="delete-icon"
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bottom">
        <div className="brand-box">
          <p>史语所科研助手</p>
          <span>组会知识库 + 参与者管理 + 日程协作</span>
        </div>
      </div>
    </div>
  );
};

export default SideBar;
