import { createSlice } from '@reduxjs/toolkit'

const STREAMING_ID = 'streaming'

const initialState = {
  chats: [],
  currentChatId: null,
  messagesByChatId: {},
}

const getChatId = (chat) => chat._id || chat.id

const moveChatToTop = (state, chatId) => {
  const index = state.chats.findIndex((chat) => getChatId(chat) === chatId)
  if (index > 0) {
    const [chat] = state.chats.splice(index, 1)
    state.chats.unshift(chat)
  }
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    chatCreated: (state, action) => {
      const chat = action.payload
      const chatId = getChatId(chat)

      state.chats.unshift(chat)
      state.currentChatId = chatId
      state.messagesByChatId[chatId] = []
    },
    chatSelected: (state, action) => {
      state.currentChatId = action.payload
    },
    chatDeleted: (state, action) => {
      const chatId = action.payload

      state.chats = state.chats.filter((chat) => getChatId(chat) !== chatId)
      delete state.messagesByChatId[chatId]

      if (state.currentChatId === chatId) {
        state.currentChatId = null
      }
    },
    setchats(state, action) {
      state.chats = action.payload
      state.currentChatId = null
      state.messagesByChatId = {}
    },
    messagesLoaded: (state, action) => {
      const { chatId, messages } = action.payload
      // Keep anything sent while the history request was in flight
      const local = state.messagesByChatId[chatId] || []
      state.messagesByChatId[chatId] = [...messages, ...local.filter((m) => !messages.some((loaded) => loaded.id === m.id))]
    },
    messageAdded: (state, action) => {
      const { chatId, message } = action.payload
      state.messagesByChatId[chatId] ||= []
      state.messagesByChatId[chatId].push(message)
      moveChatToTop(state, chatId)
    },
    responseChunkReceived: (state, action) => {
      const { chatId, text } = action.payload
      const messages = (state.messagesByChatId[chatId] ||= [])
      const last = messages[messages.length - 1]

      if (last?.id === STREAMING_ID) {
        last.content += text
      } else {
        messages.push({ id: STREAMING_ID, role: 'assistant', content: text, isStreaming: true })
      }
    },
    responseCompleted: (state, action) => {
      const { chatId, id, content } = action.payload
      const messages = (state.messagesByChatId[chatId] ||= [])
      const streamingIndex = messages.findIndex((m) => m.id === STREAMING_ID)

      // Empty content means the reply was stopped before any text arrived
      if (!content) {
        if (streamingIndex >= 0) messages.splice(streamingIndex, 1)
        return
      }

      const finalMessage = { id: id || crypto.randomUUID(), role: 'assistant', content }
      if (streamingIndex >= 0) messages[streamingIndex] = finalMessage
      else messages.push(finalMessage)
      moveChatToTop(state, chatId)
    },
    responseFailed: (state, action) => {
      const { chatId, message } = action.payload
      const messages = (state.messagesByChatId[chatId] ||= []).filter((m) => m.id !== STREAMING_ID)
      messages.push({ id: crypto.randomUUID(), role: 'assistant', content: message, isError: true })
      state.messagesByChatId[chatId] = messages
    },
    // The server saved a user message: swap the temporary client id for the real one
    userMessageSaved: (state, action) => {
      const { chatId, clientId, id } = action.payload
      const message = state.messagesByChatId[chatId]?.find((m) => m.id === clientId)
      if (message) message.id = id
    },
    // Editing a message drops it and everything after it
    messagesRewound: (state, action) => {
      const { chatId, messageId } = action.payload
      const messages = state.messagesByChatId[chatId] || []
      const index = messages.findIndex((m) => m.id === messageId)
      if (index >= 0) state.messagesByChatId[chatId] = messages.slice(0, index)
    },
    // Regenerating drops the assistant replies after the last user message
    trailingRepliesRemoved: (state, action) => {
      const chatId = action.payload
      const messages = state.messagesByChatId[chatId] || []
      let end = messages.length
      while (end > 0 && messages[end - 1].role === 'assistant') end -= 1
      state.messagesByChatId[chatId] = messages.slice(0, end)
    },
    chatTitleUpdated: (state, action) => {
      const { chatId, title } = action.payload
      const chat = state.chats.find((item) => getChatId(item) === chatId)
      if (chat) chat.title = title
    },
  },
})

export const {
  chatCreated,
  chatSelected,
  chatDeleted,
  messageAdded,
  messagesLoaded,
  responseChunkReceived,
  responseCompleted,
  responseFailed,
  setchats,
  userMessageSaved,
  messagesRewound,
  trailingRepliesRemoved,
  chatTitleUpdated,
} = chatSlice.actions
export default chatSlice.reducer
