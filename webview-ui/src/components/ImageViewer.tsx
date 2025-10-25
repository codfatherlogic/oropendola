import React, { useEffect } from 'react';
import './ImageViewer.css';

interface ImageViewerProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ src, alt, onClose }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="image-viewer-overlay" onClick={onClose}>
      <div className="image-viewer-container" onClick={(e) => e.stopPropagation()}>
        <button className="image-viewer-close" onClick={onClose} title="Close (Esc)">
          ✕
        </button>
        <img src={src} alt={alt || 'Full size image'} className="image-viewer-image" />
      </div>
    </div>
  );
};

export default ImageViewer;
