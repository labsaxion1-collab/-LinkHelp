import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { en } from '@/translations/en';
import { pt } from '@/translations/pt';
import { fr } from '@/translations/fr';
import type { AppLanguage } from '@/services/translationService';
import { resolveMessage } from '@/services/translationService';

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const dictionaries = { en, pt, fr };

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem('linkhelp_lang');
    return (saved as AppLanguage) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('linkhelp_lang', language);
    document.documentElement.lang =
      language === 'en' ? 'en' : language === 'fr' ? 'fr' : 'pt-BR';
    document.documentElement.setAttribute('data-linkhelp-lang', language);
  }, [language]);

  const t = useMemo(
    () => (key: string, variables?: Record<string, string | number>) =>
      resolveMessage(dictionaries, language, key, variables),
    [language],
  );

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
