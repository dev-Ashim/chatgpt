import { useState } from 'react'
import ChatIcon from './ChatIcon'

const ChatConversation = ({ activeChat, isThinking, onOpenSidebar, onCreateChat }) => {
  const [activeMode, setActiveMode] = useState('Chat')

  return (
    <>
    <header className="chat-header">
      <button
        className="icon-button sidebar-toggle"
        type="button"
        aria-label="Open conversations menu"
        onClick={onOpenSidebar}
      >
        <ChatIcon name="sidebar" />
      </button>
      <div className="mode-switch" role="tablist" aria-label="Workspace mode">
        {['Chat', 'Work'].map((mode) => (
          <button
            className={activeMode === mode ? 'is-active' : ''}
            key={mode}
            type="button"
            role="tab"
            aria-selected={activeMode === mode}
            onClick={() => setActiveMode(mode)}
          >
            {mode}
          </button>
        ))}
      </div>
      <button className="header-new-chat" type="button" onClick={onCreateChat} aria-label="Start a new chat" title="New chat">
        <ChatIcon name="refresh" />
      </button>
    </header>

    <div className="chat-scroll-area">
      <div className="conversation-content" aria-live="polite">
        {activeChat?.messages.length ? (
          <div className="message-list">
            {activeChat.messages.map((message) => (
              <article className={`chat-message ${message.role}`} key={message.id}>
                {message.role === 'assistant' && (
                  <span className="assistant-mark" aria-hidden="true">C</span>
                )}
                <p>{message.content}</p>
              </article>
            ))}
            {isThinking && (
              <article className="chat-message assistant is-thinking" aria-label="AI is thinking">
                <span className="assistant-mark" aria-hidden="true">C</span>
                <p>Thinking<span className="thinking-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></p>
              </article>
            )}
          </div>
        ) : (
          <div className="chat-welcome">
            <h1>What&apos;s on your mind today?</h1>
          </div>
        )}
      </div>
    </div>
    </>
  )
}

export default ChatConversation