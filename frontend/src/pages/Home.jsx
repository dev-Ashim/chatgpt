import { useEffect, useState } from 'react'
import { io } from "socket.io-client";
import { useDispatch, useSelector } from 'react-redux'
import ChatComposer from '../components/ChatComposer'
import ChatConversation from '../components/ChatConversation'
import ChatSidebar from '../components/ChatSidebar'
import CreateChatDialog from '../components/CreateChatDialog'
import { chatCreated, chatDeleted, chatSelected, messageAdded,setchats} from '../store/chatSlice'
  import axios from 'axios'

const Home = ({ onLogout, userName }) => {
  const dispatch = useDispatch()
  const { chats, currentChatId, messagesByChatId } = useSelector((state) => state.chat)
  const [userInput, setUserInput] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newChatTitle, setNewChatTitle] = useState('')
  const [pendingResponses, setPendingResponses] = useState({})
const [socket, setSocket] = useState(null)
 const activeChat = chats.find(
  (chat) => (chat._id || chat.id) === currentChatId
)
 const activeMessages = currentChatId
  ? messagesByChatId[currentChatId] || []
  : []
  const accountInitials = (userName || 'Account')
    .split(/\s+/)
    .map((namePart) => namePart[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const openCreateChat = () => {
    setNewChatTitle('')
    setIsCreateDialogOpen(true)
  }

  const createChat = async(event) => {
    event.preventDefault()
    const title = newChatTitle.trim()
    if (!title) return

    const response = await axios.post('http://localhost:3000/api/chat/', { title }, {
      withCredentials: true,
    })
    console.log(response.data)
    dispatch(chatCreated({
      id: response.data.chat._id,
      title: response.data.chat.title,
      updatedAt: 'Now',
    }))
    setIsCreateDialogOpen(false)
    setUserInput('')
    setIsSidebarOpen(false)
    setIsSidebarCollapsed(false)
  }

useEffect(()=>{
  axios.get('http://localhost:3000/api/chat/', { withCredentials: true }).
  then((response) => {
    console.log(response.data)
    dispatch(setchats(response.data.chats))
  })
 const tempSocket = io("http://localhost:3000", { withCredentials: true })
 tempSocket.on("ai-response", (message) => {
  console.log(message)

  setPendingResponses((pending) => {
    const remaining = (pending[message.chat] || 0) - 1
    if (remaining > 0) return { ...pending, [message.chat]: remaining }
    const nextPending = { ...pending }
    delete nextPending[message.chat]
    return nextPending
  })

  dispatch(messageAdded({
    chatId: message.chat,
    message: {
      id: crypto.randomUUID(),
      role: "assistant",
      content: message.content,
    },
  }))
})

  setSocket(tempSocket)
  
  return () => {
  tempSocket.disconnect()
}

},[])

  const selectChat = (chatId) => {
    dispatch(chatSelected(chatId))
    setIsSidebarOpen(false)

  }

  const deleteChat = (chatId) => {
    dispatch(chatDeleted(chatId))
  }

  const openSidebar = () => {
    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false)
      return
    }
    setIsSidebarOpen(true)
  }

  const sendMessage = (event) => {
    event.preventDefault()
    const content = userInput.trim()
    if (!content) return

    let chatId = currentChatId
   if (!chatId) {
  openCreateChat()
  return
}
if (!socket) return
setPendingResponses((pending) => ({
  ...pending,
  [chatId]: (pending[chatId] || 0) + 1,
}))
    socket.emit("ai-message", {
  chat: chatId,
  content: content,
})

  dispatch(messageAdded({
  chatId,
  message: {
    id: crypto.randomUUID(),
    role: "user",
    content,
  },
}))
    // dispatch(messageAdded({
    //   chatId,
    //   message: {
    //     id: crypto.randomUUID(),
    //     role: 'assistant',
    //     content: 'That is a good place to start. I can help you explore the options and shape a plan that fits what you have in mind.',
    //   },
    // }))
    setUserInput('')
    return () => {
  tempSocket.disconnect()
}
  }

  return (
    <main className={`chat-app${isSidebarCollapsed ? ' is-sidebar-collapsed' : ''}`}>
      <ChatSidebar
        chats={chats}
        activeChatId={currentChatId}
        accountInitials={accountInitials}
        userName={userName}
        isOpen={isSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        onClose={() => setIsSidebarOpen(false)}
        onToggleCollapse={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
        onCreateChat={openCreateChat}
        onSelectChat={selectChat}
        onDeleteChat={deleteChat}
        onLogout={onLogout}
      />
      <section className={`chat-main${activeMessages.length ? ' has-messages' : ' is-empty'}`} aria-label="Chat with AI">
        <ChatConversation
          activeChat={activeChat ? {
            ...activeChat,
            messages: activeMessages,
          } : null}
          isThinking={Boolean(pendingResponses[currentChatId])}
          onOpenSidebar={openSidebar}
          onCreateChat={openCreateChat}
        />
        <ChatComposer
          userInput={userInput}
          onInputChange={setUserInput}
          onSend={sendMessage}
        />
      </section>
      {isCreateDialogOpen && (
        <CreateChatDialog
          title={newChatTitle}
          onTitleChange={setNewChatTitle}
          onClose={() => setIsCreateDialogOpen(false)}
          onSubmit={createChat}
        />
      )}
    </main>
  )
}

export default Home