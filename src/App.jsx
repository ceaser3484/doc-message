import React, { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkBreaks from 'remark-breaks'

import './App.css'
import { MessageSquare, PanelRightDashed } from 'lucide-react'

function App() {
  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null); // textarea 요소에 접근할 ref 생성
  const MODEL = "gpt-oss-safeguard:20b"

  // 예시 문구를 입력하기 위한 모달
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exampleText, setExampleText] = useState("");

  // 팝업 열기/닫기 함수
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

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
    const updatedMessages = [...messages, userMessage];

    setInput(''); //입력창 초기화
    setLoading(true);

    const initialAiMessage = {id: aiMessageId, role: 'assistant', content:'AI가 생각 중입니다. '};
    setMessages((prevMessages) => [...prevMessages, userMessage, initialAiMessage])
    console.log(updatedMessages);

    try{
      const response = await fetch("/ollama_api/api/chat", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          messages: updatedMessages,
          stream: true,
          options: {
            temperature: 0.8,
          }
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
          let parsedObj = parsed.message || {}; // parsed.message가 없으면 빈 객체로 초기화
          
          // 1. 생각 중인 메시지 처리
          if (parsedObj.thinking){
            if (isFirstThinkingChunk){
              accumulatedContent = "";
              isFirstThinkingChunk = false;
            }
            accumulatedContent += parsedObj.thinking;

            if (currentTime - lastRenderTime >= RENDER_INTERVAL) {
              // 생각 중일 때는 isThinking: true 유지
              updateAiMessage(aiMessageId, accumulatedContent, true);
              lastRenderTime = currentTime;
            }
          }

          // 2. 실제 응답 처리
          if (parsedObj.content) {
            if(isFirstChunk){
              accumulatedContent = ""; // 💡 생각 내용을 싹 지우고 실제 응답으로 리셋!
              isFirstChunk = false;
            }
            accumulatedContent += parsedObj.content;
            
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

  const handleSave = () => {
    console.log("저장된 예시 문구: ", exampleText);
    // TODO: 백엔드 에이전트나 상태 관리 변수로 exampletext 전달
    alert("예시 문구가 저장되었습니다");
    closeModal();
  };

  const updateAiMessage = (id, newContent, isThinkingState) => {
    // 메세지를 띄우는 함수
    setMessages((prevMessages) => 
      prevMessages.map((msg) => 
        msg.id === id 
          ? { ...msg, content: newContent, isThinking: isThinkingState } 
          : msg
      )
    );
  };

const parseBrTag = (nodes) => {
  return React.Children.map(nodes, (child) => {
    // 자식이 문자열인 경우
    if (typeof child === 'string') {
      const parts = child.split(/<br\s*\/?>/gi);
      return parts.map((part, index) => (
        <React.Fragment key={index}>
          {part}
          {index < parts.length - 1 && <br />}
        </React.Fragment>
      ));
    }
    // 자식이 또 다른 태그(예: <strong> 등)를 품고 있는 경우 재귀적으로 처리
    if (React.isValidElement(child) && child.props && child.props.children) {
      return React.cloneElement(child, {
        ...child.props,
        children: parseBrTag(child.props.children)
      });
    }
    return child;
  });
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
        <div className="head-container">
          <button className='set-example-btn'
          onClick={() => {
            openModal();
            alert("모달 열기 버튼 정상 작동");
          }}>예시 문구 입력</button>
        </div>
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
                      <p style={{ display: 'inline', margin: 0, padding: 0 }}>
                        {children}
                      </p>
                    );
                  },
                  ul({children}){
                    return (
                      <ul style={{ 
                        margin: "6px 0",
                        paddingLeft: '20px',
                        listStyleType: 'disc'
                      }}>
                        {children}
                      </ul>
                    );
                  },
                  ol({children}){
                    return (
                      <ol style={{
                        margin: "6px 0",
                        paddingLeft: '20px',
                      }}>
                        {children}
                      </ol>
                    );
                  },
                  li({children}){
                    return (
                      <li style={{
                        margin: '6px 0',
                        lineHeight: '1.6'
                      }}>
                        {children}
                      </li>
                    );
                  },
                  table({children}){
                    return (
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse', // 👈 선이 겹치지 않고 한 줄로 깔끔하게 합쳐짐
                        margin: '16px 0',
                        fontSize: '0.95em'
                      }}>
                        {children}
                      </table>
                    );
                  },
                  th({children}){
                    return (
                      <th style={{
                        border: '1px solid #cbd5e1', // 옅은 회색 윤곽선
                        backgroundColor: '#242121',    // 헤더 배경색
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontWeight: '600'
                      }}>
                        {parseBrTag(children)}
                      </th>
                    );
                  },
                  td({children}){
                    return (
                      <td style={{
                        border: '1px solid #cbd5e1', // 👈 각 칸마다 윤곽선이 확실하게 보이도록 지정
                        padding: '8px 12px',
                        textAlign: 'left'
                      }}>
                        {parseBrTag(children)}
                      </td>
                    );
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
      {/* 예시 문구 입력 모달 */}
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>예시 문구 설정</h3>
              <p>
                AI가 참고할 모범 예시 문구를 입력하세요
              </p>
              <textarea 
                className="modal-textarea"
                value={exampleText}
                onChange={(e) => setExampleText(e.target.value)}
                placeholder="예시) 책임감이 투철하여 학급일에 앞장서서 봉사함.."
              ></textarea>
              <div className="modal-buttons">
                <button className="modal-cancel-btn" onClick={() => {
                  setExampleText('')
                  setIsModalOpen(false)
                }}>취소</button>
                <button className="modal-save-btn" onClick={() => {
                  alert("저장되었습니다")
                  setExampleText(exampleText)
                  setIsModalOpen(false)
                }}
                >저장하기</button>
              </div>
            </div>
          </div>
        )}
        {/* 모달 종료 */}
    </div>
  );
}

export default App
