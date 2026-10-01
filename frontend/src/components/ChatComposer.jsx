import ChatIcon from './ChatIcon'

const ChatComposer = ({ userInput, onInputChange, onSend }) => (
  <div className="chat-composer-wrap">
    <form className="chat-composer" onSubmit={onSend}>
      <label className="visually-hidden" htmlFor="chat-message">Message the AI assistant</label>
      <span className="composer-add-icon" aria-hidden="true"><ChatIcon name="plus" /></span>
      <textarea
        id="chat-message"
        value={userInput}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            onSend(event)
          }
        }}
        placeholder="Ask ChatSpace"
        rows="1"
      />
      <select className="response-mode" aria-label="Response effort" defaultValue="Medium">
        <option>Low</option>
        <option>Medium</option>
        <option>High</option>
      </select>
      <button className="composer-mic" type="button" aria-label="Voice input" title="Voice input">
        <ChatIcon name="microphone" />
      </button>
      <button className="send-button" type="submit" aria-label={userInput.trim() ? 'Send message' : 'Start voice mode'} title={userInput.trim() ? 'Send message' : 'Voice mode'}>
        {userInput.trim() ? <ChatIcon name="send" /> : <ChatIcon name="waveform" />}
      </button>
    </form>
  </div>
)

export default ChatComposer