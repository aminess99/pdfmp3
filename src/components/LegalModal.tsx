import React from 'react';
import { X } from 'lucide-react';
import { LANG, Lang, tr, DIR } from '../lib/i18n';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy';
}

// Plain, accurate description of how the service handles data today.
// Draft wording: the site owner should have it reviewed before relying on it legally.
type LegalContent = Record<LegalModalProps['type'], { title: string; summary: string; sections: { heading: string; body: string }[] }>;

const CONTENT_AR: LegalContent = {
  privacy: {
    title: 'سياسة الخصوصية',
    summary: 'نستخدم ملفاتك فقط لتحويلها إلى صوت، ولا نبيع بياناتك، ويمكنك حذف كتبك في أي وقت.',
    sections: [
      {
        heading: 'البيانات التي نجمعها',
        body: 'عند التسجيل: اسمك وبريدك الإلكتروني عبر Firebase Authentication. عند الاستخدام: نص الكتب التي ترفعها أو تلصقها، وإعداداتك (مثل الصوت والسرعة) التي تُحفظ في متصفحك.',
      },
      {
        heading: 'كيف نعالج ملفاتك',
        body: 'يُستخرج النص من ملفك ويُرسل إلى مزوّدي الذكاء الاصطناعي (OpenRouter ونماذج Google Gemini) لتحويله إلى صوت أو تلخيصه أو الإجابة عن أسئلتك. تخضع هذه المعالجة لسياسات هؤلاء المزوّدين.',
      },
      {
        heading: 'التخزين',
        body: 'إذا كنت مسجّلاً، تُحفظ كتبك المحوّلة في مكتبتك على Firebase Firestore ولا يطّلع عليها غيرك. كضيف، تبقى كتبك في متصفحك فقط. يُخزَّن الصوت المولَّد مؤقتاً على الخادم لتسريع إعادة التشغيل. المقاطع التي تختار مشاركتها تصبح متاحة لكل من لديه الرابط.',
      },
      {
        heading: 'حذف بياناتك',
        body: 'يمكنك حذف أي كتاب من مكتبتك في أي وقت. لحذف حسابك بالكامل راسلنا على [البريد الإلكتروني].',
      },
    ],
  },
  terms: {
    title: 'شروط الاستخدام',
    summary: 'استخدم الموقع لملفات تملك حق استخدامها، والصوت المولَّد لاستخدامك وفق هذه الشروط.',
    sections: [
      {
        heading: 'استخدام الخدمة',
        body: 'تحوّل الخدمة النصوص والكتب إلى صوت بالذكاء الاصطناعي. قد تحتوي النتائج على أخطاء في النطق أو التلخيص، فراجعها قبل الاعتماد عليها.',
      },
      {
        heading: 'حقوق المحتوى',
        body: 'أنت مسؤول عن امتلاك حق استخدام الملفات التي ترفعها. لا تستخدم الخدمة لنشر محتوى محمي بحقوق نشر دون إذن أصحابه.',
      },
      {
        heading: 'الرصيد والدفع',
        body: 'تحصل عند التسجيل على دقائق مجانية. الدفع الإلكتروني غير مفعّل بعد؛ ستُضاف شروط الشراء والاسترجاع عند تفعيله.',
      },
      {
        heading: 'التواصل',
        body: 'لأي استفسار راسلنا على [البريد الإلكتروني].',
      },
    ],
  },
};

const CONTENT_EN: LegalContent = {
  privacy: {
    title: 'Privacy policy',
    summary: 'We use your files only to turn them into audio, we do not sell your data, and you can delete your books at any time.',
    sections: [
      {
        heading: 'What we collect',
        body: 'When you sign up: your name and email, through Firebase Authentication. When you use the site: the text of the books you upload or paste, and your preferences (such as voice and speed), which are stored in your browser.',
      },
      {
        heading: 'How your files are processed',
        body: 'The text is extracted from your file and sent to AI providers (OpenRouter and Google Gemini models) to turn it into audio, summarize it or answer your questions. This processing is subject to those providers’ policies.',
      },
      {
        heading: 'Storage',
        body: 'If you are signed in, your converted books are saved to your library in Firebase Firestore and are visible only to you. As a guest, your books stay in your browser only. Generated audio is cached on the server temporarily to speed up replays. Clips you choose to share are public to anyone with the link.',
      },
      {
        heading: 'Deleting your data',
        body: 'You can delete any book from your library at any time. To delete your whole account, email us at [email].',
      },
    ],
  },
  terms: {
    title: 'Terms of use',
    summary: 'Use the site with files you have the right to use; the generated audio is for your use under these terms.',
    sections: [
      {
        heading: 'Using the service',
        body: 'The service turns text and books into audio with AI. Results may contain pronunciation or summary mistakes, so review them before relying on them.',
      },
      {
        heading: 'Content rights',
        body: 'You are responsible for having the right to use the files you upload. Do not use the service to publish copyrighted content without its owners’ permission.',
      },
      {
        heading: 'Minutes and payment',
        body: 'You get free minutes when you sign up. Online payment is not enabled yet; purchase and refund terms will be added when it is.',
      },
      {
        heading: 'Contact',
        body: 'For any question, email us at [email].',
      },
    ],
  },
};

const CONTENT: Record<Lang, LegalContent> = { ar: CONTENT_AR, en: CONTENT_EN };

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, type }) => {
  if (!isOpen) return null;
  const c = CONTENT[LANG][type];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 font-body" dir={DIR} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[720px] max-h-[85dvh] bg-card border border-line rounded-[20px] flex flex-col text-slate-300"
      >
        <div className="px-6 py-5 border-b border-line flex items-center justify-between gap-3 shrink-0">
          <h2 id="legal-title" className="font-display font-extrabold text-2xl text-white">{c.title}</h2>
          <button type="button" onClick={onClose} aria-label={tr('إغلاق', 'Close')} className="w-11 h-11 rounded-full text-slate-400 hover:text-white hover:bg-raised flex items-center justify-center cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 sm:p-8 overflow-y-auto flex flex-col gap-6 leading-[1.9]">
          <div className="px-5 py-4 rounded-[14px] bg-ink border border-line">
            <strong className="text-white">{tr('باختصار:', 'In short:')}</strong> {c.summary}
          </div>
          {c.sections.map((sec) => (
            <section key={sec.heading} className="flex flex-col gap-1.5">
              <h3 className="text-lg font-semibold text-white">{sec.heading}</h3>
              <p className="text-slate-400">{sec.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
