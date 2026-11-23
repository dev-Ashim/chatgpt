import { useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

const CodeBlock = ({ children }) => {
  const preRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const languageClass = children?.props?.className || ''
  const language = languageClass.match(/language-(\w+)/)?.[1]

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(preRef.current?.innerText || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span>{language || 'code'}</span>
        <button type="button" onClick={copyCode} aria-label="Copy code">
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre ref={preRef}>{children}</pre>
    </div>
  )
}

const markdownComponents = {
  pre: CodeBlock,
  // eslint-disable-next-line no-unused-vars
  a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
}

const MarkdownMessage = ({ content }) => (
  <div className="markdown-body">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeHighlight, { ignoreMissing: true, detect: true }]]}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  </div>
)

export default MarkdownMessage
