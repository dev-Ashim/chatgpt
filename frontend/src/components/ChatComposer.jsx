import { useEffect, useRef, useState } from 'react'
import ChatIcon from './ChatIcon'

const MAX_FILES = 3
const MAX_FILE_BYTES = 5 * 1024 * 1024
const SUPPORTED_TYPES = [
  'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
  'application/pdf',
  'text/plain', 'text/csv', 'text/markdown', 'application/json',
]
// Some browsers leave file.type empty for these, so fall back to the extension
const TYPES_BY_EXTENSION = { txt: 'text/plain', csv: 'text/csv', md: 'text/markdown', json: 'application/json' }

const canRecord = typeof window !== 'undefined'
  && typeof window.MediaRecorder !== 'undefined'
  && Boolean(navigator.mediaDevices?.getUserMedia)
// Long recordings get cut off so the upload stays small
const MAX_RECORDING_MS = 2 * 60 * 1000

const readAsBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(file)
})

const ChatComposer = ({
  userInput,
  onInputChange,
  onSend,
  onStop,
  isBusy,
  effort,
  onEffortChange,
  attachments,
  onAttachmentsChange,
  models,
  model,
  onModelChange,
  onTranscribe,
  statusNote,
}) => {
  const fileInputRef = useRef(null)
  const recorderRef = useRef(null)
  const stopTimerRef = useRef(null)
  const [notice, setNotice] = useState('')
  // 'idle' | 'recording' | 'transcribing'
  const [voiceState, setVoiceState] = useState('idle')
  const isListening = voiceState === 'recording'
  const canSend = Boolean(userInput.trim() || attachments.length)

  useEffect(() => () => {
    clearTimeout(stopTimerRef.current)
    const recorder = recorderRef.current
    if (recorder) {
      recorder.onstop = null
      if (recorder.state !== 'inactive') recorder.stop()
      recorder.stream.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const addFiles = async (fileList) => {
    setNotice('')
    const files = Array.from(fileList || [])
    const room = MAX_FILES - attachments.length
    if (files.length > room) setNotice(`You can attach up to ${MAX_FILES} files per message.`)

    const added = []
    for (const file of files.slice(0, Math.max(room, 0))) {
      const extension = file.name.split('.').pop()?.toLowerCase()
      const mimeType = file.type || TYPES_BY_EXTENSION[extension] || ''
      if (!SUPPORTED_TYPES.includes(mimeType)) {
        setNotice(`"${file.name}" isn't supported. Use images, PDFs or text files.`)
        continue
      }
      if (file.size > MAX_FILE_BYTES) {
        setNotice(`"${file.name}" is larger than 5 MB.`)
        continue
      }
      try {
        added.push({ id: crypto.randomUUID(), name: file.name, mimeType, data: await readAsBase64(file) })
      } catch {
        setNotice(`Couldn't read "${file.name}".`)
      }
    }
    if (added.length) onAttachmentsChange([...attachments, ...added])
  }

  const stopRecording = () => {
    clearTimeout(stopTimerRef.current)
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  }

  // Records with MediaRecorder, then sends the audio to Groq Whisper via the backend
  const toggleListening = async () => {
    if (!canRecord || voiceState === 'transcribing') return
    if (isListening) {
      stopRecording()
      return
    }

    setNotice('')
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setNotice('Microphone access was blocked.')
      return
    }

    const recorder = new MediaRecorder(stream)
    const chunks = []
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data)
    }
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop())
      recorderRef.current = null
      const audio = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
      if (!audio.size) {
        setVoiceState('idle')
        return
      }
      setVoiceState('transcribing')
      try {
        const text = await onTranscribe(audio)
        if (text) onInputChange((current) => (current.trim() ? `${current.trim()} ${text}` : text))
        else setNotice("Didn't catch that. Try again.")
      } catch (error) {
        setNotice(error.message || "Couldn't transcribe that. Please try again.")
      } finally {
        setVoiceState('idle')
      }
    }

    recorderRef.current = recorder
    recorder.start()
    setVoiceState('recording')
    stopTimerRef.current = setTimeout(stopRecording, MAX_RECORDING_MS)
  }

  const submit = (event) => {
    stopRecording()
    setNotice('')
    onSend(event)
  }

  return (
    <div className="chat-composer-wrap">
      {notice && <p className="composer-notice" role="alert">{notice}</p>}
      {!notice && statusNote && <p className="composer-status" role="status">{statusNote}</p>}
      {attachments.length > 0 && (
        <ul className="composer-attachments" aria-label="Attached files">
          {attachments.map((file) => (
            <li className="attachment-chip" key={file.id}>
              {file.mimeType.startsWith('image/')
                ? <img src={`data:${file.mimeType};base64,${file.data}`} alt="" />
                : <ChatIcon name="file" size={14} />}
              <span>{file.name}</span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => onAttachmentsChange(attachments.filter((item) => item.id !== file.id))}
              >
                <ChatIcon name="close" size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="chat-composer" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="chat-message">Message the AI assistant</label>
        <button
          className="composer-add-icon composer-attach"
          type="button"
          aria-label="Attach files"
          title="Attach images, PDFs or text files"
          disabled={attachments.length >= MAX_FILES}
          onClick={() => fileInputRef.current?.click()}
        >
          <ChatIcon name="plus" />
        </button>
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          multiple
          accept={[...SUPPORTED_TYPES, '.md', '.txt', '.csv', '.json'].join(',')}
          onChange={(event) => {
            addFiles(event.target.files)
            event.target.value = ''
          }}
          tabIndex={-1}
        />
        <textarea
          id="chat-message"
          value={userInput}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              if (!isBusy) submit(event)
            }
          }}
          onPaste={(event) => {
            if (event.clipboardData.files.length) {
              event.preventDefault()
              addFiles(event.clipboardData.files)
            }
          }}
          placeholder={isListening ? 'Listening… tap the mic to finish' : voiceState === 'transcribing' ? 'Transcribing…' : 'Ask Azreal'}
          rows="1"
        />
        <select
          className="response-mode"
          aria-label="Response effort"
          title="How hard Azreal thinks before answering"
          value={effort}
          onChange={(event) => onEffortChange(event.target.value)}
        >
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>
        {models.length > 1 && (
          <select
            className="response-mode model-picker"
            aria-label="AI model"
            title="Which AI model answers"
            value={model}
            onChange={(event) => onModelChange(event.target.value)}
          >
            {models.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        )}
        <button
          className={`composer-mic${isListening ? ' is-listening' : ''}${voiceState === 'transcribing' ? ' is-transcribing' : ''}`}
          type="button"
          aria-label={isListening ? 'Stop voice input' : 'Voice input'}
          aria-pressed={isListening}
          title={!canRecord ? 'Voice input is not supported in this browser' : isListening ? 'Stop recording' : voiceState === 'transcribing' ? 'Transcribing…' : 'Voice input'}
          disabled={!canRecord || voiceState === 'transcribing'}
          onClick={toggleListening}
        >
          <ChatIcon name="microphone" />
        </button>
        {isBusy ? (
          <button className="send-button is-stop" type="button" aria-label="Stop generating" title="Stop" onClick={onStop}>
            <ChatIcon name="stop" />
          </button>
        ) : (
          <button className="send-button" type="submit" aria-label="Send message" title="Send" disabled={!canSend}>
            <ChatIcon name="send" />
          </button>
        )}
      </form>
    </div>
  )
}

export default ChatComposer
