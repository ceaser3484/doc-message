import React, { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkBreaks from 'remark-breaks'

import './App.css'
import { PanelRightDashed } from 'lucide-react'

function App() {
  const [messages, setMessages] = useState([
      {id: 1, role: 'assistant', content: '안녕하세요! 직접 꾸민 스타일이 멋있네요'}
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null); // textarea 요소에 접근할 ref 생성
  const MODEL = "gpt-oss-safeguard:20b"
  // input 값이 바뀔 때 마다 높이를 내용물에 맞춰 자동으로 조절
  useEffect(() => {
    if(textareaRef.current){
      //높이 계산을 위해 일단 height를 auto으로 리셋
      textareaRef.current.style.height = 'auto';
      // 내용물의 실제 높이(scrollHeight) 로 height 지정
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if(!input.trim()) return;

    const message = input.trim();
    const userMessageId = Date.now();
    const aiMessageId = userMessageId + 1;
    
    const userMessage = {id: userMessageId, role: 'user', content: message};
    const initialAiMessage = {id: aiMessageId, role: 'assistant', content:'AI가 생각 중입니다. '};
    setMessages((prevMessages) => [...prevMessages, userMessage, initialAiMessage])

    setInput(''); //입력창 초기화
    setLoading(true);

    try{
      const response = await fetch("/ollama_api/api/generate", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          prompt: message,
          stream: true,
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let isDone = false;
      let accumulatedContent = ""; 
      let isFirstChunk = true; 
      let isFirstThinkingChunk = true; 
      let lastRenderTime = Date.now(); 
      const RENDER_INTERVAL = 200;

      while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true});
      
      const lines = buffer.split("\n");
      buffer = lines.pop(); 

      for (const line of lines){
        const trimmed = line.trim();
        if (!trimmed) continue; 

        const parsed = JSON.parse(trimmed);
        const currentTime = Date.now();
        
        // 1. 생각 중인 메시지 처리
        if (parsed.thinking){
          if (isFirstThinkingChunk){
            accumulatedContent = "";
            isFirstThinkingChunk = false;
          }
          accumulatedContent += parsed.thinking;

          if (currentTime - lastRenderTime >= RENDER_INTERVAL) {
            // 생각 중일 때는 isThinking: true 유지
            updateAiMessage(aiMessageId, accumulatedContent, true);
            lastRenderTime = currentTime;
          }
        }

        // 2. 실제 응답 처리
        if (parsed.response) {
          if(isFirstChunk){
            accumulatedContent = ""; // 💡 생각 내용을 싹 지우고 실제 응답으로 리셋!
            isFirstChunk = false;
          }
          accumulatedContent += parsed.response;
          
          if (currentTime - lastRenderTime >= RENDER_INTERVAL) {
            // 🌟 실제 응답이 시작되었으므로 isThinking을 false로 변경!
            updateAiMessage(aiMessageId, accumulatedContent, false);
            lastRenderTime = currentTime;
          }
        }

        if (parsed.done) {
          isDone = true;
          break;
        }
      }

      if(isDone) break;
    }

    // 스트리밍 종료 후 최종 반영 (이때도 응답이므로 isThinking은 false)
    updateAiMessage(aiMessageId, accumulatedContent, false);

    } catch (error){
      console.error("통신 에러", error);
      updateAiMessage(aiMessageId, "AI 응답 중 오류가 발생했습니다.");
    }finally{
      setLoading(false);
    }

  };

  
  const handdleKeyDown = (e) => {
    if(e.nativeEvent.isComposing) return; // 한글 입력시 마지막 글자가 두 번 전달되는 현상 방지

    if(e.key === 'Enter' && !e.shiftKey){
      e.preventDefault(); // 기본 줄 바꿈 금지
      handleSend();
    }
    // shift + enter는 아무 것도 막지 않음. 자동으로 줄 바꿈
  };

  const updateAiMessage = (id, newContent, isThinkingState) => {
    setMessages((prevMessages) => 
      prevMessages.map((msg) => 
        msg.id === id 
          ? { ...msg, content: newContent, isThinking: isThinkingState } 
          : msg
      )
    );
  };
  return (

    <div className="app-container">
      {/* 좌측 사이드바 */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <h1 className="logo">My Chat AI</h1>
          <button className="new-chat-btn">+ 새 채팅</button>
        </div>
        <div className="sidebar-botton">
          <span>Ollama + LangChain</span>
        </div>
      </aside>

      {/* 우측 메인 영역 */}
      <main className="main-content">
        <div className="chat-area">
          <div className="chat-wrapper">

            {/* AI 메세지 */}
            <div className="message assistant">
              <div className="avatar assistant-avatar">AI</div>
              <div className="bubble">
                안녕하세요! CSS를 직접 작성해 보며 만드는 채팅서비스입니다.
              </div>
            </div>

           {/* 사용자 메세지 */}
           <div className="message user">
            <div className="bubble">
              직접 CSS 스타일을 작성하니까 구조가 한눈에 보이네
            </div>
            <div className="avatar user-avatar">나</div>
           </div>
           {/* messages 배열을 map() */}
           {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              {/* Ai 아바타(좌측) */}
              {msg.role === 'assistant' && (
                <div className="avatar assistant-avatar">AI</div>
              )}

              {/* 말풍선 본문 */}
              <div className="bubble">
                <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  p({children}){
                    return(
                      <span style={{ display: 'inline', margin: 0, padding: 0 }}>
                        {children}
                      </span>
                    );
                  },

                  ul({children}){
                    return (
                    <ul style={{ 
                      margin: "4px 0 4px 0",
                      paddingLeft: '18px',
                      listStyleType: 'disc'
                     }}>
                      {children}
                    </ul>
                      );
                  },
                  ol({children}){
                    return (
                      <ol style={{
                        margin: "4px 0 4px 0",
                        paddingLeft: '18px',
                      }}>
                        {children}
                      </ol>
                    )
                  },
                  li({children}){
                    return (
                      <li style={{
                        margin: '0',
                        padding: '0',
                        lineHeight: '1.3'
                      }}>
                        {children}
                      </li>
                    )
                  },
                  code({node, inline, className, children, ...props }){
                    const match = /language-(\w+)/.exec(className || '');
                    // 여러 줄 코드 블록 : 중앙 정렬 wrapper으로 감싸기
                    return !inline && match ? (
                      <div className='code-block-wrapper'>
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag='div'
                          className='code-block'
                          {...props}
                        >
                          {String(children).replace(/\n$/,'')}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      // 한 줄짜리 인라인 코드
                      <code className='inline-code' {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>

              {/* 사용자 아바타(우측) */}
              {msg.role === 'user' && (
                <div className="avatar user-avatar">나</div>
              )}
            </div>
           ))}
         </div>
        </div>

        {/* 하단 입력 */}
        <div className="input-area">
          <form className="input-wrapper" onSubmit={handleSend}>
            <textarea 
              ref={textareaRef}
              rows={1}
              placeholder='메세지를 입력하시오..(shift + enter) 줄바꿈'
              className='chat-textarea' 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handdleKeyDown}
              />
            <button className="send-btn" type='submit' disabled={loading}>
              {loading ? '전송 중...' : '전송'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default App
