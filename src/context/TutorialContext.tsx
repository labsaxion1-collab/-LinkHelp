import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type TutorialContextValue = {
  isOpen: boolean;
  openTutorial: () => void;
  closeTutorial: () => void;
};

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openTutorial = useCallback(() => setIsOpen(true), []);
  const closeTutorial = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, openTutorial, closeTutorial }),
    [isOpen, openTutorial, closeTutorial],
  );

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
}
