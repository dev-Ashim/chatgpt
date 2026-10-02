import { createSlice } from '@reduxjs/toolkit'

const initialChats = [
  
]

const initialState = {
  chats: initialChats,
  currentChatId: null,
  messagesByChatId: {
    'weekend-trip': [
      { id: 'trip-1', role: 'assistant', content: 'Hi there. What would you like to plan today?' },
      { id: 'trip-2', role: 'user', content: 'I want to plan a relaxed weekend trip.' },
      { id: 'trip-3', role: 'assistant', content: 'A relaxed weekend sounds lovely. Do you have a destination in mind, or should we start with a few ideas?' },
    ],
    'easy-dinners': [
      { id: 'dinner-1', role: 'assistant', content: 'I can help you find a few simple dinner ideas. What ingredients do you have?' },
    ],
    'reading-list': [
      { id: 'reading-1', role: 'assistant', content: 'What kind of books are you in the mood for?' },
    ],
  },
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    chatCreated: (state, action) => {
      const chat = action.payload
      state.chats.unshift(chat)
      state.currentChatId = chat.id
      state.messagesByChatId[chat.id] = []
    },
    chatSelected: (state, action) => {
      state.currentChatId = action.payload
    },
    chatDeleted: (state, action) => {
      const chatId = action.payload
      state.chats = state.chats.filter((chat) => chat.id !== chatId)
      delete state.messagesByChatId[chatId]

      if (state.currentChatId === chatId) {
        state.currentChatId = state.chats[0]?.id || null
      }
    },
    setchats(state, action) {
      state.chats = action.payload;
    },
    messageAdded: (state, action) => {
      const { chatId, message } = action.payload
      state.messagesByChatId[chatId] ||= []
      state.messagesByChatId[chatId].push(message)

      const chat = state.chats.find((item) => item.id === chatId)
      if (chat) chat.updatedAt = 'Now'
    },
  },
})

export const { chatCreated, chatSelected, chatDeleted, messageAdded,setchats } = chatSlice.actions
export default chatSlice.reducer