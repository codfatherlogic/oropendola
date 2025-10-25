import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import './MermaidBlock.css';

interface MermaidBlockProps {
  code: string;
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current) return;

      try {
        // Initialize mermaid with dark theme
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
          fontFamily: 'monospace',
        });

        // Generate unique ID for this diagram
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(id, code);
        setSvg(renderedSvg);
        setError(null);
      } catch (err) {
        console.error('[MermaidBlock] Rendering error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
      }
    };

    renderDiagram();
  }, [code]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
  };

  if (error) {
    return (
      <div className="mermaid-block-error">
        <div className="mermaid-error-header">
          <span>⚠️ Diagram Error</span>
        </div>
        <pre className="mermaid-error-content">{error}</pre>
      </div>
    );
  }

  return (
    <div className="mermaid-block-container">
      <div className="mermaid-block-header">
        <span className="mermaid-block-label">Diagram (Mermaid)</span>
        <button className="mermaid-copy-btn" onClick={handleCopy} title="Copy diagram code">
          📋 Copy
        </button>
      </div>
      <div
        ref={containerRef}
        className="mermaid-block-content"
        dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
      />
    </div>
  );
};

export default MermaidBlock;
