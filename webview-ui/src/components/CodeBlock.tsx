import React, { memo, useEffect, useState } from 'react';
import { getHighlighter, normalizeLanguage, isLanguageLoaded } from '../utils/highlighter';
import { useCopyToClipboard } from '../utils/clipboard';
import { Tooltip } from './ui';
import type { ShikiTransformer } from 'shiki';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import './CodeBlock.css';

interface CodeBlockProps {
  code: string;
  language: string;
}

export const CodeBlock = memo(({ code, language }: CodeBlockProps) => {
  const [highlightedCode, setHighlightedCode] = useState<React.ReactNode>(null);
  const { showCopyFeedback, copyWithFeedback } = useCopyToClipboard();
  const currentLanguage = normalizeLanguage(language);

  useEffect(() => {
    let isMounted = true;

    // Fallback for plain text while loading
    const fallback = (
      <pre className="code-block-pre">
        <code className={`language-${currentLanguage || 'txt'}`}>{code}</code>
      </pre>
    );

    const highlight = async () => {
      // Show plain text if language needs to be loaded
      if (currentLanguage && !isLanguageLoaded(currentLanguage)) {
        if (isMounted) {
          setHighlightedCode(fallback);
        }
      }

      try {
        const highlighter = await getHighlighter(currentLanguage);
        if (!isMounted) return;

        const hast = await highlighter.codeToHast(code, {
          lang: currentLanguage || 'txt',
          theme: 'github-dark',
          transformers: [
            {
              pre(node) {
                node.properties.style = 'padding: 0; margin: 0;';
                return node;
              },
              code(node) {
                node.properties.class = `language-${currentLanguage}`;
                return node;
              },
            },
          ] as ShikiTransformer[],
        });

        if (!isMounted) return;

        // Convert HAST to React elements
        const reactElement = toJsxRuntime(hast, {
          Fragment,
          jsx,
          jsxs,
        });

        if (isMounted) {
          setHighlightedCode(reactElement);
        }
      } catch (error) {
        console.error('[CodeBlock] Syntax highlighting error:', error);
        if (isMounted) {
          setHighlightedCode(fallback);
        }
      }
    };

    highlight();

    return () => {
      isMounted = false;
    };
  }, [code, currentLanguage]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyWithFeedback(code, e);
  };

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <span className="code-block-language">{currentLanguage}</span>
        <Tooltip content={showCopyFeedback ? 'Copied!' : 'Copy code'} side="left">
          <button
            className="code-block-copy-btn"
            onClick={handleCopy}
          >
            {showCopyFeedback ? '✓ Copied' : '📋 Copy'}
          </button>
        </Tooltip>
      </div>
      <div className="code-block-content">
        {highlightedCode}
      </div>
    </div>
  );
});

CodeBlock.displayName = 'CodeBlock';

export default CodeBlock;
