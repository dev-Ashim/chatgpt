import { useEffect, useState } from 'react'
import axios from 'axios'
import ChatIcon from './ChatIcon'

const formatDate = (value) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

const MemoriesDialog = ({ apiUrl, onClose }) => {
  const [memories, setMemories] = useState(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    let cancelled = false
    axios.get(`${apiUrl}/api/memories`, { withCredentials: true })
      .then((response) => { if (!cancelled) setMemories(response.data.memories) })
      .catch(() => { if (!cancelled) setError('Could not load memories.') })
    return () => { cancelled = true }
  }, [apiUrl])

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const forget = async (id) => {
    setBusyId(id)
    setError('')
    try {
      await axios.delete(`${apiUrl}/api/memories/${id}`, { withCredentials: true })
      setMemories((items) => items.filter((item) => item.id !== id))
    } catch {
      setError('Could not forget that memory. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  const forgetAll = async () => {
    if (!window.confirm('Forget everything Azreal remembers about you? Your chats will stay.')) return
    setBusyId('all')
    setError('')
    try {
      await axios.delete(`${apiUrl}/api/memories`, { withCredentials: true })
      setMemories([])
    } catch {
      setError('Could not clear memories. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div
      className="create-chat-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="create-chat-dialog memories-dialog" role="dialog" aria-modal="true" aria-labelledby="memories-heading">
        <div className="memories-header">
          <h2 id="memories-heading">Memories</h2>
          <button className="icon-button" type="button" aria-label="Close memories" onClick={onClose}>
            <ChatIcon name="close" />
          </button>
        </div>
        <p>
          Azreal recalls these messages across chats. Forgetting one removes it from memory,
          but it stays in its chat.
        </p>

        {error && <p className="memories-error" role="alert">{error}</p>}

        {memories === null && !error && <p className="memories-empty">Loading…</p>}
        {memories?.length === 0 && <p className="memories-empty">Nothing remembered yet.</p>}

        {memories?.length > 0 && (
          <ul className="memories-list">
            {memories.map((memory) => (
              <li key={memory.id}>
                <div className="memory-meta">
                  <span>{memory.role === 'user' ? 'You' : 'Azreal'} · {memory.chatTitle}</span>
                  <span>{formatDate(memory.createdAt)}</span>
                </div>
                <p>{memory.content}</p>
                <button type="button" disabled={busyId !== null} onClick={() => forget(memory.id)}>
                  {busyId === memory.id ? 'Forgetting…' : 'Forget'}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="create-chat-actions">
          {memories?.length > 0 && (
            <button type="button" className="memories-forget-all" disabled={busyId !== null} onClick={forgetAll}>
              {busyId === 'all' ? 'Forgetting…' : 'Forget all'}
            </button>
          )}
          <button className="create-chat-submit" type="button" onClick={onClose}>Done</button>
        </div>
      </section>
    </div>
  )
}

export default MemoriesDialog
