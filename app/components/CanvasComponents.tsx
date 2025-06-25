import React, { useState, useEffect } from 'react';

// Lazy load Konva components to avoid SSR issues
const Image = React.lazy(() => import('react-konva').then(mod => ({ default: mod.Image })));
const Rect = React.lazy(() => import('react-konva').then(mod => ({ default: mod.Rect })));
const Text = React.lazy(() => import('react-konva').then(mod => ({ default: mod.Text })));

export interface Node {
  id: string;
  type: "text" | "image";
  x: number;
  y: number;
  content: string;
  width: number;
  height: number;
}

interface CanvasImageProps {
  node: Node;
  selectedNode: string | null;
  onSelect: (node: Node) => void;
  onDragEnd: (node: Node, x: number, y: number) => void;
  theme: any;
}

export const CanvasImage: React.FC<CanvasImageProps> = ({ 
  node, 
  selectedNode, 
  onSelect, 
  onDragEnd, 
  theme 
}) => {
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);
  useEffect(() => {
    if (!isClient) return;
    
    const img = new window.Image();
    // Don't set crossOrigin for blob URLs or data URLs
    if (!node.content.startsWith('blob:') && !node.content.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    
    img.onload = () => {
      console.log('Image loaded successfully:', node.content);
      setImageElement(img);
      setImageLoaded(true);
    };
    
    img.onerror = (error: any) => {
      console.error('Failed to load image:', node.content, error);
      setImageLoaded(false);
    };
    
    // Add a small delay to ensure the blob URL is ready
    setTimeout(() => {
      img.src = node.content;
    }, 10);
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [node.content, isClient]);

  // Don't render anything on server side
  if (!isClient) {
    return null;
  }

  const isSelected = selectedNode === node.id;  if (!imageLoaded || !imageElement) {
    // Show visible placeholder for debugging
    return (
      <React.Suspense fallback={null}>
        <Rect
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          fill={imageLoaded === false ? "rgba(255, 100, 100, 0.8)" : "rgba(100, 100, 255, 0.8)"}
          stroke={isSelected ? theme.accent.ring : theme.accent.primary}
          strokeWidth={isSelected ? 3 : 2}
          cornerRadius={4}
          draggable
          onClick={() => onSelect(node)}
          onDragEnd={(e) => onDragEnd(node, e.target.x(), e.target.y())}
        />
        <Text
          x={node.x + 10}
          y={node.y + node.height / 2 - 10}
          text={imageLoaded === false ? "❌ Image Error" : "⏳ Loading..."}
          fontSize={12}
          fill="white"
          listening={false}
        />
        <Text
          x={node.x + 10}
          y={node.y + node.height / 2 + 5}
          text={`ID: ${node.id.substring(0, 8)}`}
          fontSize={10}
          fill="white"
          listening={false}
        />
      </React.Suspense>
    );
  }
  return (
    <React.Suspense fallback={null}>
      <Image
        image={imageElement}
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        stroke={isSelected ? theme.accent.ring : theme.accent.primary}
        strokeWidth={isSelected ? 3 : 2}
        draggable
        onClick={() => onSelect(node)}
        onDragEnd={(e) => onDragEnd(node, e.target.x(), e.target.y())}
      />
    </React.Suspense>
  );
};

interface CanvasTextProps {
  node: Node;
  selectedNode: string | null;
  onSelect: (node: Node) => void;
  onDragEnd: (node: Node, x: number, y: number) => void;
  theme: any;
}

export const CanvasText: React.FC<CanvasTextProps> = ({ 
  node, 
  selectedNode, 
  onSelect, 
  onDragEnd, 
  theme 
}) => {
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render anything on server side
  if (!isClient) {
    return null;
  }

  const isSelected = selectedNode === node.id;

  return (
    <React.Suspense fallback={null}>
      <Rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        fill={theme.accent.primary}
        stroke={isSelected ? theme.accent.ring : theme.accent.secondary}
        strokeWidth={2}
        cornerRadius={8}
        draggable
        onClick={() => onSelect(node)}
        onDragEnd={(e) => onDragEnd(node, e.target.x(), e.target.y())}
      />      <Text
        x={node.x + 10}
        y={node.y + 10}
        width={node.width - 20}
        height={node.height - 20}
        text={node.content}
        fontSize={14}
        fill={theme.text.primary}
        listening={false}
      />
    </React.Suspense>
  );
};
