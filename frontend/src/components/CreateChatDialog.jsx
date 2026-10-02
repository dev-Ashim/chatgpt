const CreateChatDialog = ({ title, onTitleChange, onClose, onSubmit }) => (
  <div
    className="create-chat-overlay"
    role="presentation"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}
  >
    <section
      className="create-chat-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-chat-heading"
    >
      <h2 id="create-chat-heading">Start a new chat</h2>
      <p>Give this conversation a name.</p>
      <form onSubmit={onSubmit}>
        <label htmlFor="new-chat-title">Chat name</label>
        <input
          id="new-chat-title"
          autoFocus
          maxLength={60}
          required
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="For example, Weekend trip"
        />
        <div className="create-chat-actions">
          <button className="create-chat-cancel" type="button" onClick={onClose}>Cancel</button>
          <button className="create-chat-submit" type="submit" disabled={!title.trim()}>Create chat</button>
        </div>
      </form>
    </section>
  </div>
)

export default CreateChatDialog