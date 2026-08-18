import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkBreaks from 'remark-breaks'
import './App.css'

function App() {
  const [messages, setMessages] = useState([
      {id: 1, role: 'assistant', content: '안녕하세요! 직접 꾸민 스타일이 멋있네요'}
  ]);

  const [input, setInput] = useState('');

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if(!input.trim()) return;

    const userMessage = {id: Date.now(), role: 'user', content: input}
    setMessages((prevMessages) => [...prevMessages, userMessage])

    setInput(''); //입력창 초기화

    setTimeout(() => {
      const aiReply = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `입력하신 내용입니다:\n\n\`\`\`text\n${userText}\n\`\`\`\n\n- **입력 문자 수**: ${userText.length}자\n- **상태**: 정상 전송 완료`
      };
      setMessages((prevMessages) => [...prevMessages, aiReply])
    }, 500)
  };

  const handdleKeyDown = (e) => {
    if(e.nativeEvent.isComposing) return; // 한글 입력시 마지막 글자가 두 번 전달되는 현상 방지

    if(e.key === 'Enter' && !e.shiftKey){
      e.preventDefault(); // 기본 줄 바꿈 금지
      handleSend();
    }
    // shift + enter는 아무 것도 막지 않음. 자동으로 줄 바꿈
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
              rows={1}
              placeholder='메세지를 입력하시오..(shift + enter) 줄바꿈'
              className='chat-textarea' 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handdleKeyDown}
              />
            <button className="send-btn" type='submit'>전송</button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default App
