import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";

// Simple interface for nodes
interface SimpleNode {
  id: string;
  type: "text" | "image";
  x: number;
  y: number;
  content: string;
  width: number;
  height: number;
}

// Simple Image component to handle image loading outside of map
const SimpleImageNode: React.FC<{ node: SimpleNode; konvaComponents: any }> = ({ node, konvaComponents }) => {
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const { Image, Rect } = konvaComponents;

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      console.log('✅ Image loaded for rendering');
      setImageElement(img);
    };
    img.onerror = () => {
      console.log('❌ Image failed to load');
    };
    img.src = node.content;
  }, [node.content]);

  if (imageElement) {
    return (
      <Image
        image={imageElement}
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
      />
    );
  } else {
    return (
      <Rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        fill="orange"
        stroke="white"
        strokeWidth={2}
      />
    );
  }
};

// Minimal Konva components loading
let konvaComponents: any = null;

const loadKonva = async () => {
  if (typeof window !== 'undefined' && !konvaComponents) {
    try {
      konvaComponents = await import('react-konva');
      console.log('✅ Konva loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load Konva:', error);
    }
  }
};

export default function SimpleCanvasTest() {
  const { theme } = useTheme();
  const [nodes, setNodes] = useState<SimpleNode[]>([]);
  const [konvaReady, setKonvaReady] = useState(false);
  const layerRef = useRef<any>(null);

  useEffect(() => {
    loadKonva().then(() => {
      setKonvaReady(true);
    });
  }, []);

  const addTestNode = () => {
    console.log('🧪 Adding test node');
    const testNode: SimpleNode = {
      id: Date.now().toString(),
      type: "text",
      x: 50,
      y: 50,
      content: "TEST NODE - Should be visible!",
      width: 200,
      height: 80,
    };
    
    setNodes(prev => {
      const updated = [...prev, testNode];
      console.log('🧪 Updated nodes:', updated);
      return updated;
    });
  };

  const addTestImage = () => {
    console.log('🧪 Adding test image');
    // Create a simple data URL for a red square
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 100, 100);
    }
    const dataUrl = canvas.toDataURL();
    
    const testNode: SimpleNode = {
      id: Date.now().toString(),
      type: "image",
      x: 200,
      y: 50,
      content: dataUrl,
      width: 100,
      height: 100,
    };
    
    setNodes(prev => {
      const updated = [...prev, testNode];
      console.log('🧪 Updated nodes with image:', updated);
      return updated;
    });
  };

  if (!konvaReady || !konvaComponents) {
    return (
      <div className="p-8 text-white">
        <h1>Loading Canvas...</h1>
        <button onClick={addTestNode} className="px-4 py-2 bg-blue-500 text-white rounded mr-2">
          Add Test Node (No Konva)
        </button>
      </div>
    );
  }

  const { Stage, Layer, Rect, Text, Image } = konvaComponents;

  return (
    <div className="h-screen flex flex-col text-white">
      <header className="p-4 border-b border-gray-700">
        <h1>Simple Canvas Test</h1>
        <div className="flex gap-2 mt-2">
          <button onClick={addTestNode} className="px-4 py-2 bg-green-500 text-white rounded text-sm">
            🧪 Add Test Text
          </button>
          <button onClick={addTestImage} className="px-4 py-2 bg-red-500 text-white rounded text-sm">
            🧪 Add Test Image
          </button>
          <div className="text-sm text-gray-400">
            Nodes: {nodes.length}
          </div>
        </div>
      </header>      <div className="flex-1 relative bg-gray-800 p-4">
        <div style={{ 
          width: '800px', 
          height: '600px', 
          border: '3px solid red', 
          backgroundColor: '#333',
          position: 'relative'
        }}>          <Stage width={800} height={600}>
            <Layer ref={layerRef}>
              {/* Always visible test rectangle */}
              <Rect
                x={10}
                y={10}
                width={100}
                height={50}
                fill="lime"
                stroke="black"
                strokeWidth={2}
              />
              <Text
                x={15}
                y={25}
                text="STATIC TEST"
                fontSize={12}
                fill="black"              />
              
              {/* Dynamic nodes */}
            {nodes.map((node) => {
              console.log('🎨 Rendering node:', node.id, node.type, `(${node.x}, ${node.y})`);
              
              if (node.type === "text") {
                return (
                  <React.Fragment key={node.id}>
                    <Rect
                      x={node.x}
                      y={node.y}
                      width={node.width}
                      height={node.height}
                      fill="blue"
                      stroke="white"
                      strokeWidth={2}
                      cornerRadius={8}
                    />
                    <Text
                      x={node.x + 10}
                      y={node.y + 10}
                      text={node.content}
                      fontSize={14}
                      fill="white"
                    />
                  </React.Fragment>
                );
              }
              
              if (node.type === "image") {
                return (
                  <SimpleImageNode
                    key={node.id}
                    node={node}
                    konvaComponents={konvaComponents}
                  />
                );
              }
              
              return null;            })}
          </Layer>
        </Stage>
        </div>
      </div>
    </div>
  );
}
