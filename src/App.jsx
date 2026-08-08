import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import './App.css'

function App() {
  

  return (
    <div className="app-container">
      {/* 좌측 사이드바 */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <h1 className="logo">My Chat AI</h1>
          <button className="new-chat-btn">+ 새 채팅</button>
        </div>
        <div className="sidebar-bottom">
          <span>Ollama + LangChain</span>
        </div>
      </aside>

      {/* 우측 메인 영역 */}
      <main className="main-content">
        <div className="chat-area">
          <div className="chat-wrapper">

            {/* AI 메세지 */}
            <div className="message assistant">
              <div className="avatar asistant-avatar">AI</div>
              <div className="bubble">
                안녕하세요! CSS를 직접 작성해 보며 만드는 채팅서비스입니다.
              </div>
            </div>
            <div className="avatar user-avatar">나</div>
          </div>
        </div>

        {/* 하단 입력 */}
        <div className="input-area">
          <div className="input-wrapper">
            <input 
              type="text"
              placeholder='메세지를 입력하세요'
              className='chat-input' />
            <button className="send-btn">전송</button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App
