export interface Voice {
  id: string;
  name: string;
  gender: 'male' | 'female';
  dialectId: string;
  avatar: string;
  description: string;
  recommendedFor: string;
  sampleText: string;
  pitch: number;
  rate: number;
  isPremium?: boolean;
  geminiVoiceName?: string;
  stylePrompt?: string;
  creatorName?: string;
}

export interface Dialect {
  id: string;
  name: string;
  country: string;
  flag: string;
  code: string; // e.g. ar-MA, ar-SA, ar-EG
  region?: DialectRegion; // optional: dialects stored with older saved books lack it
}

export type DialectRegion = 'msa' | 'gulf' | 'levant' | 'iraq_yemen' | 'nile' | 'maghreb';

export interface AudioStyle {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface SampleBook {
  id: string;
  title: string;
  author: string;
  category: string;
  pages: number;
  estimatedDuration: string;
  coverColor: string;
  sampleText: string;
}

export interface BookChapter {
  id: string;
  chapterNumber: number;
  title: string;
  wordCount: number;
  estimatedDurationMinutes: number;
  text: string;
  audioUrl?: string;
  status?: 'pending' | 'converting' | 'completed' | 'error';
  progress?: number;
}

export type ListeningMode = 'full' | 'summary' | 'key_points';

export interface ConversionJob {
  id: string;
  fileName: string;
  fileSize: string;
  totalPages: number;
  processedPages: number;
  selectedDialect: Dialect;
  selectedVoice: Voice;
  selectedStyle: AudioStyle;
  status: 'idle' | 'uploading' | 'extracting' | 'converting' | 'completed' | 'error';
  progress: number;
  audioUrl?: string;
  durationInSeconds?: number;
  textChunks?: string[];
  extractedText?: string;
  chapters?: BookChapter[];
  activeChapterId?: string;
  listeningMode?: ListeningMode;
  isStreamingBackground?: boolean;
  backgroundStatus?: string;
  totalExpectedChapters?: number;
  createdAt: string;
  // Open the studio straight on this panel (from the dashboard's tools page)
  initialPanel?: 'summary' | 'key_points';
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  country: string;
  avatar: string;
  comment: string;
  rating: number;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'voices' | 'pricing' | 'technical';
}
