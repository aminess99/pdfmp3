// English versions of the SEO landing pages, keyed by the Arabic page's slug. Served at
// /en/<slug> and paired with the Arabic page through hreflang. Written for an English
// reader (Arabic learners, the diaspora, businesses addressing Arab audiences), not
// translated line by line.
import type { LandingPageEn } from './landingPages';
import { VOICE_COUNT, DIALECT_COUNT } from './voices';

const FREE = 'Every new account gets 30 free minutes, no card needed.';

export const LANDING_EN: Record<string, LandingPageEn> = {
  'تحويل-النص-الى-صوت': {
    slug: 'arabic-text-to-speech',
    title: 'Arabic Text to Speech with Natural AI Voices | Hakawati AI',
    description: `Turn Arabic text into natural speech with AI: paste your text, pick a voice and a dialect, listen instantly or download the audio. ${VOICE_COUNT} voices in ${DIALECT_COUNT} Arabic dialects. Try it free.`,
    keywords: 'arabic text to speech, text to speech arabic, text to speech in arabic, arabic tts, arabic ai voice, arabic voice generator, text to arabic speech',
    badge: 'Arabic text to speech',
    h1: 'Arabic Text to Speech with Natural AI Voices',
    subtitle: `Paste any Arabic text and hear it read aloud in seconds by ${VOICE_COUNT} AI narrators across ${DIALECT_COUNT} Arabic dialects, then download it as an audio file.`,
    linkLabel: 'Arabic text to speech',
    sections: [
      {
        heading: 'Arabic text to speech in three steps',
        paragraphs: [
          'Paste your Arabic text, choose a voice and a dialect, and press convert. A few seconds later you can listen in the browser or download the file to use in a video, a presentation or a lesson.',
          `${FREE} You can try every voice and dialect before deciding which one fits your project.`,
        ],
      },
      {
        heading: 'Natural voices, not robotic ones',
        paragraphs: [
          'Older Arabic text-to-speech engines sounded flat and stumbled over Arabic letters such as ض, ع and ق. Hakawati AI uses modern neural voices that follow the rhythm of a sentence, pause at commas, and rise and fall with the meaning.',
          'Arabic is usually written without short vowels, so a good reader has to understand a sentence to pronounce its word endings correctly. The voices here were chosen and tuned for Arabic first, rather than added as one language among many.',
        ],
      },
      {
        heading: 'Modern Standard Arabic and real dialects',
        paragraphs: [
          'Most global tools offer one or two Modern Standard Arabic voices. Here you get four voices for each dialect, from Saudi, Emirati and Kuwaiti to Egyptian, Moroccan, Lebanese, Palestinian, Iraqi, Yemeni and Libyan, alongside formal Arabic for books, lessons and news.',
          'Use formal Arabic when your audience spans several countries, and a local dialect when you speak to one market: an ad for shoppers in Riyadh, a reel for viewers in Cairo, or a lesson for learners of Moroccan Darija.',
        ],
      },
      {
        heading: 'Tips for more accurate pronunciation',
        paragraphs: [
          'Use punctuation: commas and full stops tell the voice where to breathe. Add short vowels (tashkeel) to the few words whose meaning depends on them, and write important numbers out in words.',
          'Remove things that are not meant to be read aloud, such as page numbers, links and footnote marks. When you upload a whole book, Hakawati AI removes most of them for you.',
        ],
      },
      {
        heading: 'From a short paragraph to a whole book',
        paragraphs: [
          'The same voices read anything from one sentence to a full book. Upload an Arabic PDF or ePub, including scanned books, and listen to it chapter by chapter, or ask for a ten-minute summary instead.',
        ],
      },
    ],
    faqs: [
      { question: 'Is there a free Arabic text to speech?', answer: `Yes. ${FREE} You can listen in the browser and download the audio.` },
      { question: 'Which Arabic dialects are supported?', answer: `${DIALECT_COUNT} dialects, including Saudi, Gulf, Egyptian, Moroccan, Lebanese, Palestinian, Iraqi, Yemeni and Libyan Arabic, plus Modern Standard Arabic, with four voices each.` },
      { question: 'Can I use the audio in videos and ads?', answer: 'Yes. Download the file as MP3 or WAV and add it to any video editor. The voices are synthetic and do not imitate real people.' },
      { question: 'Does it read Arabic without diacritics (tashkeel)?', answer: 'Yes. The voices read normal unvowelled Arabic. Adding tashkeel to an ambiguous word helps when you need one exact reading.' },
      { question: 'Can it read a whole Arabic book?', answer: 'Yes. Upload a PDF or ePub, including scanned books, and listen chapter by chapter or download the audio.' },
    ],
  },

  'تحويل-النص-الى-صوت-سعودي': {
    slug: 'saudi-arabic-text-to-speech',
    title: 'Saudi Arabic Text to Speech, AI Voice-over | Hakawati AI',
    description: 'Turn text into speech with natural Saudi Arabic AI voices, male and female, for voice-overs, ads, books and social media. Listen, download the audio and try it free.',
    keywords: 'saudi arabic text to speech, saudi arabic ai voice, saudi voice over, khaleeji text to speech, gulf arabic tts, saudi accent ai voice',
    badge: 'Saudi Arabic 🇸🇦',
    h1: 'Saudi Arabic Text to Speech',
    subtitle: 'Natural Saudi and Gulf Arabic narrators powered by AI, for voice-overs, ads, books and social media content.',
    linkLabel: 'Saudi Arabic text to speech',
    sections: [
      {
        heading: 'Saudi voices ready for your voice-over',
        paragraphs: [
          'Choose between four Saudi voices: Faisal and Abdullah, two male voices with a deep and confident tone suited to business, history and reports, and Noura and Lama, two clear and lively female voices for stories, marketing and short videos. Four more voices speak with a Hijazi accent.',
          'Listen to each sample before converting, then paste your text and press convert.',
        ],
      },
      {
        heading: 'Getting the most authentic Saudi accent',
        paragraphs: [
          'The voice follows what you write. Write the way people speak in Saudi Arabia, with words such as وش and أبغى, and you will hear full Saudi dialect. Formal Arabic text is read with a Saudi tone while the words stay formal.',
          'For ads, TikTok and Snapchat, write sentences exactly as they are spoken. For books, articles and lessons, formal Arabic is clearer for every listener.',
        ],
      },
      {
        heading: 'Where a Saudi voice works best',
        paragraphs: [
          'Voice-overs for YouTube, TikTok and Snapchat, ads for local shops and restaurants, audiobooks, and courses aimed at Saudi learners. It also suits content for the wider Gulf, and the site has Emirati, Kuwaiti, Qatari and Omani voices too.',
          'Businesses outside the region use it to localize product videos and announcements for the Saudi market without hiring a studio for every update.',
        ],
      },
    ],
    faqs: [
      { question: 'Are there male and female Saudi voices?', answer: 'Yes: Faisal and Abdullah (male), Noura and Lama (female), plus four Hijazi voices, each with a sample you can hear first.' },
      { question: 'Can I use the Saudi voice in my videos?', answer: 'Yes. Download the audio as MP3 or WAV and add it to any video editor.' },
      { question: 'Can a whole book be read in a Saudi voice?', answer: 'Yes. Upload a PDF or ePub, choose a Saudi voice, and the book is split into chapters you can play or download.' },
      { question: 'Is it free to try?', answer: FREE },
    ],
  },

  'تحويل-النص-الى-صوت-مصري': {
    slug: 'egyptian-arabic-text-to-speech',
    title: 'Egyptian Arabic Text to Speech, Natural AI Voices | Hakawati AI',
    description: 'Hear your text in a warm, natural Egyptian Arabic voice. Male and female AI narrators for videos, ads, lessons and audiobooks, with a direct audio download. Try it free.',
    keywords: 'egyptian arabic text to speech, egyptian ai voice, egyptian accent text to speech, masri tts, egyptian voice over, egyptian arabic voice generator',
    badge: 'Egyptian Arabic 🇪🇬',
    h1: 'Egyptian Arabic Text to Speech',
    subtitle: 'Type your text and hear it in a natural, warm Egyptian voice, with male and female narrators and a direct audio download.',
    linkLabel: 'Egyptian Arabic text to speech',
    sections: [
      {
        heading: 'An Egyptian voice your audience recognizes',
        paragraphs: [
          'Egyptian Arabic is the most widely understood dialect in the Arab world, thanks to decades of Egyptian film, music and television. A voice-over in Egyptian feels familiar to viewers from Morocco to the Gulf.',
          'Choose from four Egyptian voices: Karim and Omar (male), Mariam and Yasmine (female), each with its own tone, and hear a sample before you convert.',
        ],
      },
      {
        heading: 'Write it the way it is spoken',
        paragraphs: [
          'Write words as Egyptians say them, such as إزيك, عايز, دلوقتي and كده, and you will hear full Egyptian dialect. Formal Arabic text is read with a light Egyptian accent and suits books and articles.',
          'Try one short sentence first. If you want a stronger accent, add more everyday Egyptian words.',
        ],
      },
      {
        heading: 'Popular uses',
        paragraphs: [
          'Comedy and storytelling videos, ads for the Egyptian market, explainer videos, children’s stories and lessons. Learners of Egyptian Arabic also use it to hear how written phrases sound in real speech.',
          'The same voices can read a whole Arabic book from a PDF, chapter by chapter.',
        ],
      },
    ],
    faqs: [
      { question: 'Can I convert text to an Egyptian voice for free?', answer: FREE },
      { question: 'How many Egyptian voices are there?', answer: 'Four: Karim and Omar (male), Mariam and Yasmine (female).' },
      { question: 'Will formal Arabic sound Egyptian?', answer: 'It is read with a light Egyptian accent. For full dialect, write the text in colloquial Egyptian.' },
      { question: 'Can I download the audio?', answer: 'Yes, as an MP3 or WAV file that works in any video editor or player.' },
    ],
  },

  'تحويل-النص-الى-صوت-مغربي': {
    slug: 'moroccan-darija-text-to-speech',
    title: 'Moroccan Darija Text to Speech, AI Voices | Hakawati AI',
    description: 'Hear your text in natural Moroccan Darija with AI voices, male and female, for videos, ads, lessons and audiobooks. Download the audio and try it free.',
    keywords: 'moroccan darija text to speech, darija tts, moroccan arabic ai voice, moroccan voice over, darija voice generator, moroccan arabic text to speech',
    badge: 'Moroccan Darija 🇲🇦',
    h1: 'Moroccan Darija Text to Speech',
    subtitle: 'Warm, authentic Moroccan voices powered by AI for your texts and books, with male and female narrators and a direct audio download.',
    linkLabel: 'Moroccan Darija text to speech',
    sections: [
      {
        heading: 'Voices that actually speak Darija',
        paragraphs: [
          'Darija is very different from formal Arabic, and most text-to-speech tools simply read it as if it were formal Arabic. Hakawati AI has four voices with Darija pronunciation: Amine and Younes (male), Salma and Najat (female).',
          'Each voice has a sample, so you can pick the tone that suits your content before converting.',
        ],
      },
      {
        heading: 'How to get natural Darija',
        paragraphs: [
          'Write the text in Darija as it is spoken, with words such as دابا, بغيت, بزاف, واخا and مزيان, and you will get pronunciation any Moroccan listener recognizes.',
          'Formal Arabic text is read with a Moroccan accent, which works well for books and news aimed at a Moroccan audience.',
        ],
      },
      {
        heading: 'Where it helps',
        paragraphs: [
          'Ads and videos for the Moroccan market, content for Moroccans abroad, short educational clips, and Darija learners who want to hear real pronunciation.',
        ],
      },
    ],
    faqs: [
      { question: 'Does it really support Moroccan Darija?', answer: 'Yes. Four Moroccan voices with Darija pronunciation: Amine, Younes, Salma and Najat.' },
      { question: 'Can I download the Darija audio?', answer: 'Yes, as MP3 or WAV, ready for any editor.' },
      { question: 'Is there a free trial?', answer: FREE },
      { question: 'Can it read a whole book in a Moroccan voice?', answer: 'Yes. Upload a PDF or ePub and choose a Moroccan voice; the book is split into chapters.' },
    ],
  },

  'تحويل-النص-الى-صوت-لبناني': {
    slug: 'lebanese-arabic-text-to-speech',
    title: 'Lebanese Arabic Text to Speech, AI Voices | Hakawati AI',
    description: 'Type your text and hear it in a natural Lebanese Arabic voice. Two male and two female AI narrators in different styles, with an audio download. Try it free.',
    keywords: 'lebanese arabic text to speech, lebanese ai voice, levantine arabic tts, lebanese voice over, lebanese accent text to speech',
    badge: 'Lebanese Arabic 🇱🇧',
    h1: 'Lebanese Arabic Text to Speech',
    subtitle: 'Hear your text in natural Lebanese Arabic, with two male and two female narrators in different styles, and download it as audio.',
    linkLabel: 'Lebanese Arabic text to speech',
    sections: [
      {
        heading: 'Four Lebanese voices for every use',
        paragraphs: [
          'Rami, Jad, Nadine and Maya speak with Lebanese pronunciation, from calm and warm to lively and upbeat. Listen to the samples and choose the one that fits your brand or story.',
        ],
      },
      {
        heading: 'Writing for a natural Lebanese accent',
        paragraphs: [
          'Write sentences the way they are said in Lebanon, with words such as كيفكن, شو, هلق, كتير and بدي, and you will hear full Lebanese dialect. Formal Arabic is read with a light Lebanese accent, which suits books and articles.',
        ],
      },
      {
        heading: 'Where it works well',
        paragraphs: [
          'Lifestyle and food content, ads for the Lebanese market, podcasts and stories, and learners of Levantine Arabic who want to hear everyday phrases spoken naturally.',
        ],
      },
    ],
    faqs: [
      { question: 'Does it really speak Lebanese Arabic?', answer: 'Yes. Four Lebanese voices (Rami, Jad, Nadine and Maya) with Lebanese pronunciation, each with a sample.' },
      { question: 'Can I download the audio?', answer: 'Yes, as MP3 or WAV.' },
      { question: 'Is it free to try?', answer: FREE },
    ],
  },

  'تحويل-النص-الى-صوت-فلسطيني': {
    slug: 'palestinian-arabic-text-to-speech',
    title: 'Palestinian Arabic Text to Speech, AI Voices | Hakawati AI',
    description: 'Hear your texts and books in a warm Palestinian Arabic voice, with two male and two female AI narrators, and download the audio. Try it free.',
    keywords: 'palestinian arabic text to speech, palestinian ai voice, levantine arabic text to speech, palestinian accent voice, palestinian voice over',
    badge: 'Palestinian Arabic 🇵🇸',
    h1: 'Palestinian Arabic Text to Speech',
    subtitle: 'Hear your texts and books in a warm Palestinian voice, with two male and two female narrators, and download them as audio.',
    linkLabel: 'Palestinian Arabic text to speech',
    sections: [
      {
        heading: 'Four Palestinian voices',
        paragraphs: [
          'Ahmad and Yazan (male) and Lina and Heba (female) read with Palestinian pronunciation, each in a different speaking style. Hear the samples and choose the right one for your content.',
        ],
      },
      {
        heading: 'Tips for natural Palestinian speech',
        paragraphs: [
          'Write words as they are spoken, such as كيفكم, بدي, اشي, هسا and كثير, to hear full Palestinian dialect. Formal Arabic is read with a light Palestinian accent and suits books and articles.',
        ],
      },
      {
        heading: 'Uses',
        paragraphs: [
          'Stories, family and heritage content, lessons, community announcements, and learners of Levantine Arabic who want to practise listening.',
        ],
      },
    ],
    faqs: [
      { question: 'How many Palestinian voices are available?', answer: 'Four: Ahmad and Yazan (male), Lina and Heba (female).' },
      { question: 'Can I download the audio?', answer: 'Yes, as MP3 or WAV.' },
      { question: 'Is it free to try?', answer: FREE },
    ],
  },

  'تحويل-النص-الى-صوت-ليبي': {
    slug: 'libyan-arabic-text-to-speech',
    title: 'Libyan Arabic Text to Speech, AI Voices | Hakawati AI',
    description: 'One of the few tools that reads in Libyan Arabic: four natural AI voices and a direct audio download, for videos, ads, lessons and books. Try it free.',
    keywords: 'libyan arabic text to speech, libyan ai voice, libyan accent voice, libyan dialect tts, libyan voice over',
    badge: 'Libyan Arabic 🇱🇾',
    h1: 'Libyan Arabic Text to Speech',
    subtitle: 'One of the few tools that reads in Libyan Arabic: four natural voices and a direct audio download.',
    linkLabel: 'Libyan Arabic text to speech',
    sections: [
      {
        heading: 'Four Libyan voices',
        paragraphs: [
          'Mustafa, Anas, Marwa and Khadija read with Libyan pronunciation. Libyan Arabic is rarely supported by text-to-speech tools, so these voices are a practical option for content aimed at Libyan audiences.',
        ],
      },
      {
        heading: 'Writing for a Libyan accent',
        paragraphs: [
          'Write Libyan words as they are spoken, such as شن الجو, هلبا, توا and باهي, to hear natural Libyan speech. Formal Arabic is read with a Libyan accent.',
        ],
      },
      {
        heading: 'Uses',
        paragraphs: [
          'Local ads and announcements, social media videos, lessons, and audiobooks for listeners who prefer their own dialect.',
        ],
      },
    ],
    faqs: [
      { question: 'Does it support Libyan Arabic?', answer: 'Yes. Four Libyan voices (Mustafa, Anas, Marwa and Khadija), each with a sample.' },
      { question: 'Can I download the audio?', answer: 'Yes, as MP3 or WAV.' },
      { question: 'Is it free to try?', answer: FREE },
    ],
  },

  'تحويل-النص-الى-صوت-يمني': {
    slug: 'yemeni-arabic-text-to-speech',
    title: 'Yemeni Arabic Text to Speech, AI Voices | Hakawati AI',
    description: 'Hear your texts and books in Yemeni Arabic with two male and two female AI narrators, and download the audio. Try it free.',
    keywords: 'yemeni arabic text to speech, yemeni ai voice, yemeni accent voice, yemeni dialect tts, yemeni voice over',
    badge: 'Yemeni Arabic 🇾🇪',
    h1: 'Yemeni Arabic Text to Speech',
    subtitle: 'Hear your texts and books in Yemeni Arabic, with two male and two female narrators, and download them as audio.',
    linkLabel: 'Yemeni Arabic text to speech',
    sections: [
      {
        heading: 'Four Yemeni voices',
        paragraphs: [
          'Akram, Saleh, Arwa and Balqis read with Yemeni pronunciation. Hear each sample and choose the voice that suits your content.',
        ],
      },
      {
        heading: 'Writing for a Yemeni accent',
        paragraphs: [
          'Write Yemeni words as they are spoken, such as شنحكي, شوية, معانا and سوا, to hear natural Yemeni speech. Formal Arabic is read with a Yemeni accent and suits books and articles.',
        ],
      },
      {
        heading: 'Uses',
        paragraphs: [
          'Community content, local announcements, lessons and audiobooks, including for Yemenis abroad who want to hear their own dialect.',
        ],
      },
    ],
    faqs: [
      { question: 'Does it support Yemeni Arabic?', answer: 'Yes. Four Yemeni voices (Akram, Saleh, Arwa and Balqis), each with a sample.' },
      { question: 'Can I download the audio?', answer: 'Yes, as MP3 or WAV.' },
      { question: 'Is it free to try?', answer: FREE },
    ],
  },

  'كتب-صوتية-مجانية': {
    slug: 'free-arabic-audiobooks-from-pdf',
    title: 'Free Arabic Audiobooks from Your PDFs | Hakawati AI',
    description: 'Turn your Arabic PDF and ePub books, including scanned ones, into audiobooks read by natural AI voices in formal Arabic or your dialect. Listen chapter by chapter. Try it free.',
    keywords: 'arabic audiobooks, free arabic audiobooks, arabic pdf to audiobook, arabic pdf to audio, listen to arabic books, arabic book reader',
    badge: 'Arabic audiobooks',
    h1: 'Free Arabic Audiobooks from Your PDFs',
    subtitle: 'Turn the Arabic books you already have into audiobooks, read by natural voices in formal Arabic or your dialect, chapter by chapter.',
    linkLabel: 'Free Arabic audiobooks',
    sections: [
      {
        heading: 'Build your own Arabic audio library',
        paragraphs: [
          'Only a small share of Arabic books exist as audiobooks. Hakawati AI lets you turn the PDF and ePub books you already own into audio: upload the file, choose a voice, and listen on your commute, at the gym or before sleep.',
          'The book is split into chapters automatically, and the reader skips what is not meant to be read aloud, such as page numbers, headers, footnote marks and publisher pages.',
        ],
      },
      {
        heading: 'Scanned books work too',
        paragraphs: [
          'Many Arabic books circulate as scanned images rather than text. The site reads scanned pages with AI and turns them into clean text before narrating them, so older and out-of-print books can be heard as well.',
        ],
      },
      {
        heading: 'Free audio book summaries',
        paragraphs: [
          'Short on time? The site also offers free fifteen-minute audio summaries of well-known books in clear formal Arabic, which you can play, read or download.',
        ],
      },
      {
        heading: 'Pick the right voice for each book',
        paragraphs: [
          'Formal Arabic suits thought, history and religious books; a warm storytelling voice suits novels; and a local dialect makes lighter content feel closer to home.',
        ],
      },
    ],
    faqs: [
      { question: 'Is it free?', answer: FREE },
      { question: 'Can it read scanned Arabic PDFs?', answer: 'Yes. Scanned pages are read with AI and turned into text before they are narrated.' },
      { question: 'Can I listen chapter by chapter?', answer: 'Yes. The book is split into chapters automatically, and the site remembers where you stopped.' },
      { question: 'Can I download the audiobook?', answer: 'Yes, a chapter or the whole book, as audio files.' },
      { question: 'Can I convert just one chapter?', answer: 'Yes. After uploading, choose the chapter you want from the list.' },
    ],
  },
};
