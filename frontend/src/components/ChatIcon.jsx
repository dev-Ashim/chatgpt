const iconShapes = {
  chevronDown: <path d="m6 9 6 6 6-6" />,
  sparkle: <><path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z" /><path d="M19 15.5c.2 1.4.9 2.1 2.3 2.3-1.4.2-2.1.9-2.3 2.3-.2-1.4-.9-2.1-2.3-2.3 1.4-.2 2.1-.9 2.3-2.3z" /></>,
  code: <><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" /></>,
  bolt: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
  sidebar: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></>,
  newChat: <><path d="M12 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" /><path d="m15 5 4 4M10 14l8.8-8.8a1.4 1.4 0 0 1 2 2L12 16l-4 1z" /></>,
  schedule: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  library: <><path d="M4 5h3v14H4zM10 5h4v14h-4zM17 5h3v14h-3z" /></>,
  plugins: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="2.5" /><path d="M12 3.5v2M20.5 12h-2M12 20.5v-2M3.5 12h2" /></>,
  more: <><circle cx="5" cy="12" r=".8" /><circle cx="12" cy="12" r=".8" /><circle cx="19" cy="12" r=".8" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  microphone: <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></>,
  waveform: <><path d="M8 10v4M11 7v10M14 5v14M17 9v6" /></>,
  send: <><path d="M12 19V5M6 11l6-6 6 6" /></>,
  stop: <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" />,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h8" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  edit: <><path d="M4 20h4L19 9a2 2 0 0 0-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>,
  memory: <><path d="M12 4a4 4 0 0 0-4 4 3.5 3.5 0 0 0-2 6.3A3.5 3.5 0 0 0 9.5 20H12z" /><path d="M12 4a4 4 0 0 1 4 4 3.5 3.5 0 0 1 2 6.3 3.5 3.5 0 0 1-3.5 5.7H12z" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14-5L4 8" /><path d="M4 4v4h4M4 13a8 8 0 0 0 14 5l2-2" /><path d="M20 20v-4h-4" /></>,
}

const ChatIcon = ({ name, size = 16 }) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {iconShapes[name]}
  </svg>
)

export default ChatIcon