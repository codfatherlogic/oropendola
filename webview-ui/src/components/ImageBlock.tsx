import React, { useState } from 'react';
import { ImageViewer } from './ImageViewer';
import './ImageBlock.css';

interface ImageBlockProps {
  src: string;
  alt?: string;
}

export const ImageBlock: React.FC<ImageBlockProps> = ({ src, alt }) => {
  const [showViewer, setShowViewer] = useState(false);

  return (
    <>
      <div className="image-block-container">
        <img
          src={src}
          alt={alt || 'Image'}
          className="image-block-img"
          onClick={() => setShowViewer(true)}
          title="Click to view full size"
        />
        {alt && <div className="image-block-caption">{alt}</div>}
      </div>
      {showViewer && (
        <ImageViewer
          src={src}
          alt={alt}
          onClose={() => setShowViewer(false)}
        />
      )}
    </>
  );
};

export default ImageBlock;
