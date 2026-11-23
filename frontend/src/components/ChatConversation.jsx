import { useEffect, useState } from 'react'
import AzrealMode from './AzrealMode'
import AzrealRobot from './AzrealRobot'
import ChatIcon from './ChatIcon'
import MarkdownMessage from './MarkdownMessage'
import { MODES } from './modes'

const SUGGESTIONS = [
  { icon: 'sparkle', label: 'Brainstorm', prompt: 'Brainstorm 5 bold startup ideas that use AI in everyday life' },
  { icon: 'code', label: 'Code', prompt: 'Write a clean, well-commented debounce function in JavaScript' },
  { icon: 'bolt', label: 'Explain', prompt: 'Explain how large language models work, like I am 12' },
  { icon: 'edit', label: 'Write', prompt: 'Draft a short, friendly email asking my team for project updates' },
]

const greetingFor = (date = new Date()) => {
  const hour = date.getHours()
  if (hour < 5) return 'Burning the midnight oil'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Azreal greets the user and cycles through tips, typed out like a terminal
const RobotGuide = ({ firstName }) => {
  const tips = [
    `${greetingFor()}${firstName ? `, ${firstName}` : ''}! I'm Azreal, your AI guide.`,
    'Pick a tile below, or just ask me anything.',
    'Tip: tap the mic to talk instead of typing.',
    'Tip: press + to give me images, PDFs or notes.',
    'Switch to Azreal mode and I can act on this PC.',
  ]
  const [tipIndex, setTipIndex] = useState(0)
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? Infinity : 0))
  const tip = tips[tipIndex % tips.length]
  const isTyping = shown < tip.length

  useEffect(() => {
    const instant = prefersReducedMotion()
    if (isTyping && !instant) {
      const timer = setTimeout(() => setShown((count) => count + 1), 28)
      return () => clearTimeout(timer)
    }
    const timer = setTimeout(() => {
      setTipIndex((index) => index + 1)
      setShown(instant ? Infinity : 0)
    }, 4200)
    return () => clearTimeout(timer)
  }, [isTyping, shown, tipIndex])

  return (
    <div className="robot-guide">
      <AzrealRobot className="robot-guide-bot" state={isTyping ? 'speaking' : 'idle'} trackCursor />
      <div className="robot-bubble">
        <span className="robot-bubble-name"><i aria-hidden="true" />Azreal</span>
        <p aria-hidden="true">{tip.slice(0, shown)}<span className="robot-caret" /></p>
        <p className="visually-hidden" aria-live="polite">{isTyping ? '' : tip}</p>
      </div>
    </div>
  )
}

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      aria-label={copied ? 'Copied' : 'Copy message'}
      title={copied ? 'Copied' : 'Copy'}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          setCopied(false)
        }
      }}
    >
      <ChatIcon name={copied ? 'check' : 'copy'} size={14} />
    </button>
  )
}

const AttachmentList = ({ attachments }) => (
  <ul className="message-attachments" aria-label="Attached files">
    {attachments.map((file, index) => (
      <li className="attachment-chip" key={`${file.name}-${index}`}>
        <ChatIcon name="file" size={14} />
        <span>{file.name}</span>
      </li>
    ))}
  </ul>
)

const UserMessage = ({ message, canEdit, onEdit }) => {
  const [draft, setDraft] = useState(null)
  const isEditing = draft !== null

  const save = (event) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content) return
    setDraft(null)
    if (content !== message.content) onEdit(message.id, content)
  }

  return (
    <div className="message-body">
      {message.attachments?.length > 0 && <AttachmentList attachments={message.attachments} />}
      {isEditing ? (
        <form className="message-edit" onSubmit={save}>
          <label className="visually-hidden" htmlFor={`edit-${message.id}`}>Edit message</label>
          <textarea
            id={`edit-${message.id}`}
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) save(event)
              if (event.key === 'Escape') setDraft(null)
            }}
            rows={Math.min(8, draft.split('\n').length + 1)}
          />
          <div className="message-edit-actions">
            <button type="button" onClick={() => setDraft(null)}>Cancel</button>
            <button type="submit" className="is-primary" disabled={!draft.trim()}>Send</button>
          </div>
        </form>
      ) : (
        <>
          {message.content && <p>{message.content}</p>}
          <div className="message-actions">
            <CopyButton text={message.content} />
            {canEdit && (
              <button
                type="button"
                aria-label="Edit message"
                title="Edit"
                onClick={() => setDraft(message.content)}
              >
                <ChatIcon name="edit" size={14} />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const AssistantMessage = ({ message, isLast, canRegenerate, onRegenerate }) => (
  <div className="message-body">
    {message.isError ? <p>{message.content}</p> : <MarkdownMessage content={message.content} />}
    {!message.isStreaming && (
      <div className="message-actions">
        {!message.isError && <CopyButton text={message.content} />}
        {isLast && canRegenerate && (
          <button
            type="button"
            aria-label={message.isError ? 'Retry' : 'Regenerate response'}
            title={message.isError ? 'Retry' : 'Regenerate'}
            onClick={onRegenerate}
          >
            <ChatIcon name="refresh" size={14} />
            {message.isError && <span>Retry</span>}
          </button>
        )}
      </div>
    )}
  </div>
)


const ChatConversation = ({
  mode = 'Chat',
  onModeChange,
  userName,
  onTranscribe,
  activeChat,
  isThinking,
  isLoading,
  isBusy,
  onOpenSidebar,
  onCreateChat,
  onRegenerate,
  onEditMessage,
  onSuggestion,
  showSuggestions = true,
}) => {
  const messages = activeChat?.messages || []
  const hasUserMessage = messages.some((message) => message.role === 'user')
  const firstName = (userName || '').trim().split(/\s+/)[0]

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
        {MODES.map((option) => (
          <button
            className={`${mode === option ? 'is-active' : ''}${option === 'Azreal' ? ' is-azreal' : ''}`}
            key={option}
            type="button"
            role="tab"
            aria-selected={mode === option}
            onClick={() => onModeChange?.(option)}
          >
            {option === 'Azreal' ? 'Azreal mode' : option}
          </button>
        ))}
      </div>
      {mode === 'Chat' && (
        <button className="header-new-chat" type="button" onClick={onCreateChat} aria-label="Start a new chat" title="New chat">
          <ChatIcon name="refresh" />
        </button>
      )}
    </header>

    {mode === 'Azreal' ? (
      <AzrealMode userName={userName} onTranscribe={onTranscribe} />
    ) : (
    <div className="chat-scroll-area">
      <div className="conversation-content" aria-live="polite">
        {messages.length ? (
          <div className="message-list">
            {messages.map((message, index) => (
              <article
                className={`chat-message ${message.role}${message.isError ? ' is-error' : ''}${message.isStreaming ? ' is-streaming' : ''}`}
                key={message.id}
              >
                {message.role === 'assistant' && (
                  <span className="assistant-mark" aria-hidden="true">
                    <AzrealRobot compact state={message.isStreaming ? 'speaking' : message.isError ? 'confirm' : 'idle'} />
                  </span>
                )}
                {message.role === 'assistant' ? (
                  <AssistantMessage
                    message={message}
                    isLast={index === messages.length - 1}
                    canRegenerate={!isBusy && hasUserMessage}
                    onRegenerate={onRegenerate}
                  />
                ) : (
                  <UserMessage message={message} canEdit={!isBusy} onEdit={onEditMessage} />
                )}
              </article>
            ))}
            {isThinking && (
              <article className="chat-message assistant is-thinking" aria-label="AI is thinking">
                <span className="assistant-mark" aria-hidden="true"><AzrealRobot compact state="thinking" /></span>
                <p className="thinking-text">Thinking<span className="thinking-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></p>
              </article>
            )}
          </div>
        ) : isLoading ? (
          <div className="chat-loading" role="status">
            <span className="visually-hidden">Loading conversation…</span>
            <span className="skeleton-line" />
            <span className="skeleton-line is-short" />
            <span className="skeleton-line is-mid" />
          </div>
        ) : (
          <>
            <div className="chat-welcome">
              <RobotGuide firstName={firstName} />
              <h1>What&apos;s on your mind today?</h1>
            </div>
            {showSuggestions && (
              <div className="welcome-suggestions" aria-label="Try asking">
                {SUGGESTIONS.map((item) => (
                  <button key={item.label} type="button" onClick={() => onSuggestion?.(item.prompt)} title={item.prompt}>
                    <ChatIcon name={item.icon} size={14} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
    )}
    </>
  )
}

export default ChatConversation
