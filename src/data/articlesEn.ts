// English versions of the articles, keyed by the Arabic article's slug. Served at
// /en/articles/<slug>; the texts are ./article-texts/en/<textId>.ts.
import type { ArticleEn } from './articles';

export const ARTICLES_EN: Record<string, ArticleEn> = {
  'تحويل-كتاب-pdf-الى-كتاب-صوتي': {
    slug: 'arabic-pdf-to-audiobook',
    title: 'How to Turn an Arabic PDF into an Audiobook | Hakawati AI',
    description:
      'A practical guide to turning any Arabic PDF book into an audiobook with a natural voice: text and scanned PDFs, choosing a voice and dialect, chapter-by-chapter listening and tips for accurate pronunciation.',
    keywords: 'arabic pdf to audio, arabic pdf to audiobook, convert arabic pdf to speech, arabic book to audio, read arabic pdf aloud, arabic audiobook from pdf',
    h1: 'How to Turn an Arabic PDF into an Audiobook',
    lead: 'A step-by-step guide to turning any Arabic book in PDF format into an audiobook you can listen to on the go, in a natural voice and the dialect you prefer.',
    category: 'Guides',
    readMinutes: 6,
  },
  'تعليق-صوتي-بالذكاء-الاصطناعي': {
    slug: 'arabic-ai-voiceover',
    title: 'Arabic AI Voice-over for Videos and Ads | Hakawati AI',
    description:
      'How to create a professional Arabic voice-over with AI for YouTube, reels and ads: step by step, formal Arabic or dialect, writing for the ear, and the mistakes that make a voice sound robotic.',
    keywords: 'arabic ai voiceover, arabic voice over, arabic voice over ai, arabic voice generator, arabic voice for ads, arabic voiceover online',
    h1: 'Arabic AI Voice-over: A Guide for Creators and Brands',
    lead: 'Create a professional Arabic voice-over for your videos and ads in minutes, in formal Arabic or your audience’s dialect, without a microphone or a studio.',
    category: 'Guides',
    readMinutes: 5,
  },
  'صوت-ذكاء-اصطناعي-عربي': {
    slug: 'natural-arabic-ai-voice',
    title: 'Natural Arabic AI Voice That Sounds Human | Hakawati AI',
    description:
      'How to turn text into natural, human-sounding Arabic speech with AI: what makes a voice sound natural, why many tools get Arabic wrong, how to choose a voice and dialect, and how to try it free.',
    keywords: 'arabic ai voice, natural arabic voice, human-like arabic text to speech, realistic arabic tts, arabic voice ai, arabic speech synthesis',
    h1: 'Natural Arabic AI Voice: How to Get Human-Sounding Arabic Speech',
    lead: 'Arabic AI voices no longer sound robotic. Learn what makes a voice sound natural and how to choose the right voice and dialect for your book or video.',
    category: 'Guides',
    readMinutes: 5,
  },
  'كتب-صوتية-عربية-مجانية': {
    slug: 'free-arabic-audiobooks',
    title: 'Free Arabic Audiobooks: Where to Find Them | Hakawati AI',
    description:
      'Where to find free Arabic audiobooks: audio book summaries, turning your own Arabic PDFs into audio, audiobook platforms, YouTube and podcasts, classical books, and tips for learning by listening.',
    keywords: 'free arabic audiobooks, arabic audiobooks, arabic audio books online, listen to arabic books, arabic audiobook app, arabic books audio',
    h1: 'Free Arabic Audiobooks: Where to Find Them and How to Use Them',
    lead: 'Five ways to listen to books in Arabic for free or for very little, from audio summaries to turning the books you own into audio.',
    category: 'Audiobooks',
    readMinutes: 5,
  },
};

export const ARTICLES_HUB_EN = {
  title: 'Articles on Arabic Audiobooks and Text to Speech | Hakawati AI',
  description: 'Practical guides on turning Arabic books and texts into audio, Arabic AI voices, voice-overs and audiobooks, from the Hakawati AI team.',
  h1: 'Articles',
  lead: 'Practical guides on Arabic audiobooks, Arabic text to speech and AI voice-overs.',
};
