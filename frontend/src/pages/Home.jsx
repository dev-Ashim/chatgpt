import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from "socket.io-client";
import { useDispatch, useSelector } from 'react-redux'
import ChatComposer from '../components/ChatComposer'
import ChatConversation from '../components/ChatConversation'
import { MODES } from '../components/modes'
import ChatSidebar from '../components/ChatSidebar'
import MemoriesDialog from '../components/MemoriesDialog'
import ChatInsights from '../components/ChatInsights'
import {
  chatCreated,
  chatDeleted,
  chatSelected,
  chatTitleUpdated,
  messageAdded,
  messagesLoaded,
  messagesRewound,
  responseChunkReceived,
  responseCompleted,
  responseFailed,
  setchats,
  trailingRepliesRemoved,
  userMessageSaved,
} from '../store/chatSlice'
import axios from 'axios'

const API_URL = 'http://localhost:3000'
const MODEL_STORAGE_KEY = 'chatspace-model'
const MODE_STORAGE_KEY = 'chatspace-mode'

const readSavedMode = () => {
  try {
    const saved = localStorage.getItem(MODE_STORAGE_KEY)
    return MODES.includes(saved) ? saved : 'Chat'
  } catch {
    return 'Chat'
  }
}

const readSavedModel = () => {
  try {
    return localStorage.getItem(MODEL_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

const Home = ({ onLogout, userName }) => {
  const dispatch = useDispatch()
  const { chats, currentChatId, messagesByChatId } = useSelector((state) => state.chat)
  const [userInput, setUserInput] = useState('')
  const [attachments, setAttachments] = useState([])
  const [effort, setEffort] = useState('Medium')
  const [models, setModels] = useState([])
  const [model, setModel] = useState(readSavedModel)
  const [mode, setMode] = useState(readSavedMode)
  // Shown under the composer when a different model had to answer
  const [modelNote, setModelNote] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMemoriesOpen, setIsMemoriesOpen] = useState(false)
  const [isCreatingChat, setIsCreatingChat] = useState(false)
  // chatId -> true while a reply is being generated in that chat
  const [pendingChats, setPendingChats] = useState({})
  const socketRef = useRef(null)
  const [loadingChatId, setLoadingChatId] = useState(null)

  const activeChat = chats.find((chat) => (chat._id || chat.id) === currentChatId)
  const activeMessages = currentChatId ? messagesByChatId[currentChatId] || [] : []
  const isBusy = isCreatingChat || Boolean(pendingChats[currentChatId])
  const accountInitials = (userName || 'Account')
    .split(/\s+/)
    .map((namePart) => namePart[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const setPending = useCallback((chatId, isPending) => {
    setPendingChats((pending) => {
      if (isPending) return { ...pending, [chatId]: true }
      const next = { ...pending }
      delete next[chatId]
      return next
    })
  }, [])

  useEffect(() => {
    axios.get(`${API_URL}/api/chat/`, { withCredentials: true })
      .then((response) => dispatch(setchats(response.data.chats)))
      .catch((error) => console.error('Failed to load chats', error))

    axios.get(`${API_URL}/api/ai/models`, { withCredentials: true })
      .then(({ data }) => {
        setModels(data.models)
        // Keep the saved choice only if the server still offers that model
        setModel((saved) => (data.models.some((m) => m.id === saved) ? saved : data.defaultModel))
      })
      .catch((error) => console.error('Failed to load models', error))

    const socket = io(API_URL, { withCredentials: true })

    socket.on("user-message-saved", ({ chat, clientId, id }) => {
      dispatch(userMessageSaved({ chatId: chat, clientId, id }))
    })

    socket.on("ai-chunk", ({ chat, text }) => {
      dispatch(responseChunkReceived({ chatId: chat, text }))
    })

    socket.on("ai-response", (message) => {
      setPending(message.chat, false)
      setModelNote(message.fallback && message.model
        ? `Your chosen model was unavailable, so ${message.model.label} answered.`
        : '')
      dispatch(responseCompleted({ chatId: message.chat, id: message.id, content: message.content }))
    })

    socket.on("ai-error", ({ chat, message }) => {
      setPending(chat, false)
      dispatch(responseFailed({ chatId: chat, message }))
    })

    socket.on("chat-title", ({ chat, title }) => {
      dispatch(chatTitleUpdated({ chatId: chat, title }))
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [dispatch, setPending])

  const changeMode = (nextMode) => {
    setMode(nextMode)
    try {
      localStorage.setItem(MODE_STORAGE_KEY, nextMode)
    } catch {
      // Storage unavailable: the mode just won't be remembered
    }
  }

  const changeModel = (modelId) => {
    setModel(modelId)
    setModelNote('')
    try {
      localStorage.setItem(MODEL_STORAGE_KEY, modelId)
    } catch {
      // Storage unavailable: the choice just won't be remembered
    }
  }

  // Sends recorded audio to the backend (Groq Whisper) and returns the text
  const transcribeAudio = async (audio) => {
    try {
      const { data } = await axios.post(`${API_URL}/api/ai/transcribe`, audio, {
        withCredentials: true,
        headers: { 'Content-Type': audio.type.split(';')[0] || 'audio/webm' },
      })
      return data.text
    } catch (error) {
      throw new Error(error.response?.data?.message || "Couldn't transcribe that. Please try again.", { cause: error })
    }
  }

  const loadMessages = async (chatId) => {
    setLoadingChatId(chatId)
    try {
      const response = await axios.get(`${API_URL}/api/chat/${chatId}/messages`, { withCredentials: true })
      dispatch(messagesLoaded({ chatId, messages: response.data.messages }))
    } catch (error) {
      console.error('Failed to load messages', error)
    } finally {
      setLoadingChatId((current) => (current === chatId ? null : current))
    }
  }

  // A new chat is created on the server when its first message is sent
  const startNewChat = () => {
    changeMode('Chat')
    dispatch(chatSelected(null))
    setUserInput('')
    setAttachments([])
    setIsSidebarOpen(false)
  }

  const selectChat = (chatId) => {
    changeMode('Chat')
    dispatch(chatSelected(chatId))
    setIsSidebarOpen(false)
    if (!messagesByChatId[chatId]) loadMessages(chatId)
  }

  const deleteChat = async (chatId) => {
    try {
      await axios.delete(`${API_URL}/api/chat/${chatId}`, { withCredentials: true })
      dispatch(chatDeleted(chatId))
    } catch (error) {
      console.error('Failed to delete chat', error)
      window.alert('Could not delete this chat. Please try again.')
    }
  }

  const openSidebar = () => {
    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false)
      return
    }
    setIsSidebarOpen(true)
  }

  const sendMessage = async (event) => {
    event.preventDefault()
    const content = userInput.trim()
    const socket = socketRef.current
    if ((!content && !attachments.length) || !socket || isBusy) return

    let chatId = currentChatId
    if (!chatId) {
      setIsCreatingChat(true)
      try {
        const response = await axios.post(`${API_URL}/api/chat/`, {}, { withCredentials: true })
        chatId = response.data.chat._id
        dispatch(chatCreated({ id: chatId, title: response.data.chat.title }))
      } catch (error) {
        console.error('Failed to create chat', error)
        window.alert('Could not start a new chat. Please try again.')
        return
      } finally {
        setIsCreatingChat(false)
      }
    }

    const clientId = crypto.randomUUID()
    setPending(chatId, true)
    dispatch(messageAdded({
      chatId,
      message: {
        id: clientId,
        role: "user",
        content,
        attachments: attachments.map(({ name, mimeType }) => ({ name, mimeType })),
      },
    }))
    socket.emit("ai-message", {
      chat: chatId,
      content,
      effort,
      model,
      clientId,
      attachments: attachments.map(({ name, mimeType, data }) => ({ name, mimeType, data })),
    })
    setUserInput('')
    setAttachments([])
  }

  const stopResponse = () => {
    if (currentChatId) socketRef.current?.emit("ai-stop", { chat: currentChatId })
  }

  const regenerateResponse = () => {
    const socket = socketRef.current
    if (!socket || !currentChatId || isBusy) return
    dispatch(trailingRepliesRemoved(currentChatId))
    setPending(currentChatId, true)
    socket.emit("ai-regenerate", { chat: currentChatId, effort, model })
  }

  const editMessage = (messageId, content) => {
    const socket = socketRef.current
    if (!socket || !currentChatId || isBusy) return
    const original = activeMessages.find((message) => message.id === messageId)
    const clientId = crypto.randomUUID()

    dispatch(messagesRewound({ chatId: currentChatId, messageId }))
    dispatch(messageAdded({
      chatId: currentChatId,
      message: { id: clientId, role: 'user', content, attachments: original?.attachments || [] },
    }))
    setPending(currentChatId, true)
    socket.emit("ai-edit", { chat: currentChatId, messageId, content, effort, model, clientId })
  }

  return (
    <main className={`chat-app${isSidebarCollapsed ? ' is-sidebar-collapsed' : ''}`}>
      <div className="ambient" aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => <span className="ember" key={index} />)}
      </div>
      <ChatSidebar
        chats={chats}
        activeChatId={currentChatId}
        accountInitials={accountInitials}
        userName={userName}
        isOpen={isSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        onClose={() => setIsSidebarOpen(false)}
        onToggleCollapse={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
        onCreateChat={startNewChat}
        onSelectChat={selectChat}
        onDeleteChat={deleteChat}
        onOpenMemories={() => {
          setIsSidebarOpen(false)
          setIsMemoriesOpen(true)
        }}
        onLogout={onLogout}
      />
      <section
        className={`chat-main${mode === 'Azreal' ? ' is-azreal' : activeMessages.length ? ' has-messages' : ' is-empty'}`}
        aria-label={mode === 'Azreal' ? 'Azreal mode' : 'Chat with AI'}
      >
        <ChatConversation
          mode={mode}
          onModeChange={changeMode}
          userName={userName}
          onTranscribe={transcribeAudio}
          activeChat={activeChat ? { ...activeChat, messages: activeMessages } : null}
          isThinking={Boolean(pendingChats[currentChatId]) && activeMessages.at(-1)?.id !== 'streaming'}
          isLoading={loadingChatId === currentChatId && !activeMessages.length}
          isBusy={isBusy}
          onOpenSidebar={openSidebar}
          onCreateChat={startNewChat}
          onRegenerate={regenerateResponse}
          onEditMessage={editMessage}
          onSuggestion={(prompt) => {
            setUserInput(prompt)
            requestAnimationFrame(() => document.getElementById('chat-message')?.focus())
          }}
          showSuggestions={!userInput.trim() && !attachments.length}
        />
        {mode === 'Chat' && <ChatComposer
          userInput={userInput}
          onInputChange={setUserInput}
          onSend={sendMessage}
          onStop={stopResponse}
          isBusy={isBusy}
          effort={effort}
          onEffortChange={setEffort}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          models={models}
          model={model}
          onModelChange={changeModel}
          onTranscribe={transcribeAudio}
          statusNote={modelNote}
        />}
      </section>
      {mode === 'Chat' && (
        <ChatInsights
          effort={effort}
          onEffortChange={setEffort}
          modelLabel={models.find((option) => option.id === model)?.label}
          messageCount={activeMessages.length}
          chatCount={chats.length}
          onOpenMemories={() => setIsMemoriesOpen(true)}
          onCreateChat={startNewChat}
          onOpenAzreal={() => changeMode('Azreal')}
        />
      )}
      {isMemoriesOpen && (
        <MemoriesDialog apiUrl={API_URL} onClose={() => setIsMemoriesOpen(false)} />
      )}
    </main>
  )
}

export default Home
