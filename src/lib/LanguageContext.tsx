import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ar' | 'en';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  dir: 'rtl' | 'ltr';
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // Brand & Header
    'app_title': 'Hakawati AI',
    'app_tagline': 'كتابك ... أصبح صوتاً',
    'nav_home': 'الرئيسية',
    'nav_pricing': 'الأسعار',
    'nav_features': 'الميزات',
    'nav_faq': 'الأسئلة الشائعة',
    'nav_contact': 'تواصل معنا',
    'library': 'مكتبتي',
    'login': 'تسجيل الدخول',
    'register': 'إنشاء حساب',
    'logout': 'تسجيل الخروج',
    'admin': 'مدير',

    // Pricing & Minutes
    'minutes_quota': 'رصيدك',
    'recharge': '+شحن',
    'pricing_title': 'ادفع مقابل ما تستمع إليه فقط.. بلا اشتراكات شهرية',
    'pricing_subtitle': 'اختر باقة الدقائق المناسبة لمكتبتك الصوتية. دقائقك تحفظ في محفظتك دائماً وتظل متاحة لك مدى الحياة.',
    'starter_pack': 'باقة القارئ (Starter Pack)',
    'pro_pack': 'باقة الشغوف (Pro Pack)',
    'master_pack': 'باقة النخبة (Master Pack)',

    // Conversion Tool
    'convert_pdf_title': 'حوّل أي كتاب PDF أو نص إلى صوت عربي فاخر',
    'upload_pdf': 'اسحب واسقط ملف الـ PDF هنا أو انقر للاختيار',
    'select_voice': 'اختر القارئ الصوتي',
    'convert_now': 'تحويل إلى صوت الآن 🎧',
    'sample_books': 'أو جرب كتاباً نموذجياً بنقرة واحدة',

    // Legal
    'terms': 'شروط الاستخدام',
    'privacy': 'سياسة الخصوصية',
    'all_rights': 'جميع الحقوق محفوظة © 2026 Hakawati AI',
  },
  en: {
    // Brand & Header
    'app_title': 'Hakawati AI',
    'app_tagline': 'Your books, turned into lifelike speech',
    'nav_home': 'Home',
    'nav_pricing': 'Pricing',
    'nav_features': 'Features',
    'nav_faq': 'FAQ',
    'nav_contact': 'Contact Us',
    'library': 'My Library',
    'login': 'Sign In',
    'register': 'Get Started',
    'logout': 'Sign Out',
    'admin': 'Admin',

    // Pricing & Minutes
    'minutes_quota': 'Credit Balance',
    'recharge': '+Top Up',
    'pricing_title': 'Pay Only For What You Listen To.. No Monthly Subscriptions',
    'pricing_subtitle': 'Choose the minute balance that fits your audiobook library. Your credits remain in your wallet forever with lifetime validity.',
    'starter_pack': 'Starter Pack',
    'pro_pack': 'Pro Pack',
    'master_pack': 'Master Pack',

    // Conversion Tool
    'convert_pdf_title': 'Convert Any PDF or Text into Premium Natural Speech',
    'upload_pdf': 'Drag and drop your PDF file here, or click to browse',
    'select_voice': 'Select Audio Narrator',
    'convert_now': 'Convert to Audio Now 🎧',
    'sample_books': 'Or try a sample book with one click',

    // Legal
    'terms': 'Terms of Service',
    'privacy': 'Privacy Policy',
    'all_rights': 'All Rights Reserved © 2026 Hakawati AI',
  }
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'ar',
  setLang: () => {},
  dir: 'rtl',
  t: (key) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem('app_language') as Language) || 'ar';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('app_language', newLang);
  };

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [lang, dir]);

  const t = (key: string): string => {
    return translations[lang]?.[key] || translations['ar']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, dir, t }}>
      <div dir={dir} className={dir === 'ltr' ? 'font-sans' : "font-['Cairo',sans-serif]"}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
