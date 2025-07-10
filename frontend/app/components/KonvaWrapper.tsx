import React, { useEffect, useState } from 'react';

// Dynamic import of Konva to avoid SSR issues
const loadKonva = async () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const konva = await import('react-konva');
    return konva;
  } catch (error) {
    console.error('Failed to load react-konva:', error);
    return null;
  }
};

interface KonvaWrapperProps {
  children: (components: any) => React.ReactNode;
  fallback?: React.ReactNode;
}

export const KonvaWrapper: React.FC<KonvaWrapperProps> = ({ 
  children, 
  fallback = <div className="text-white p-8">Loading canvas...</div> 
}) => {
  const [konvaComponents, setKonvaComponents] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadComponents = async () => {
      const konva = await loadKonva();
      if (konva) {
        setKonvaComponents(konva);
      }
      setIsLoading(false);
    };

    loadComponents();
  }, []);

  if (isLoading || !konvaComponents) {
    return <>{fallback}</>;
  }

  return <>{children(konvaComponents)}</>;
};

// Export a hook for using Konva components
export const useKonva = () => {
  const [konva, setKonva] = useState<any>(null);

  useEffect(() => {
    loadKonva().then(setKonva);
  }, []);

  return konva;
};
