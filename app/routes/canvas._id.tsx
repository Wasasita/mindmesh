import React, { useEffect, useState, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import type { Node } from "../components/CanvasComponents";
import { CanvasImage, CanvasText } from "../components/CanvasComponents";
import { groupByThreshold, classifyArtStyle, classifyMoodTheme } from "../services/api";

const Stage = lazy(() => import("react-konva").then(mod => ({ default: mod.Stage })));
const Layer = lazy(() => import("react-konva").then(mod => ({ default: mod.Layer })));
const Rect = lazy(() => import("react-konva").then(mod => ({ default: mod.Rect })));
const Text = lazy(() => import("react-konva").then(mod => ({ default: mod.Text })));

// Enhanced Node interface for AI grouping
interface GroupedNode extends Node {
  groupId?: string;
  groupLabel?: string;
  groupType?: 'art-style' | 'mood-theme' | 'semantic';
  aiMetadata?: {
    embedding?: number[];
    style?: string;
    mood?: string;
    semantics?: string[];
  };
}

// Group definition for AI clustering
interface NodeGroup {
  id: string;
  label: string;
  type: 'art-style' | 'mood-theme' | 'semantic';
  nodes: string[]; // node IDs
  position: { x: number; y: number };
  color: string;
}

export default function CanvasPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme, setThemeForCanvas, getThemeForCanvas, setTheme, colorThemes } = useTheme();

  const [nodes, setNodes] = useState<GroupedNode[]>([]);
  const [groups, setGroups] = useState<NodeGroup[]>([]);
  const [isGroupingMode, setIsGroupingMode] = useState(false);
  const [groupingType, setGroupingType] = useState<'art-style' | 'mood-theme' | 'semantic'>('mood-theme');
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [groupCount, setGroupCount] = useState(3);
  const [canvasName, setCanvasName] = useState("Untitled");

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [isClient, setIsClient] = useState(false);

  const [imageSliderOffset, setImageSliderOffset] = useState(0);
  const [textSliderOffset, setTextSliderOffset] = useState(0);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempCanvasName, setTempCanvasName] = useState("");  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);  const [selectedNodeHeight, setSelectedNodeHeight] = useState(200);
  const [isResizingSelectedNode, setIsResizingSelectedNode] = useState(false);
  const [draggedNode, setDraggedNode] = useState<Node | null>(null);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);  // Dynamic canvas size calculation
  useEffect(() => {
    const updateCanvasSize = () => {
      if (typeof window !== 'undefined') {
        // Small delay to ensure DOM elements are rendered
        setTimeout(() => {
          // Get actual heights of header and filter bar
          const header = document.querySelector('header');
          const filterBar = document.querySelector('[data-filter-bar]');
          
          const headerHeight = header?.getBoundingClientRect().height || 64;
          const filterBarHeight = filterBar?.getBoundingClientRect().height || 56;
          
          const totalOffset = headerHeight + filterBarHeight;
          
          setCanvasSize({
            width: window.innerWidth - leftPanelWidth,
            height: window.innerHeight - totalOffset,
          });
        }, 100);
      }
    };

    // Update on mount and when dependencies change
    updateCanvasSize();
    
    // Update on window resize
    const handleResize = () => updateCanvasSize();
    window.addEventListener('resize', handleResize);
    
    // Use ResizeObserver to watch for header/filter bar height changes
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });
    
    const header = document.querySelector('header');
    const filterBar = document.querySelector('[data-filter-bar]');
    
    if (header) resizeObserver.observe(header);
    if (filterBar) resizeObserver.observe(filterBar);
      return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [leftPanelWidth, isEditingName]); // Added isEditingName to dependencies

  // Load nodes from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`canvas-${id}`);
        if (saved) {
          setNodes(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Failed to load from localStorage:', error);
      }
    }
  }, [id]);
  // Save nodes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && nodes.length > 0) {
      try {
        localStorage.setItem(`canvas-${id}`, JSON.stringify(nodes));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }
    }
  }, [nodes, id]);

  // Load canvas name from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem(`canvas-name-${id}`);
      if (savedName) {
        setCanvasName(savedName);
      }
    }
  }, [id]);  // Save canvas name to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && canvasName !== "Untitled") {
      localStorage.setItem(`canvas-name-${id}`, canvasName);
    }
  }, [canvasName, id]);  // Load theme from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      const canvasTheme = getThemeForCanvas(id);
      setTheme(canvasTheme);
    }
  }, [id, getThemeForCanvas, setTheme]);

  // Handle theme change for this canvas
  const handleThemeChange = (themeName: string) => {
    if (id) {
      setThemeForCanvas(id, themeName);
    }
  };
  // Handle mouse events for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = Math.max(250, Math.min(500, e.clientX));
        setLeftPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Handle mouse events for resizing selected node section
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSelectedNode) {
        const sidebar = document.querySelector('aside');
        if (sidebar) {
          const sidebarRect = sidebar.getBoundingClientRect();
          const selectedNodeSection = document.querySelector('[data-selected-node]');
          if (selectedNodeSection) {
            const selectedNodeRect = selectedNodeSection.getBoundingClientRect();
            const newHeight = Math.max(150, Math.min(600, e.clientY - selectedNodeRect.top));
            setSelectedNodeHeight(newHeight);
          }
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingSelectedNode(false);
    };

    if (isResizingSelectedNode) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);    };
  }, [isResizingSelectedNode]);

  // Drag and drop handlers
  const handleDragStart = (node: Node) => {
    setDraggedNode(node);
  };

  const handleDragEnd = () => {
    setDraggedNode(null);
  };  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverCanvas(false);
    
    if (draggedNode) {
      const canvasRect = (e.target as HTMLElement).closest('.canvas-container')?.getBoundingClientRect();
      if (canvasRect) {
        const x = e.clientX - canvasRect.left;
        const y = e.clientY - canvasRect.top;
        
        console.log('Dropping node at:', { x, y });
        console.log('Dragged node:', draggedNode);
        
        // Move the dragged node from off-canvas to the drop position
        setNodes(prev => {
          const updated = prev.map(node => 
            node.id === draggedNode.id 
              ? { ...node, x, y }
              : node
          );
          console.log('Updated nodes after drop:', updated);
          return updated;
        });
        
        // Automatically select the newly placed node
        setSelectedNode(draggedNode.id);
        setDraggedNode(null);
      }
    }
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOverCanvas(true);
  };

  const handleCanvasDragLeave = (e: React.DragEvent) => {
    // Only set to false if we're actually leaving the canvas container
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOverCanvas(false);
    }
  };  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const imageUrl = URL.createObjectURL(file);
      console.log('Created image URL:', imageUrl);
      
      const newNode: Node = {
        id: crypto.randomUUID(),
        type: "image",
        x: -1000, // Place off-canvas initially (invisible)
        y: -1000,
        content: imageUrl,
        width: 120,
        height: 120,
      };
      
      console.log('Created new image node:', newNode);
      setNodes((prev) => {
        const updated = [...prev, newNode];
        console.log('Updated nodes:', updated);
        return updated;
      });
      
      // Clear the input
      event.target.value = '';
    }
  };
  const handleAddText = () => {
    setIsEditing(true);
    setEditText("");
  };
  const createTextNode = () => {
    if (editText.trim()) {
      const newNode: Node = {
        id: crypto.randomUUID(),
        type: "text", 
        x: -1000, // Place off-canvas initially (invisible)
        y: -1000,
        content: editText.trim(),
        width: 180,
        height: 100,
      };
      setNodes((prev) => [...prev, newNode]);
    }
    setIsEditing(false);
    setEditText("");
  };
  const deleteNode = (nodeId: string) => {
    const nodeToDelete = nodes.find(node => node.id === nodeId);
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    setSelectedNode(null);
    
    // Reset slider offsets if needed
    if (nodeToDelete) {
      if (nodeToDelete.type === 'image') {
        const remainingImages = getImageNodes().filter(node => node.id !== nodeId).length;
        if (imageSliderOffset > 0 && imageSliderOffset >= remainingImages - 2) {
          setImageSliderOffset(Math.max(0, remainingImages - 3));
        }
      } else {
        const remainingTexts = getTextNodes().filter(node => node.id !== nodeId).length;
        if (textSliderOffset > 0 && textSliderOffset >= remainingTexts - 2) {
          setTextSliderOffset(Math.max(0, remainingTexts - 3));
        }
      }    }
  };

  // Canvas name editing functions
  const startEditingCanvasName = () => {
    setTempCanvasName(canvasName);
    setIsEditingName(true);
  };
  const saveCanvasName = () => {
    const trimmedName = tempCanvasName.trim();
    if (trimmedName) {
      // Check for duplicate names (optional - you can remove this if you want to allow duplicates)
      const existingNames = getExistingCanvasNames();
      if (existingNames.includes(trimmedName.toLowerCase()) && trimmedName !== canvasName) {
        alert('A canvas with this name already exists. Please choose a different name.');
        return;
      }
      
      setCanvasName(trimmedName);
      setIsEditingName(false);
      setTempCanvasName("");
    }
  };

  // Get all existing canvas names to prevent duplicates
  const getExistingCanvasNames = (): string[] => {
    if (typeof window === 'undefined') return [];
    const names: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('canvas-name-') && key !== `canvas-name-${id}`) {
        const name = localStorage.getItem(key);
        if (name) names.push(name.toLowerCase());
      }
    }
    return names;
  };

  const cancelEditingCanvasName = () => {
    setIsEditingName(false);
    setTempCanvasName("");
  };

  const handleCanvasNameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveCanvasName();
    } else if (e.key === 'Escape') {
      cancelEditingCanvasName();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isEditing) {
      createTextNode();
    } else if (e.key === 'Escape' && isEditing) {
      setIsEditing(false);
      setEditText("");
    }
  };
  // Get filtered nodes by type - only show items not yet placed on canvas
  const getImageNodes = () => nodes.filter(node => node.type === 'image' && node.x < 0 && node.y < 0);
  const getTextNodes = () => nodes.filter(node => node.type === 'text' && node.x < 0 && node.y < 0);
  // Get all canvas-visible nodes (placed nodes)
  const getCanvasNodes = () => nodes.filter(node => node.x >= 0 && node.y >= 0);

  // Node selection and movement handlers
  const handleNodeSelect = (node: Node) => {
    setSelectedNode(node.id);
    // Bring clicked node to front
    const updated = [...nodes];
    const nodeIndex = updated.findIndex(n => n.id === node.id);
    const clickedNode = updated.splice(nodeIndex, 1)[0];
    updated.push(clickedNode);
    setNodes(updated);
  };

  const handleNodeDragEnd = (node: Node, x: number, y: number) => {
    const updated = [...nodes];
    const nodeIndex = updated.findIndex(n => n.id === node.id);
    updated[nodeIndex].x = x;
    updated[nodeIndex].y = y;
    
    // Move the dragged node to the end of the array (top layer)
    const draggedNode = updated.splice(nodeIndex, 1)[0];
    updated.push(draggedNode);
    
    setNodes(updated);
  };

  // Handle node selection by index
  const selectNodeByIndex = (type: 'image' | 'text', index: number) => {
    const filteredNodes = type === 'image' ? getImageNodes() : getTextNodes();
    if (filteredNodes[index]) {
      setSelectedNode(filteredNodes[index].id);
    }
  };

  // Handle slider navigation
  const handleSliderMove = (type: 'image' | 'text', direction: 'left' | 'right') => {
    const maxNodes = type === 'image' ? getImageNodes().length : getTextNodes().length;
    const maxOffset = Math.max(0, maxNodes - 3);
    
    if (type === 'image') {
      if (direction === 'left') {
        setImageSliderOffset(Math.max(0, imageSliderOffset - 1));
      } else {
        setImageSliderOffset(Math.min(maxOffset, imageSliderOffset + 1));
      }
    } else {
      if (direction === 'left') {
        setTextSliderOffset(Math.max(0, textSliderOffset - 1));      } else {
        setTextSliderOffset(Math.min(maxOffset, textSliderOffset + 1));
      }
    }
  };

  // AI Grouping Functions
  const generateMockEmbedding = (content: string, type: 'image' | 'text'): number[] => {
    // Mock embedding generation - in real app, you'd use TensorFlow.js or call an API
    const hash = content.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    // Generate a 128-dimensional mock embedding
    const embedding = Array.from({ length: 128 }, (_, i) => 
      Math.sin(hash * (i + 1) * 0.1) + (type === 'image' ? 0.5 : -0.5)
    );
    
    return embedding;
  };

  const classifyContent = (node: GroupedNode): { style?: string; mood?: string; semantics?: string[] } => {
    const content = node.content.toLowerCase();
    
    // Mock AI classification - replace with real AI models
    const artStyles = ['pixel art', 'realistic', 'low poly', 'cartoon', 'abstract', 'minimalist'];
    const moods = ['horror', 'cyberpunk', 'peaceful', 'energetic', 'mysterious', 'futuristic'];
    const semanticKeywords = {
      'combat': ['fight', 'battle', 'weapon', 'attack', 'defense'],
      'dialogue': ['talk', 'conversation', 'speech', 'chat', 'discussion'],
      'inventory': ['item', 'collect', 'storage', 'bag', 'equipment'],
      'environment': ['world', 'scene', 'background', 'landscape', 'setting']
    };

    const result: { style?: string; mood?: string; semantics?: string[] } = {};

    // Classify art style (mainly for images)
    if (node.type === 'image') {
      result.style = artStyles[Math.floor(Math.random() * artStyles.length)];
    }

    // Classify mood/theme
    result.mood = moods[Math.floor(Math.random() * moods.length)];

    // Classify semantic content (mainly for text)
    if (node.type === 'text') {
      result.semantics = [];
      Object.entries(semanticKeywords).forEach(([category, keywords]) => {
        if (keywords.some(keyword => content.includes(keyword))) {
          result.semantics!.push(category);
        }
      });
      if (result.semantics.length === 0) {
        result.semantics.push('general');
      }
    }

    return result;
  };

  const clusterNodesByType = (canvasNodes: GroupedNode[], type: 'art-style' | 'mood-theme' | 'semantic'): NodeGroup[] => {
    const clusters: { [key: string]: GroupedNode[] } = {};
    
    canvasNodes.forEach(node => {
      let key = 'uncategorized';
      
      switch (type) {
        case 'art-style':
          key = node.aiMetadata?.style || 'unknown-style';
          break;
        case 'mood-theme':
          key = node.aiMetadata?.mood || 'neutral';
          break;
        case 'semantic':
          key = node.aiMetadata?.semantics?.[0] || 'general';
          break;
      }
      
      if (!clusters[key]) {
        clusters[key] = [];
      }
      clusters[key].push(node);
    });

    // Convert clusters to groups with positions
    const groupColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    const groups: NodeGroup[] = [];
    
    Object.entries(clusters).forEach(([label, nodeList], index) => {
      const groupId = `group-${type}-${index}`;
      const startX = 100 + (index % 3) * 300;
      const startY = 100 + Math.floor(index / 3) * 250;
      
      groups.push({
        id: groupId,
        label,
        type,
        nodes: nodeList.map(n => n.id),
        position: { x: startX, y: startY },
        color: groupColors[index % groupColors.length]
      });
    });

    return groups;
  };

  const organizeNodesIntoGroups = (groups: NodeGroup[]) => {
    const updatedNodes = [...nodes];
    
    groups.forEach(group => {
      group.nodes.forEach((nodeId, index) => {
        const nodeIndex = updatedNodes.findIndex(n => n.id === nodeId);
        if (nodeIndex !== -1) {
          // Position nodes in a grid within the group
          const cols = Math.ceil(Math.sqrt(group.nodes.length));
          const row = Math.floor(index / cols);
          const col = index % cols;
          
          updatedNodes[nodeIndex].x = group.position.x + col * 140;
          updatedNodes[nodeIndex].y = group.position.y + row * 120;
          updatedNodes[nodeIndex].groupId = group.id;
          updatedNodes[nodeIndex].groupLabel = group.label;
          updatedNodes[nodeIndex].groupType = group.type;
        }
      });
    });
    
    setNodes(updatedNodes);
  };
  const startAIGrouping = async () => {
    setIsGroupingMode(true);
    
    // Get canvas nodes (placed nodes)
    const canvasNodes = getCanvasNodes() as GroupedNode[];
    
    if (canvasNodes.length === 0) {
      alert('Add some images and text to the canvas first!');
      setIsGroupingMode(false);
      return;
    }

    try {
      // Prepare data for Python API
      const texts = canvasNodes
        .filter(node => node.type === 'text')
        .map(node => node.content);
      
      const images = canvasNodes
        .filter(node => node.type === 'image')
        .map(node => node.content);

      console.log('Sending to Python API:', { texts, images });

      let enhancedNodes: GroupedNode[] = [...canvasNodes];
      let newGroups: NodeGroup[] = [];

      // Call appropriate API based on grouping type
      if (groupingType === 'semantic') {
        // Use the threshold-based grouping for semantic similarity
        const apiResults = await groupByThreshold(texts, images);
        console.log('API Results:', apiResults);
        
        // Convert API results to our group format
        newGroups = apiResults.map((result, index) => ({
          id: `group-semantic-${index}`,
          label: result.text || `Group ${index + 1}`,
          type: 'semantic' as const,
          nodes: [],
          position: { x: 100 + (index % 3) * 300, y: 100 + Math.floor(index / 3) * 250 },
          color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'][index % 6]
        }));

        // Map nodes to groups based on API results
        apiResults.forEach((result, groupIndex) => {
          // Find text node that matches this result
          const textNode = canvasNodes.find(node => 
            node.type === 'text' && node.content === result.text
          );
          if (textNode) {
            newGroups[groupIndex].nodes.push(textNode.id);
            enhancedNodes = enhancedNodes.map(node => 
              node.id === textNode.id 
                ? { ...node, aiMetadata: { ...node.aiMetadata, semantics: [result.text] } }
                : node
            );
          }

          // Find image nodes that match the results
          result.matches.forEach(imageUrl => {
            const imageNode = canvasNodes.find(node => 
              node.type === 'image' && node.content === imageUrl
            );
            if (imageNode) {
              newGroups[groupIndex].nodes.push(imageNode.id);
            }
          });
        });
      } else if (groupingType === 'art-style' && images.length > 0) {
        // Use art style classification API
        const styleResults = await classifyArtStyle(images);
        console.log('Art Style Results:', styleResults);
        
        // Process art style results (implement based on your API response format)
        // This will depend on what your Python API returns for art style classification
        newGroups = processArtStyleResults(styleResults, canvasNodes);
      } else if (groupingType === 'mood-theme') {
        // Use mood/theme classification API
        const moodResults = await classifyMoodTheme(texts, images);
        console.log('Mood Theme Results:', moodResults);
        
        // Process mood results (implement based on your API response format)
        newGroups = processMoodThemeResults(moodResults, canvasNodes);
      } else {
        // Fallback to mock data if no valid API call
        enhancedNodes = canvasNodes.map(node => {
          const classification = classifyContent(node);
          return {
            ...node,
            aiMetadata: {
              embedding: generateMockEmbedding(node.content, node.type),
              ...classification
            }
          } as GroupedNode;
        });
        newGroups = clusterNodesByType(enhancedNodes, groupingType);
      }

      // Update nodes with AI metadata
      const updatedAllNodes = nodes.map(node => {
        const enhanced = enhancedNodes.find(en => en.id === node.id);
        return enhanced || node;
      });
      setNodes(updatedAllNodes);
      setGroups(newGroups);

      // Step 3: Organize nodes on canvas
      setTimeout(() => {
        organizeNodesIntoGroups(newGroups);
        setIsGroupingMode(false);
      }, 1000); // Add delay for visual effect

    } catch (error) {
      console.error('AI Grouping failed:', error);
      alert('AI Grouping failed. Make sure your Python API server is running on localhost:8000. Falling back to mock data.');
      
      // Fallback to mock grouping
      const enhancedNodes = canvasNodes.map(node => {
        const classification = classifyContent(node);
        return {
          ...node,
          aiMetadata: {
            embedding: generateMockEmbedding(node.content, node.type),
            ...classification
          }
        } as GroupedNode;
      });

      const fallbackGroups = clusterNodesByType(enhancedNodes, groupingType);
      setGroups(fallbackGroups);
      
      setTimeout(() => {
        organizeNodesIntoGroups(fallbackGroups);
        setIsGroupingMode(false);
      }, 1000);
    }
  };

  // Helper functions to process API results
  const processArtStyleResults = (results: any, canvasNodes: GroupedNode[]): NodeGroup[] => {
    // Implement based on your Python API's art style response format
    // This is a placeholder - adjust based on your actual API response
    const styleGroups: { [key: string]: string[] } = {};
    
    results.forEach((result: any, index: number) => {
      const style = result.style || 'unknown';
      if (!styleGroups[style]) {
        styleGroups[style] = [];
      }
      
      // Find the corresponding node
      const node = canvasNodes.find(n => n.type === 'image');
      if (node) {
        styleGroups[style].push(node.id);
      }
    });

    return Object.entries(styleGroups).map(([style, nodeIds], index) => ({
      id: `group-art-style-${index}`,
      label: style,
      type: 'art-style' as const,
      nodes: nodeIds,
      position: { x: 100 + (index % 3) * 300, y: 100 + Math.floor(index / 3) * 250 },
      color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'][index % 6]
    }));
  };

  const processMoodThemeResults = (results: any, canvasNodes: GroupedNode[]): NodeGroup[] => {
    // Implement based on your Python API's mood/theme response format
    // This is a placeholder - adjust based on your actual API response
    const moodGroups: { [key: string]: string[] } = {};
    
    results.forEach((result: any) => {
      const mood = result.mood || 'neutral';
      if (!moodGroups[mood]) {
        moodGroups[mood] = [];
      }
      
      // Map results back to node IDs
      // This will depend on your API response format
    });

    return Object.entries(moodGroups).map(([mood, nodeIds], index) => ({
      id: `group-mood-theme-${index}`,
      label: mood,
      type: 'mood-theme' as const,
      nodes: nodeIds,
      position: { x: 100 + (index % 3) * 300, y: 100 + Math.floor(index / 3) * 250 },
      color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'][index % 6]
    }));
  };return (
    <div 
      className="flex flex-col h-screen text-white font-sans" 
      style={{ backgroundColor: theme.bg.primary, color: theme.text.primary }}
      onKeyDown={handleKeyPress} 
      tabIndex={0}
    >      {/* Header */}      <header 
        className="p-4 flex justify-between items-center shadow-md"
        style={{ backgroundColor: theme.bg.secondary }}
      >
        <button 
          onClick={() => navigate("/")} 
          className="px-4 py-2 rounded-lg shadow transition-colors flex items-center gap-2"
          style={{ 
            backgroundColor: theme.button.primary,
            color: theme.text.primary
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.button.hover}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.button.primary}
        >
          <img 
            src="/logo.png" 
            alt="MindMesh Logo" 
            className="w-6 h-6 object-contain"
          />
          Home
        </button>{/* Editable Canvas Name */}
        <div className="flex-1 flex justify-center">
          {isEditingName ? (
            <div className="flex items-center gap-2">              <input
                type="text"
                value={tempCanvasName}
                onChange={(e) => setTempCanvasName(e.target.value)}
                onKeyDown={handleCanvasNameKeyPress}
                placeholder="Enter canvas name..."
                className="px-3 py-1 text-black bg-white rounded border focus:outline-none focus:ring-2"
                style={{ borderColor: theme.border }}
                autoFocus
              />
              <button
                onClick={saveCanvasName}
                className="px-3 py-1 text-white rounded text-sm transition-colors"
                style={{ backgroundColor: theme.button.primary }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.button.hover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.button.primary}
              >
                ✓
              </button>
              <button
                onClick={cancelEditingCanvasName}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm transition-colors"
              >
                ✗
              </button>
            </div>
          ) : (            <div 
              onClick={startEditingCanvasName}
              className="cursor-pointer px-4 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bg.tertiary}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Click to edit canvas name"
            >
              <div className="text-lg font-bold text-center" style={{ color: theme.text.primary }}>
                {canvasName}
              </div>
              <div className="text-xs text-center" style={{ color: theme.text.muted }}>
                ID: {id?.slice(0, 8)}... • Click to rename
              </div>
            </div>
          )}
        </div>
        
        <div 
          className="text-sm px-3 py-1 rounded-full animate-pulse"
          style={{ backgroundColor: theme.button.primary, color: theme.text.primary }}
        >
          Auto-saved
        </div>
      </header>      {/* Main Content */}
      <main className="flex flex-1">
        {/* Left Panel */}
        <aside 
          className="p-4 flex flex-col gap-6 border-r relative"
          style={{ 
            width: `${leftPanelWidth}px`,
            backgroundColor: theme.bg.tertiary,
            borderColor: theme.border
          }}
        ><div>
            <p className="text-sm mb-2" style={{ color: theme.text.secondary }}>New Images</p>
            <div className="flex items-center gap-2">
              {getImageNodes().length > 3 && (
                <button 
                  onClick={() => handleSliderMove('image', 'left')}
                  disabled={imageSliderOffset === 0}
                  className="disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded p-1 text-xs transition-colors"
                  style={{ 
                    backgroundColor: imageSliderOffset === 0 ? '#6B7280' : theme.accent.primary,
                  }}
                  onMouseEnter={(e) => {
                    if (imageSliderOffset !== 0) {
                      e.currentTarget.style.backgroundColor = theme.accent.hover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (imageSliderOffset !== 0) {
                      e.currentTarget.style.backgroundColor = theme.accent.primary;
                    }
                  }}
                >
                  ←
                </button>
              )}
              
              <div className="flex gap-2 flex-1">
                {getImageNodes()
                  .slice(imageSliderOffset, imageSliderOffset + 3)
                  .map((node, index) => {
                    const actualIndex = imageSliderOffset + index;
                    const isSelected = selectedNode === node.id;
                    return (                      <button 
                        key={node.id}
                        onClick={() => selectNodeByIndex('image', actualIndex)}
                        draggable
                        onDragStart={() => handleDragStart(node)}
                        onDragEnd={handleDragEnd}
                        className="text-white rounded p-2 text-sm transition-colors cursor-pointer select-none"
                        style={{ 
                          backgroundColor: isSelected ? theme.accent.selected : theme.accent.primary,
                          border: isSelected ? `2px solid ${theme.accent.ring}` : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = theme.accent.hover;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = theme.accent.primary;
                          }
                        }}
                        title={`Drag to canvas or click to select • Image #${actualIndex + 1}`}
                      >
                        🖼️ {actualIndex + 1}
                      </button>
                    );
                  })}
                
                {getImageNodes().length === 0 && (
                  <div className="text-sm italic flex-1 text-center py-2" style={{ color: theme.text.muted }}>
                    No images yet
                  </div>
                )}
              </div>

              {getImageNodes().length > 3 && (
                <button 
                  onClick={() => handleSliderMove('image', 'right')}
                  disabled={imageSliderOffset >= getImageNodes().length - 3}
                  className="disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded p-1 text-xs transition-colors"
                  style={{ 
                    backgroundColor: imageSliderOffset >= getImageNodes().length - 3 ? '#6B7280' : theme.accent.primary,
                  }}
                  onMouseEnter={(e) => {
                    if (imageSliderOffset < getImageNodes().length - 3) {
                      e.currentTarget.style.backgroundColor = theme.accent.hover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (imageSliderOffset < getImageNodes().length - 3) {
                      e.currentTarget.style.backgroundColor = theme.accent.primary;
                    }
                  }}
                >
                  →
                </button>
              )}
            </div>
            
            <label 
              className="text-white text-center rounded p-2 cursor-pointer block mt-2 transition-colors"
              style={{ backgroundColor: theme.accent.secondary }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.accent.hover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.accent.secondary}
            >
              + Add Image
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>          <div>
            <p className="text-sm mb-2" style={{ color: theme.text.secondary }}>New Text</p>
            <div className="flex items-center gap-2">
              {getTextNodes().length > 3 && (
                <button 
                  onClick={() => handleSliderMove('text', 'left')}
                  disabled={textSliderOffset === 0}
                  className="disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded p-1 text-xs transition-colors"
                  style={{ 
                    backgroundColor: textSliderOffset === 0 ? '#6B7280' : theme.button.primary,
                  }}
                  onMouseEnter={(e) => {
                    if (textSliderOffset !== 0) {
                      e.currentTarget.style.backgroundColor = theme.button.hover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (textSliderOffset !== 0) {
                      e.currentTarget.style.backgroundColor = theme.button.primary;
                    }
                  }}
                >
                  ←
                </button>
              )}
              
              <div className="flex gap-2 flex-1">
                {getTextNodes()
                  .slice(textSliderOffset, textSliderOffset + 3)
                  .map((node, index) => {
                    const actualIndex = textSliderOffset + index;
                    const isSelected = selectedNode === node.id;
                    return (                      <button 
                        key={node.id}
                        onClick={() => selectNodeByIndex('text', actualIndex)}
                        draggable
                        onDragStart={() => handleDragStart(node)}
                        onDragEnd={handleDragEnd}
                        className="text-white rounded p-2 text-sm transition-colors cursor-pointer select-none"
                        style={{ 
                          backgroundColor: isSelected ? theme.button.hover : theme.button.primary,
                          border: isSelected ? `2px solid ${theme.accent.ring}` : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = theme.button.hover;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = theme.button.primary;
                          }
                        }}
                        title={`Drag to canvas or click to select • Text #${actualIndex + 1}`}
                      >
                        📝 {actualIndex + 1}
                      </button>
                    );
                  })}
                
                {getTextNodes().length === 0 && (
                  <div className="text-sm italic flex-1 text-center py-2" style={{ color: theme.text.muted }}>
                    No text notes yet
                  </div>
                )}
              </div>

              {getTextNodes().length > 3 && (
                <button 
                  onClick={() => handleSliderMove('text', 'right')}
                  disabled={textSliderOffset >= getTextNodes().length - 3}
                  className="disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded p-1 text-xs transition-colors"
                  style={{ 
                    backgroundColor: textSliderOffset >= getTextNodes().length - 3 ? '#6B7280' : theme.button.primary,
                  }}
                  onMouseEnter={(e) => {
                    if (textSliderOffset < getTextNodes().length - 3) {
                      e.currentTarget.style.backgroundColor = theme.button.hover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (textSliderOffset < getTextNodes().length - 3) {
                      e.currentTarget.style.backgroundColor = theme.button.primary;
                    }
                  }}
                >
                  →
                </button>
              )}
            </div>
            
            <button 
              onClick={handleAddText} 
              className="text-white rounded p-2 w-full mt-2 transition-colors"
              style={{ backgroundColor: theme.button.secondary }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.button.hover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.button.secondary}
            >
              + Add Text Note
            </button>
            
            {/* Text Input Area */}
            {isEditing && (
              <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: theme.bg.secondary }}>
                <p className="text-sm mb-2" style={{ color: theme.text.secondary }}>✍️ Create New Note</p>                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder="Type your note here..."
                  className="w-full p-2 text-white rounded border focus:outline-none resize-none"
                  style={{ 
                    backgroundColor: theme.bg.tertiary,
                    borderColor: theme.border
                  }}
                  rows={3}
                  autoFocus
                />
                <div className="mt-2 flex gap-2">
                  <button 
                    onClick={createTextNode}
                    className="px-3 py-1 text-white rounded text-sm transition-colors"
                    style={{ backgroundColor: theme.button.secondary }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.button.hover}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.button.secondary}
                  >
                    Create
                  </button>
                  <button 
                    onClick={() => {setIsEditing(false); setEditText("");}}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs mt-1" style={{ color: theme.text.muted }}>Press Enter to create, Escape to cancel</p>
              </div>
            )}
          </div>          {/* Selected Node Details */}
          <div 
            data-selected-node
            className="rounded-xl p-4 relative flex flex-col"
            style={{ 
              backgroundColor: theme.bg.secondary,
              height: `${selectedNodeHeight}px`,
              minHeight: '150px'
            }}
          >
            <p className="text-sm mb-2" style={{ color: theme.text.secondary }}>Selected Node</p>
            <div className="flex-1 overflow-y-auto">
              {selectedNode ? (
                (() => {
                  const node = nodes.find(n => n.id === selectedNode);
                  if (!node) return null;
                  
                  const nodesByType = node.type === 'image' ? getImageNodes() : getTextNodes();
                  const nodeIndex = nodesByType.findIndex(n => n.id === selectedNode);
                  
                  return (
                    <div className="flex flex-col h-full">
                      <div className="w-full p-3 rounded mb-2 flex-shrink-0" style={{ backgroundColor: theme.accent.primary }}>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-xs" style={{ color: theme.text.secondary }}>
                            {node.type === 'image' ? '🖼️ Image' : '📝 Text'} #{nodeIndex + 1}
                          </p>
                          <span 
                            className="text-xs px-2 py-1 rounded"
                            style={{ backgroundColor: theme.accent.secondary, color: theme.text.primary }}
                          >
                            {node.type}
                          </span>
                        </div>
                        <p className="text-xs mb-2" style={{ color: theme.text.secondary }}>
                          Position: ({Math.round(node.x)}, {Math.round(node.y)})
                        </p>
                      </div>
                      
                      <div className="flex-1 mb-2">
                        {node.type === 'text' ? (
                          <div className="p-3 rounded h-full overflow-y-auto" style={{ backgroundColor: theme.accent.primary }}>
                            <p className="text-sm leading-relaxed" style={{ color: theme.text.primary }}>
                              {node.content}
                            </p>
                          </div>
                        ) : (
                          <div className="h-full flex flex-col">
                            <p className="italic mb-2 text-sm" style={{ color: theme.text.secondary }}>Image Preview</p>
                            <div className="flex-1 rounded border overflow-hidden" style={{ borderColor: theme.border }}>
                              <img 
                                src={node.content} 
                                alt="Selected" 
                                className="w-full h-full object-contain"
                                style={{ backgroundColor: theme.bg.primary }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => deleteNode(selectedNode)}
                        className="bg-red-600 hover:bg-red-500 px-3 py-1 rounded w-full text-sm transition-colors flex-shrink-0"
                        style={{ color: theme.text.primary }}
                      >
                        🗑️ Delete {node.type === 'image' ? 'Image' : 'Note'} #{nodeIndex + 1}
                      </button>
                    </div>
                  );
                })()
              ) : (
                <div 
                  className="w-full h-full rounded flex items-center justify-center"
                  style={{ backgroundColor: theme.accent.primary }}
                >
                  <p className="text-sm" style={{ color: theme.text.muted }}>Click a node to select</p>
                </div>
              )}
            </div>
            
            {/* Resize Handle for Selected Node */}
            <div
              className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize transition-colors"
              style={{ backgroundColor: theme.border }}
              onMouseDown={() => setIsResizingSelectedNode(true)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.accent.hover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.border}
              title="Drag to resize selected node panel"
            />
          </div>
          {/* Mascot at Bottom of Sidebar */}
          <div className="flex-1 flex items-end justify-center pb-4 mt-6">
            <div className="flex flex-col items-center">
              <img 
                src="/mascot-transparentbg.png" 
                alt="MindMesh Mascot" 
                className="w-40 h-40 object-contain opacity-95 hover:opacity-100 transition-opacity"
                style={{ 
                  filter: 'drop-shadow(2px 2px 8px rgba(0,0,0,0.6))',
                  mixBlendMode: 'normal'
                }}
                onError={(e) => {
                  console.error('Failed to load mascot image');
                  e.currentTarget.style.display = 'none';
                }}
              />
              <p className="text-xs mt-2 text-center" style={{ color: theme.text.muted }}>
                MindMesh Assistant
              </p>
            </div>
          </div>
          
          {/* Resize Handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize transition-colors"
            style={{ backgroundColor: theme.border }}
            onMouseDown={() => setIsResizing(true)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.accent.hover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.border}
            title="Drag to resize panel"
          />
        </aside>        {/* Right Content */}
        <section className="flex-1 flex flex-col" style={{ backgroundColor: theme.bg.primary }}>          {/* Filter Bar */}          <div 
            data-filter-bar
            className="p-4 flex justify-between items-center border-b"
            style={{ backgroundColor: theme.bg.tertiary, borderColor: theme.border }}
          >            <div className="flex items-center gap-4">
              <label className="text-sm" style={{ color: theme.text.secondary }}>Group By</label>
              <select 
                className="rounded px-2 py-1"
                style={{ backgroundColor: theme.bg.secondary, color: theme.text.primary }}
                value={groupingType}
                onChange={(e) => setGroupingType(e.target.value as 'art-style' | 'mood-theme' | 'semantic')}
                disabled={isGroupingMode}
              >
                <option value="art-style">Art Style</option>
                <option value="mood-theme">Mood/Theme</option>
                <option value="semantic">Semantic Topic</option>
              </select>
              <button 
                className="px-4 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: theme.button.primary, color: theme.text.primary }}
                onMouseEnter={(e) => {
                  if (!isGroupingMode) {
                    e.currentTarget.style.backgroundColor = theme.button.hover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isGroupingMode) {
                    e.currentTarget.style.backgroundColor = theme.button.primary;
                  }
                }}
                onClick={startAIGrouping}
                disabled={isGroupingMode}
                title={isGroupingMode ? "AI Grouping in progress..." : "Start AI-powered grouping of canvas nodes"}
              >
                {isGroupingMode ? "Grouping..." : "Start AI Grouping"}
              </button>
            </div>
            <div className="flex items-center gap-4">              <div className="flex items-center gap-2">
                <label className="text-sm" style={{ color: theme.text.secondary }}>Color Theme</label>
                <select 
                  className="rounded px-2 py-1"
                  style={{ backgroundColor: theme.bg.secondary, color: theme.text.primary }}
                  value={id ? getThemeForCanvas(id) : theme.name.toLowerCase()}
                  onChange={(e) => handleThemeChange(e.target.value)}
                >
                  {Object.entries(colorThemes).map(([key, themeData]) => (
                    <option key={key} value={key}>{themeData.name}</option>
                  ))}
                </select>
              </div>              <div className="flex items-center gap-2">
                <label className="text-sm" style={{ color: theme.text.secondary }}>Groups</label>
                <select 
                  className="rounded px-2 py-1"
                  style={{ backgroundColor: theme.bg.secondary, color: theme.text.primary }}
                  value={groupCount}
                  onChange={(e) => setGroupCount(parseInt(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </div>
              
              {/* Debug Info */}
              <div className="text-xs" style={{ color: theme.text.muted }}>
                Canvas: {getCanvasNodes().length} | Sidebar: {nodes.filter(n => n.x < 0).length}
              </div>
            </div>
          </div>          {/* Canvas Stage */}
          <div 
            className={`flex-1 relative canvas-container transition-all duration-200 ${
              isDragOverCanvas ? 'ring-4 ring-blue-400 ring-opacity-50' : ''
            }`}
            onDrop={handleCanvasDrop}
            onDragOver={handleCanvasDragOver}
            onDragLeave={handleCanvasDragLeave}
          >
            {isClient ? (
              <Suspense fallback={<div className="text-white p-8">Loading canvas...</div>}>
                <Stage 
                  width={canvasSize.width} 
                  height={canvasSize.height} 
                  style={{ backgroundColor: theme.bg.canvas }}
                >                  <Layer>
                    {/* Group Backgrounds */}
                    {groups.map((group) => (
                      <React.Fragment key={`group-bg-${group.id}`}>
                        <Rect
                          x={group.position.x - 20}
                          y={group.position.y - 40}
                          width={280}
                          height={200}
                          fill={group.color}
                          opacity={0.1}
                          stroke={group.color}
                          strokeWidth={2}
                          dash={[10, 5]}
                          cornerRadius={12}
                        />
                        <Text
                          x={group.position.x - 10}
                          y={group.position.y - 35}
                          text={`${group.label} (${group.nodes.length})`}
                          fontSize={14}
                          fontStyle="bold"
                          fill={group.color}
                        />
                      </React.Fragment>
                    ))}
                    
                    {/* Canvas Nodes */}
                    {getCanvasNodes().map((node) => {
                      if (node.type === "text") {
                        return (
                          <CanvasText
                            key={node.id}
                            node={node}
                            selectedNode={selectedNode}
                            onSelect={handleNodeSelect}
                            onDragEnd={handleNodeDragEnd}
                            theme={theme}
                          />
                        );
                      }
                      
                      if (node.type === "image") {
                        return (
                          <CanvasImage
                            key={node.id}
                            node={node}
                            selectedNode={selectedNode}
                            onSelect={handleNodeSelect}
                            onDragEnd={handleNodeDragEnd}
                            theme={theme}
                          />
                        );
                      }
                      
                      return null;
                    })}
                  </Layer>
              </Stage>
            </Suspense>
            ) : (
              <div className="text-white p-8">Initializing canvas...</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
