import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import en from '../i18n/en.json';
import ta from '../i18n/ta.json';

const dicts = { en, ta };

const I18nContext = createContext({ lang: 'en', setLang: () => {}, t: (k, f) => f || k });

export const I18nProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en');

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useMemo(() => {
    const d = dicts[lang] || dicts.en;
    return (key, fallback) => {
      const parts = String(key || '').split('.');
      let cur = d;
      for (const p of parts) {
        if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p]; else { cur = undefined; break; }
      }
      return typeof cur === 'string' ? cur : (fallback || key);
    };
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
