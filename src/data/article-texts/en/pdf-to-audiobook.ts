// "How to Turn an Arabic PDF into an Audiobook" (metadata in ../../articlesEn.ts)
import type { ArticleText } from '../../articles';

const text: ArticleText = {
  sections: [
    {
      heading: 'Why listen to Arabic books?',
      paragraphs: [
        'Many of us keep dozens of Arabic books as PDFs on our phones and laptops, bought or downloaded with every intention of reading them. Reading, though, needs a quiet hour and your eyes on a screen, and that is hard to find in a busy day.',
        'Listening fits into the time that would otherwise be lost: the commute, a walk, the gym, housework, or the minutes before sleep. The catch is that only a small share of Arabic books exist as audiobooks. The practical answer is to turn the PDFs you already have into audio yourself.',
        'This guide walks through it step by step and answers the questions everyone asks the first time: what about scanned books, how do I pick a voice, and how do I get correct Arabic pronunciation?',
      ],
    },
    {
      heading: 'First: is your PDF text or scanned?',
      paragraphs: [
        'There are two kinds of PDF. A text PDF was produced by a word processor, so you can select and copy its words; it converts to audio directly and very accurately.',
        'A scanned PDF is a set of photos of printed pages, so the words cannot be selected. It needs an extra step called optical character recognition, where AI reads the page images and extracts the text.',
        'To check, open the file and try to select a line. If the text highlights, it is a text PDF; if the whole page highlights like an image, it is scanned. Both work: the steps below cover each.',
      ],
    },
    {
      heading: 'Steps to turn an Arabic PDF into audio',
      paragraphs: ['Here is how it works on Hakawati AI, which is built for Arabic, and you can start free:'],
      steps: [
        'Open the [converter](/en) and create a free account to get thirty free minutes, no card needed.',
        'Upload the book. PDF and ePub files are supported, and the text is extracted automatically.',
        'Review the extracted text. Page numbers, running headers and links are removed, and the book is split into chapters based on its headings.',
        'If the text looks garbled or empty, the book is probably scanned: press the deep scan button and AI will read the page images.',
        'Choose what you want to hear: the whole book, one chapter, a short summary or just the key points.',
        'Pick a voice and a dialect, and listen to a short sample before deciding.',
        'Press convert and start listening. The site remembers where you stopped so you can pick up later.',
      ],
    },
    {
      heading: 'Choosing a voice and dialect',
      paragraphs: [
        'The narrator makes or breaks a listening experience. There are more than eighty voices in formal Arabic and twenty-one dialects, so how do you choose?',
        'Thought, history and religious books suit formal Arabic in a calm, clear voice. Novels and stories suit a warm narrator who tells a story well. For lighter content or a local audience, a familiar dialect such as [Egyptian](/en/egyptian-arabic-text-to-speech) or [Saudi](/en/saudi-arabic-text-to-speech) can feel closer to home.',
        'Do not choose by name alone: listen to the sample of each candidate, and try two or three on the first page of your book.',
      ],
    },
    {
      heading: 'Tips for more accurate Arabic pronunciation',
      paragraphs: [
        'Modern voices understand context and pronounce most words correctly, but a few details make a clear difference.',
        'First, short vowels settle ambiguous words. A word like علم can be read several ways, and adding its tashkeel fixes the meaning. You only need to vowel the words that could be misread, not the whole text.',
        'Second, punctuation creates rhythm. A comma is a short pause, a full stop a longer one, and a question mark changes the tone. Very long sentences without punctuation are tiring to listen to, so split them where you can.',
        'Third, watch numbers and symbols. Numbers, percentages and abbreviations may be read in unexpected ways, so write important ones out in words. Finally, choose a comfortable speed: many listeners speed up for non-fiction and slow down for novels.',
      ],
    },
    {
      heading: 'Getting more out of an audiobook',
      paragraphs: [
        'Listen chapter by chapter, and after each one ask yourself what its main idea was. Use the chapter summary and key points to review.',
        'If something is unclear, you can ask the book itself a question and get an answer drawn from its content. And if you want ready-made listening before your own books, try the free [audio book summaries](/en/book-summaries).',
        'Give listening a fixed slot in your day, such as your commute or an evening walk. Twenty minutes a day adds up to a medium-sized book roughly every two weeks.',
      ],
    },
  ],
  faqs: [
    { question: 'Is converting an Arabic PDF to audio free?', answer: 'You get thirty free minutes when you sign up to Hakawati AI, no card needed. After that you can subscribe to a monthly plan if you want to listen more.' },
    { question: 'Can a scanned Arabic PDF be turned into audio?', answer: 'Yes. Use the deep scan: AI reads the page images, extracts the text and turns it into audio. Accuracy depends on how clear the scans are.' },
    { question: 'Can the book be read in a Saudi or Egyptian accent?', answer: 'Yes. You can choose formal Arabic or one of twenty-one Arabic dialects, including Saudi, Egyptian, Moroccan, Levantine, Iraqi and Gulf.' },
    { question: 'Can I convert just one chapter?', answer: 'Yes. After uploading, the chapter list appears and you can pick one chapter, or ask for a summary or the key points instead of the full text.' },
    { question: 'Can I download the audiobook and listen offline?', answer: 'Yes. Subscribers can download a chapter or the whole book as an MP3 file and listen on any device without a connection.' },
  ],
};

export default text;
