import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";

interface CanvasInfo {
  id: string;
  name: string;
  nodeCount: number;
  lastModified: string;
}

export function Welcome() {
  const [savedCanvases, setSavedCanvases] = useState<CanvasInfo[]>([]);
  const [isClient, setIsClient] = useState(false);
  const { theme, globalTheme, setGlobalTheme, colorThemes } = useTheme();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadSavedCanvases();
    }
  }, [isClient]);

  const loadSavedCanvases = () => {
    const canvases: CanvasInfo[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('canvas-name-')) {
        const canvasId = key.replace('canvas-name-', '');
        const name = localStorage.getItem(key) || 'Untitled';
        
        // Get node count
        const nodesData = localStorage.getItem(`canvas-${canvasId}`);
        const nodeCount = nodesData ? JSON.parse(nodesData).length : 0;
        
        // Create mock last modified date (you could store this separately if needed)
        const lastModified = new Date().toLocaleDateString();
        
        canvases.push({
          id: canvasId,
          name,
          nodeCount,
          lastModified
        });
      }
    }
    
    setSavedCanvases(canvases);
  };

  const deleteCanvas = (canvasId: string) => {
    if (confirm('Are you sure you want to delete this canvas? This action cannot be undone.')) {
      localStorage.removeItem(`canvas-${canvasId}`);
      localStorage.removeItem(`canvas-name-${canvasId}`);
      localStorage.removeItem(`canvas-theme-${canvasId}`); // Also remove theme data
      loadSavedCanvases(); // Refresh the list
    }
  };

  const newId = crypto.randomUUID();

  return (
    <div className="min-h-screen bg-white font-sans" style={{ color: theme.text.primary }}>
      {/* Header */}
      <header className="p-6 shadow-lg border-b" style={{ backgroundColor: theme.bg.secondary }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="MindMesh Logo" 
                className="w-12 h-12 object-contain"
              />
              <div>
                <h1 className="text-4xl font-bold mb-2" style={{ color: theme.text.primary }}>MindMesh</h1>
                <p className="text-lg" style={{ color: theme.text.secondary }}>
                  Your creative project hub for organizing ideas and visualizing concepts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm" style={{ color: theme.text.secondary }}>Global Theme:</label>
              <select 
                className="rounded px-3 py-2 text-sm"
                style={{ backgroundColor: theme.bg.tertiary, color: theme.text.primary, borderColor: theme.border }}
                value={globalTheme}
                onChange={(e) => setGlobalTheme(e.target.value)}
              >
                {Object.entries(colorThemes).map(([key, themeData]) => (
                  <option key={key} value={key}>{themeData.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        {/* Create New Canvas Section */}
        <div className="rounded-xl p-8 mb-8 border shadow-lg" style={{ backgroundColor: theme.bg.primary, borderColor: theme.border }}>
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4" style={{ color: theme.text.primary }}>Start Creating</h2>
            <p className="mb-6" style={{ color: theme.text.secondary }}>
              Create a new canvas to organize your thoughts, ideas, and visual concepts
            </p>
            <Link to={`/canvas/${newId}`}>
              <button 
                className="px-8 py-3 text-white rounded-lg font-medium shadow-lg transition-all transform hover:scale-105"
                style={{ 
                  background: `linear-gradient(to right, ${theme.button.primary}, ${theme.accent.primary})`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `linear-gradient(to right, ${theme.button.hover}, ${theme.accent.hover})`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `linear-gradient(to right, ${theme.button.primary}, ${theme.accent.primary})`;
                }}
              >
                New Canvas
              </button>
            </Link>
          </div>
        </div>

        {/* Saved Canvases Section */}
        <div className="rounded-xl p-8 border shadow-lg" style={{ backgroundColor: theme.bg.primary, borderColor: theme.border }}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold" style={{ color: theme.text.primary }}>Your Canvases</h2>
            <button 
              onClick={loadSavedCanvases}
              className="px-4 py-2 text-white rounded-lg text-sm transition-colors"
              style={{ backgroundColor: theme.button.secondary }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.button.hover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.button.secondary}
            >
              🔄 Refresh
            </button>
          </div>

          {savedCanvases.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: theme.text.primary }}>No canvases yet</h3>
              <p style={{ color: theme.text.muted }}>Create your first canvas to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedCanvases.map((canvas) => (
                <div 
                  key={canvas.id} 
                  className="rounded-lg p-6 border hover:shadow-md transition-all"
                  style={{ 
                    backgroundColor: theme.bg.tertiary, 
                    borderColor: theme.border
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = theme.accent.primary}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.border}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold truncate flex-1 mr-2" style={{ color: theme.text.primary }}>
                      {canvas.name}
                    </h3>
                    <button
                      onClick={() => deleteCanvas(canvas.id)}
                      className="text-red-500 hover:text-red-600 text-sm p-1 hover:bg-red-50 rounded transition-colors"
                      title="Delete canvas"
                    >
                      🗑️
                    </button>
                  </div>
                  
                  <div className="text-sm mb-4" style={{ color: theme.text.secondary }}>
                    <div className="flex items-center gap-2 mb-1">
                      {/* <span>📝</span> */}
                      <span >{canvas.nodeCount} nodes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* <span>📅</span> */}
                      <span >Modified: {canvas.lastModified}</span>
                    </div>
                  </div>
                  
                  <div className="text-xs mb-4 font-mono" style={{ color: theme.text.muted }}>
                  </div>
                  
                  <Link to={`/canvas/${canvas.id}`}>
                    <button 
                      className="w-full px-4 py-2 text-white rounded-lg transition-all transform hover:scale-105 font-medium"
                      style={{ 
                        background: `linear-gradient(to right, ${theme.accent.secondary}, ${theme.accent.primary})`
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `linear-gradient(to right, ${theme.accent.hover}, ${theme.accent.selected})`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = `linear-gradient(to right, ${theme.accent.secondary}, ${theme.accent.primary})`;
                      }}
                    >
                      Open Canvas
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tech Stack Info */}
        <div className="mt-8 text-center">
          <p className="text-sm" style={{ color: theme.text.muted }}>
            Built with React 19 • TypeScript • React Router 7 • Tailwind CSS 4 • Konva • Vite
          </p>
        </div>
      </main>
    </div>
  );
}

