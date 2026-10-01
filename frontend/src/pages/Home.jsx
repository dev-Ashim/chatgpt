import { useState } from 'react'
import ChatComposer from '../components/ChatComposer'
import ChatConversation from '../components/ChatConversation'
import ChatSidebar from '../components/ChatSidebar'

const initialChats = [
  {
    id: 'weekend-trip',
    title: 'Planning a weekend trip',
    updatedAt: 'Today',
    messages: [
      { id: 'trip-1', role: 'assistant', content: 'Hi there. What would you like to plan today?' },
      { id: 'trip-2', role: 'user', content: 'I want to plan a relaxed weekend trip.' },
      { id: 'trip-3', role: 'assistant', content: 'A relaxed weekend sounds lovely. Do you have a destination in mind, or should we start with a few ideas?' },
    ],
  },
  {
    id: 'easy-dinners',
    title: 'Easy weeknight dinners',
    updatedAt: 'Yesterday',
    messages: [
      { id: 'dinner-1', role: 'assistant', content: 'I can help you find a few simple dinner ideas. What ingredients do you have?' },
    ],
  },
  {
    id: 'reading-list',
    title: 'Build a reading list',
    updatedAt: 'Mon',
    messages: [
      { id: 'reading-1', role: 'assistant', content: 'What kind of books are you in the mood for?' },
    ],
  },
  ...[
    'Bro Conversation',
    'AI Interview Preparation',
    'Internship Assessment Advice',
    'Interview Preparation Advice',
    'Internship Application Advice',
    'Location Update',
    'Internship Message Draft',
    'Email Forensics Summary',
    'Internship Strategy Advice',
    'Internship Outreach Message',
    'Recruiter Message Draft',
    'Internship Suitability Review',
    'Job Eligibility Check',
  ].map((title, index) => ({
    id: `recent-${index}`,
    title,
    updatedAt: '',
    messages: [],
  })),
]

const demoReply = 'That is a good place to start. I can help you explore the options and shape a plan that fits what you have in mind.'

const Home = ({ onLogout, userName }) => {
  const [chats, setChats] = useState(initialChats)
  const [activeChatId, setActiveChatId] = useState('')
  const [userInput, setUserInput] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const activeChat = chats.find((chat) => chat.id === activeChatId)
  const accountInitials = userName
    .split(/\s+/)
    .map((namePart) => namePart[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const createChat = () => {
    const newChat = {
      id: crypto.randomUUID(),
      title: 'New conversation',
      updatedAt: 'Now',
      messages: [],
    }

    setChats((currentChats) => [newChat, ...currentChats])
    setActiveChatId(newChat.id)
    setUserInput('')
    setIsSidebarOpen(false)
    setIsSidebarCollapsed(false)
  }

  const selectChat = (chatId) => {
    setActiveChatId(chatId)
    setIsSidebarOpen(false)
  }

  const deleteChat = (chatId) => {
    const remainingChats = chats.filter((chat) => chat.id !== chatId)
    setChats(remainingChats)

    if (activeChatId === chatId) {
      setActiveChatId(remainingChats[0]?.id || '')
    }
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

    const chatId = activeChatId || crypto.randomUUID()
    const currentChat = chats.find((chat) => chat.id === chatId)
    const userMessage = { id: crypto.randomUUID(), role: 'user', content }
    const assistantMessage = { id: crypto.randomUUID(), role: 'assistant', content: demoReply }

    if (!currentChat) {
      setChats((currentChats) => [{
        id: chatId,
        title: content.slice(0, 36),
        updatedAt: 'Now',
        messages: [userMessage, assistantMessage],
      }, ...currentChats])
      setActiveChatId(chatId)
    } else {
      setChats((currentChats) => currentChats.map((chat) => chat.id === chatId
        ? {
          ...chat,
          title: chat.messages.length === 0 ? content.slice(0, 36) : chat.title,
          updatedAt: 'Now',
          messages: [...chat.messages, userMessage, assistantMessage],
        }
        : chat))
    }

    setUserInput('')
  }

  return (
    <main className={`chat-app${isSidebarCollapsed ? ' is-sidebar-collapsed' : ''}`}>
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        accountInitials={accountInitials}
        userName={userName}
        isOpen={isSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        onClose={() => setIsSidebarOpen(false)}
        onToggleCollapse={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
        onCreateChat={createChat}
        onSelectChat={selectChat}
        onDeleteChat={deleteChat}
        onLogout={onLogout}
      />
      <section className={`chat-main${activeChat?.messages.length ? ' has-messages' : ' is-empty'}`} aria-label="Chat with AI">
        <ChatConversation
          activeChat={activeChat}
          onOpenSidebar={openSidebar}
          onCreateChat={createChat}
          onSuggestion={setUserInput}
        />
        <ChatComposer
          userInput={userInput}
          onInputChange={setUserInput}
          onSend={sendMessage}
        />
      </section>
    </main>
  )
}

export default Home