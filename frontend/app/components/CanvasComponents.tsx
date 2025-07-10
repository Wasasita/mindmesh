import React, { useState, useEffect, useRef } from 'react';

// We'll use dynamic imports for Konva components
const KonvaComponents = {
  Image: null as any,
  Rect: null as any,
  Text: null as any,
  loaded: false
};

// Load Konva components dynamically on the client
const loadKonvaComponents = async () => {
  if (typeof window !== 'undefined' && !KonvaComponents.loaded) {
    try {
      console.log('🔄 Starting Konva import...');
      const konva = await import('react-konva');
      console.log('🔄 Konva imported, setting components...');
      
      KonvaComponents.Image = konva.Image;
      KonvaComponents.Rect = konva.Rect;
      KonvaComponents.Text = konva.Text;
      KonvaComponents.loaded = true;
      
      console.log('✅ Konva components loaded successfully:', {
        Image: !!KonvaComponents.Image,
        Rect: !!KonvaComponents.Rect,
        Text: !!KonvaComponents.Text,
        loaded: KonvaComponents.loaded
      });
      
      return true;
    } catch (error) {
      console.error('❌ Failed to load Konva components:', error);
      return false;
    }
  }
  return KonvaComponents.loaded;
};

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
  layerRef?: React.RefObject<any>;
}

export const CanvasImage: React.FC<CanvasImageProps> = ({ 
  node, 
  selectedNode, 
  onSelect, 
  onDragEnd, 
  theme,
  layerRef
}) => {
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [konvaReady, setKonvaReady] = useState(false);
  const imageRef = useRef<any>(null);

  // Load Konva components
  useEffect(() => {
    console.log('🔄 CanvasImage: Loading Konva components...');
    loadKonvaComponents().then((success) => {
      console.log('🔄 CanvasImage: Konva load result:', success);
      setKonvaReady(success);
    }).catch((error) => {
      console.error('❌ CanvasImage: Error loading Konva:', error);
      setKonvaReady(false);
    });
  }, []);
  useEffect(() => {
    if (!node.content) {
      console.warn('❌ No image content provided for node:', node.id);
      return;
    }

    console.log('🖼️ Loading image for node:', node.id, 'Content:', node.content.substring(0, 50));
    
    const img = new window.Image();
    
    // Don't set crossOrigin for blob URLs or data URLs
    if (!node.content.startsWith('blob:') && !node.content.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    
    img.onload = () => {
      console.log('✅ Image loaded successfully for node:', node.id, 'Size:', img.width, 'x', img.height);
      setImageElement(img);
      setImageLoaded(true);
      
      // Force layer redraw after image loads with multiple strategies
      const forceRedraw = () => {
        if (layerRef?.current) {
          console.log('🔄 Forcing layer redraw after image load');
          layerRef.current.batchDraw();
          layerRef.current.draw();
        }
        if (imageRef?.current) {
          console.log('🔄 Forcing image layer redraw');
          const layer = imageRef.current.getLayer();
          if (layer) {
            layer.batchDraw();
            layer.draw();
          }
        }
      };
      
      // Try multiple times to ensure redraw
      setTimeout(forceRedraw, 10);
      setTimeout(forceRedraw, 100);
      setTimeout(forceRedraw, 300);
    };
    
    img.onerror = (error: any) => {
      console.error('❌ Failed to load image for node:', node.id, 'Error:', error);
      console.error('❌ Image URL:', node.content);
      setImageLoaded(false);
      setImageElement(null);
    };
    
    // Set the source - no delay needed for blob URLs
    try {
      img.src = node.content;
    } catch (error) {
      console.error('❌ Error setting image src:', error);
    }
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [node.content, layerRef]);
  const isSelected = selectedNode === node.id;
  
  // VERY PROMINENT DEBUG LOG - CHECK BROWSER CONSOLE (F12)
  console.log('🚨🚨🚨 CANVASIMAGE RENDER ATTEMPT 🚨🚨🚨', {
    nodeId: node.id,
    nodeType: node.type,
    position: { x: node.x, y: node.y },
    konvaReady,
    imageLoaded,
    hasImageElement: !!imageElement
  });

  // If Konva components aren't loaded yet, don't render
  if (!konvaReady || !KonvaComponents.loaded) {
    console.log('Konva components not loaded, skipping render');
    return null;
  }

  const { Image, Rect, Text } = KonvaComponents;
  if (!imageLoaded || !imageElement) {
    // Show visible placeholder for debugging
    console.log('🔄 Showing placeholder for node:', node.id, 'imageLoaded:', imageLoaded, 'imageElement:', !!imageElement);
    
    return (
      <React.Fragment>
        <Rect
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          fill={imageLoaded === false ? "rgba(255, 50, 50, 0.9)" : "rgba(50, 50, 255, 0.9)"}
          stroke="white"
          strokeWidth={3}
          cornerRadius={4}
          draggable
          onClick={() => {
            console.log('🖱️ Placeholder clicked:', node.id);
            onSelect(node);
          }}
          onDragEnd={(e: any) => onDragEnd(node, e.target.x(), e.target.y())}
          visible={true}
          listening={true}
        />
        <Text
          x={node.x + 10}
          y={node.y + node.height / 2 - 15}
          text={imageLoaded === false ? "❌ IMAGE FAILED" : "⏳ LOADING..."}
          fontSize={14}
          fontStyle="bold"
          fill="white"
          listening={false}
        />
        <Text
          x={node.x + 10}
          y={node.y + node.height / 2 + 5}
          text={`ID: ${node.id.substring(0, 8)}`}
          fontSize={12}
          fill="white"
          listening={false}
        />
        <Text
          x={node.x + 10}
          y={node.y + node.height / 2 + 20}
          text={`Pos: (${node.x}, ${node.y})`}
          fontSize={10}
          fill="white"
          listening={false}
        />
      </React.Fragment>
    );
  }
  console.log('🎨 Rendering CanvasImage:', {
    nodeId: node.id.substring(0, 8),
    position: { x: node.x, y: node.y },
    size: { width: node.width, height: node.height },
    imageLoaded,
    imageElement: !!imageElement,
    konvaReady,
    isSelected
  });

  return (
    <Image
      ref={imageRef}
      image={imageElement}
      x={node.x}
      y={node.y}
      width={node.width}
      height={node.height}
      stroke={isSelected ? theme.accent.ring : theme.accent.primary}
      strokeWidth={isSelected ? 3 : 1}
      draggable
      onClick={() => {
        console.log('🖱️ Image clicked:', node.id);
        onSelect(node);
      }}
      onDragEnd={(e: any) => {
        const newX = e.target.x();
        const newY = e.target.y();
        console.log('🔄 Image dragged to:', { newX, newY });
        onDragEnd(node, newX, newY);
      }}
      visible={true}
      listening={true}
      perfectDrawEnabled={false}
    />
  );
};

interface CanvasTextProps {
  node: Node;
  selectedNode: string | null;
  onSelect: (node: Node) => void;
  onDragEnd: (node: Node, x: number, y: number) => void;
  theme: any;
  layerRef?: React.RefObject<any>;
}

export const CanvasText: React.FC<CanvasTextProps> = ({ 
  node, 
  selectedNode, 
  onSelect, 
  onDragEnd, 
  theme,
  layerRef
}) => {
  const [konvaReady, setKonvaReady] = useState(false);
  const isSelected = selectedNode === node.id;

  // Load Konva components
  useEffect(() => {
    loadKonvaComponents().then(() => {
      setKonvaReady(true);
    });
  }, []);

  // If Konva components aren't loaded yet, don't render
  if (!konvaReady || !KonvaComponents.loaded) {
    console.log('Konva components not loaded, skipping text render');
    return null;
  }

  const { Rect, Text } = KonvaComponents;

  return (
    <React.Fragment>
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
        onDragEnd={(e: any) => onDragEnd(node, e.target.x(), e.target.y())}
      />
      <Text
        x={node.x + 10}
        y={node.y + 10}
        width={node.width - 20}
        height={node.height - 20}
        text={node.content}
        fontSize={14}
        fill={theme.text.primary}
        listening={false}
      />
    </React.Fragment>
  );
};
