import AzrealRobot from './AzrealRobot'
import ChatIcon from './ChatIcon'

const EFFORTS = ['Low', 'Medium', 'High']
const RING_RADIUS = 52
const RING_LENGTH = Math.PI * RING_RADIUS // half circle

// Right-hand floating panel (wide screens only): effort gauge, session facts, shortcuts
const ChatInsights = ({
  effort,
  onEffortChange,
  modelLabel,
  messageCount,
  chatCount,
  onOpenMemories,
  onCreateChat,
  onOpenAzreal,
}) => {
  const level = EFFORTS.indexOf(effort) + 1
  const filled = (level / EFFORTS.length) * RING_LENGTH

  return (
    <aside className="chat-insights" aria-label="Session panel">
      <section className="glass-card insights-session">
        <header className="glass-card-header">
          <h2>Session</h2>
          <button className="glass-round-button" type="button" onClick={onCreateChat} aria-label="New chat" title="New chat">
            <ChatIcon name="newChat" size={15} />
          </button>
        </header>

        <div className="effort-gauge">
          <svg viewBox="0 0 128 72" aria-hidden="true">
            <path className="effort-gauge-track" d="M12 64a52 52 0 0 1 104 0" />
            <path
              className="effort-gauge-fill"
              d="M12 64a52 52 0 0 1 104 0"
              strokeDasharray={`${filled} ${RING_LENGTH}`}
            />
          </svg>
          <div className="effort-gauge-value">
            <strong>{effort}</strong>
            <span>thinking effort</span>
          </div>
        </div>

        <div className="effort-segments" role="radiogroup" aria-label="Response effort">
          {EFFORTS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={effort === option}
              className={effort === option ? 'is-active' : ''}
              onClick={() => onEffortChange(option)}
            >
              {option}
            </button>
          ))}
        </div>

        <ul className="insights-rows">
          <li><ChatIcon name="sparkle" size={14} /><span>Model</span><b title={modelLabel}>{modelLabel || '—'}</b></li>
          <li><ChatIcon name="copy" size={14} /><span>Messages</span><b>{messageCount}</b></li>
          <li><ChatIcon name="library" size={14} /><span>Chats</span><b>{chatCount}</b></li>
        </ul>

        <button className="glass-primary-button" type="button" onClick={onOpenMemories}>
          <ChatIcon name="memory" size={15} />
          Manage memories
        </button>
      </section>

      <section className="glass-card insights-azreal">
        <header className="glass-card-header">
          <h2>Azreal</h2>
          <AzrealRobot className="insights-robot" compact />
        </header>
        <p>Talk out loud and let Azreal take actions on this PC for you.</p>
        <button className="glass-secondary-button" type="button" onClick={onOpenAzreal}>
          <ChatIcon name="microphone" size={14} />
          Open voice mode
        </button>
      </section>
    </aside>
  )
}

export default ChatInsights
