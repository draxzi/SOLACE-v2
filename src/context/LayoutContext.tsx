'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface LayoutContextType {
  isSidebarOpen: boolean; // For mobile slide-out drawer
  setIsSidebarOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean; // For desktop collapsed state
  setIsSidebarCollapsed: (collapsed: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export default function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Close mobile sidebar on window resize if screen becomes desktop sized
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <LayoutContext.Provider
      value={{
        isSidebarOpen,
        setIsSidebarOpen,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useAppLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useAppLayout must be used within a LayoutProvider');
  }
  return context;
}
