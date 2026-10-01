import { useState } from 'react'
import ChatIcon from './ChatIcon'

const ChatSidebar = ({
  chats,
  activeChatId,
  accountInitials,
  userName,
  isOpen,
  isCollapsed,
  onClose,
  onToggleCollapse,
  onCreateChat,
  onSelectChat,
  onDeleteChat,
  onLogout,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const filteredChats = chats.filter((chat) => chat.title.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <>
    {isOpen && (
      <button
        className="chat-sidebar-backdrop"
        type="button"
        aria-label="Close conversations menu"
        onClick={onClose}
      />
    )}

    <aside className={`chat-sidebar${isOpen ? ' is-open' : ''}`} aria-label="Previous chats">
      <div className="sidebar-topline">
        <div className="chat-brand-selector">
          <span className="chat-brand">ChatSpace</span>
          <ChatIcon name="chevronDown" size={13} />
        </div>
        <div className="sidebar-tools">
          <button
            className="icon-button sidebar-tool"
            type="button"
            aria-label={isSearchOpen ? 'Close chat search' : 'Search chats'}
            title="Search chats"
            onClick={() => {
              setIsSearchOpen((open) => !open)
              setSearchQuery('')
            }}
          >
            <ChatIcon name="search" />
          </button>
          <button
            className="icon-button sidebar-tool sidebar-collapse"
            type="button"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={onToggleCollapse}
          >
            <ChatIcon name="sidebar" />
          </button>
        </div>
        <button
          className="icon-button sidebar-close"
          type="button"
          aria-label="Close conversations menu"
          onClick={onClose}
        >
          <ChatIcon name="close" />
        </button>
      </div>

      <button className="new-chat-button" type="button" onClick={onCreateChat}>
        <ChatIcon name="newChat" />
        <span>New chat</span>
      </button>

      <nav className="sidebar-navigation" aria-label="Main menu">
        <div className="sidebar-nav-item"><ChatIcon name="schedule" /><span>Scheduled</span></div>
        <div className="sidebar-nav-item"><ChatIcon name="library" /><span>Library</span></div>
        <div className="sidebar-nav-item"><ChatIcon name="plugins" /><span>Plugins</span></div>
        <div className="sidebar-nav-item"><ChatIcon name="more" /><span>Explore</span></div>
      </nav>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Projects</div>
        <div className="sidebar-empty">No projects</div>
      </div>

      <div className="sidebar-section recent-section">
        <div className="sidebar-section-title">Recents</div>
        {isSearchOpen && (
          <label className="chat-search">
            <ChatIcon name="search" size={14} />
            <input
              aria-label="Search conversations"
              autoFocus
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search chats"
            />
          </label>
        )}
        <nav className="chat-list" aria-label="Recent conversations">
        {filteredChats.map((chat) => (
          <div className={`chat-list-row${chat.id === activeChatId ? ' is-active' : ''}`} key={chat.id}>
            <button
              className="chat-list-item"
              type="button"
              onClick={() => onSelectChat(chat.id)}
            >
              <span className="chat-list-title">{chat.title}</span>
            </button>
            <button
              className="delete-chat-button"
              type="button"
              aria-label={`Delete chat: ${chat.title}`}
              title="Delete chat"
              onClick={() => onDeleteChat(chat.id)}
            >
              <ChatIcon name="close" size={13} />
            </button>
          </div>
        ))}
      </nav>
      </div>

      <div className="sidebar-account">
        <span className="account-avatar" aria-hidden="true">{accountInitials}</span>
        <span className="account-details">
          <span className="account-name">{userName}</span>
          <span className="account-plan">Plus</span>
        </span>
        <button className="account-logout" type="button" onClick={onLogout} aria-label="Log out" title="Log out">
          <ChatIcon name="more" />
        </button>
      </div>
    </aside>
    </>
  )
}

export default ChatSidebar