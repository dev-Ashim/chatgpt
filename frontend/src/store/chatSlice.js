import { createSlice } from '@reduxjs/toolkit'

const initialChats = [
  
]

const initialState = {
  chats: initialChats,
  currentChatId: null,
  messagesByChatId: {
    
  },
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    chatCreated: (state, action) => {
  const chat = action.payload
  const chatId = chat._id || chat.id

  state.chats.unshift(chat)
  state.currentChatId = chatId
  state.messagesByChatId[chatId] = []
},
    chatSelected: (state, action) => {
      state.currentChatId = action.payload
    },
    chatDeleted: (state, action) => {
  const chatId = action.payload

  state.chats = state.chats.filter(
    (chat) => (chat._id || chat.id) !== chatId
  )

  delete state.messagesByChatId[chatId]

  if (state.currentChatId === chatId) {
    state.currentChatId = state.chats.length
      ? state.chats[0]._id || state.chats[0].id
      : null
  }
},
    setchats(state, action) {
  state.chats = action.payload
  state.currentChatId = null
  state.messagesByChatId = {}
},
    messageAdded: (state, action) => {
      const { chatId, message } = action.payload
      state.messagesByChatId[chatId] ||= []
      state.messagesByChatId[chatId].push(message)

      const chat = state.chats.find(
  (item) => (item._id || item.id) === chatId
)
      if (chat) chat.updatedAt = 'Now'
    },
  },
})

export const { chatCreated, chatSelected, chatDeleted, messageAdded,setchats } = chatSlice.actions
export default chatSlice.reducer