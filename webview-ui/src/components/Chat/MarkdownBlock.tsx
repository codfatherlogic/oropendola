/**
 * MarkdownBlock Component
 *
 * Renders markdown content with syntax highlighting for code blocks.
 * Uses react-markdown for parsing and the existing CodeBlock for syntax highlighting.
 */

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from '../CodeBlock'
import './MarkdownBlock.css'

interface MarkdownBlockProps {
  markdown?: string
  partial?: boolean
}

export const MarkdownBlock: React.FC<MarkdownBlockProps> = ({
  markdown = '',
  partial = false,
}) => {
  if (!markdown) return null

  return (
    <div className={`markdown-block ${partial ? 'markdown-partial' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : 'txt'
            const codeString = String(children).replace(/\n$/, '')

            // Check if this is a code block (has language class) or inline code
            const isCodeBlock = Boolean(match)

            return isCodeBlock ? (
              <CodeBlock code={codeString} language={language} />
            ) : (
              <code className="inline-code" {...props}>
                {children}
              </code>
            )
          },
          a({ node, href, children, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="markdown-link"
                {...props}
              >
                {children}
              </a>
            )
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
