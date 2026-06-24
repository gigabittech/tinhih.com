import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type EventType = "appointment" | "task" | "reminder" | "meeting" | "out-of-office";

interface PageContextType {
  title: string;
  subtitle: string;
  setPageInfo: (title: string, subtitle: string) => void;
  onNewEvent?: (type: EventType, date?: Date, time?: string) => void;
  setNewEventHandler: (handler: (type: EventType, date?: Date, time?: string) => void) => void;
}

const PageContext = createContext<PageContextType | undefined>(undefined);

export function PageProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [onNewEvent, setOnNewEvent] = useState<((type: EventType, date?: Date, time?: string) => void) | undefined>(undefined);

  const setPageInfo = (newTitle: string, newSubtitle: string) => {
    setTitle(newTitle);
    setSubtitle(newSubtitle);
    
    // Update document title
    if (newTitle) {
      document.title = `${newTitle} | TiNHiH Portal`;
    }
  };

  // Update document title whenever title changes
  useEffect(() => {
    if (title) {
      document.title = `${title} | TiNHiH Portal`;
    }
  }, [title]);

  const setNewEventHandler = (handler: (type: EventType, date?: Date, time?: string) => void) => {
    setOnNewEvent(() => handler);
  };

  return (
    <PageContext.Provider value={{ 
      title, 
      subtitle, 
      setPageInfo, 
      onNewEvent, 
      setNewEventHandler 
    }}>
      {children}
    </PageContext.Provider>
  );
}

export function usePageTitle() {
  const context = useContext(PageContext);
  if (context === undefined) {
    throw new Error('usePageTitle must be used within a PageProvider');
  }
  return context;
}
