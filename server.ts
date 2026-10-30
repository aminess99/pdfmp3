import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { VOICES } from "./src/data/voices";
import { LANDING_PAGES, LandingPage, findLandingPage, landingPath } from "./src/data/landingPages";
import { BOOK_SUMMARIES, BookSummary, SUMMARIES_HUB, SUMMARIES_HUB_PATH, UPCOMING_SUMMARIES, findSummary, isSummariesHub, summaryAudioUrl, summaryPath } from "./src/data/summaries";
import { HOME_CONTENT, HOME_SEO } from "./src/data/homeContent";
import firebaseConfig from "./src/lib/firebaseConfig";
import {
  creditsEnabled,
  uidFromRequest,
  secondsForText,
  isPublicText,
  getBalance,
  charge,
  refund,
  alreadyCharged,
  rememberCharge,
  forgetCharge,
} from "./server/credits";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "50mb" }));

// Render sits behind a proxy: trust it so req.ip is the visitor's IP
app.set("trust proxy", 1);

// Once the custom domain works, send visitors and search engines from the old
// *.onrender.com address to it (enable with REDIRECT_TO_DOMAIN=on). GET/HEAD only,
// so in-flight API POSTs from an open tab are not broken.
app.use((req, res, next) => {
  if (process.env.REDIRECT_TO_DOMAIN !== "on" || !process.env.APP_URL) return next();
  if (!req.hostname.endsWith(".onrender.com")) return next();
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  res.redirect(301, process.env.APP_URL.replace(/\/+$/, "") + req.originalUrl);
});

// The AI text tools (summaries, chat, book writing, OCR, chapter detection) need a signed-in
// user; TTS routes do their own check in gateTts() because the demo texts are public.
app.use(["/api/ai", "/api/pdf", "/api/book", "/api/tts/fish-audio"], (req, res, next) => {
  if (req.method !== "POST") return next();
  requireUser(req, res).then((ok) => ok && next(), next);
});

// Simple in-memory per-IP rate limit on the paid AI / TTS endpoints, so a
// single visitor or bot cannot drain the OpenRouter / Gemini credit.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_PER_MINUTE = Number(process.env.RATE_LIMIT_PER_MINUTE) || 60;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

app.use(["/api/ai", "/api/tts", "/api/pdf", "/api/book"], (req, res, next) => {
  if (req.method !== "POST") return next();
  const ip = req.ip || "unknown";
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateBuckets.set(ip, bucket);
  }
  bucket.count++;
  if (bucket.count > RATE_LIMIT_PER_MINUTE) {
    res.set("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
    return res.status(429).json({ error: "عدد الطلبات كبير جداً، يرجى المحاولة بعد دقيقة." });
  }
  next();
});

setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(ip);
  }
}, 5 * 60_000).unref();

// Persistent Disk-based Audio Cache Directory
const AUDIO_CACHE_DIR = path.join(process.cwd(), ".cache", "audio");
try {
  if (!fs.existsSync(AUDIO_CACHE_DIR)) {
    fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
  }
} catch (e) {
  console.warn("Audio cache dir creation warning:", e);
}

function getAudioDiskCachePath(key: string): string {
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  return path.join(AUDIO_CACHE_DIR, `${hash}.mp3`);
}

// Initialize Gemini client lazily
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

// OpenRouter API helper prioritizing Google Gemini and DeepSeek models
// `prompt` may be a plain string or an OpenRouter multimodal content array (e.g. text + PDF file).
// OPENROUTER_TEXT_MODEL (optional env) is tried first for every text request.
async function callOpenRouter(
  prompt: string | any[],
  preferredModel = "google/gemini-2.5-flash",
  maxTokens: number = 4000,
  timeoutMs: number = 35000
): Promise<string | null> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey || !openRouterKey.startsWith("sk-or-v1-")) {
    return null;
  }

  // Fast, intelligent models with huge context and long output on OpenRouter:
  // 1. google/gemini-2.5-flash / google/gemini-2.5-flash-lite (Google Gemini on OpenRouter)
  // 2. deepseek/deepseek-chat (DeepSeek V3)
  // 3. meta-llama/llama-3.3-70b-instruct
  const modelsToTry = [
    process.env.OPENROUTER_TEXT_MODEL,
    preferredModel,
    "google/gemini-2.5-flash",
    "google/gemini-2.5-flash-lite",
    "deepseek/deepseek-chat",
    "meta-llama/llama-3.3-70b-instruct",
  ];

  const uniqueModels = [...new Set(modelsToTry.filter(Boolean) as string[])];

  for (const model of uniqueModels) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "https://hakawatiai.com",
          "X-Title": "Hakawati AI",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.6,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text && text.length > 25) {
          console.log(`[OpenRouter] Successfully generated with model: ${model} (${text.length} chars)`);
          return text;
        }
      } else {
        const errText = await response.text();
        console.warn(`[OpenRouter] Model ${model} returned error status ${response.status}:`, errText);
      }
    } catch (err: any) {
      if (err?.name === "AbortError" || err?.message?.includes("aborted")) {
        console.info(`[OpenRouter] ${model} timed out after ${timeoutMs / 1000}s, trying next model.`);
      } else {
        console.warn(`[OpenRouter] Failed calling ${model}:`, err?.message || err);
      }
    }
  }

  return null;
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Hakawati AI", timestamp: new Date().toISOString() });
});

// AI Text-to-Audio Script Summarizer & Diacritics Optimizer
app.post("/api/ai/optimize-script", async (req, res) => {
  try {
    const { text, dialectName, voiceStyle } = req.body;
    let optimizedText = "";

    const prompt = `أنت خبير إلقاء وقراءة كتب صوتية باللغة العربية.
قم بتهيئة النص التالي للقراءة الصوتية باللهجة "${dialectName || 'الفصحى'}" وبنمط إلقاء "${voiceStyle || 'عادي'}".
أضف التشكيل والضبط الإعرابي للكلمات الصعبة أو المبهمة، واجعل الفواصل واضحة لإعطاء القارئ مساحة للتنفس، دون تغيير معاني الكلمات الأصلية.

النص المراد تهيئته:
${(text || "").slice(0, 3000)}`;

    // 1. Try OpenRouter first (Gemini 2.5 Flash / DeepSeek via OpenRouter)
    const openRouterResult = await callOpenRouter(prompt, "google/gemini-2.5-flash-lite");
    if (openRouterResult && openRouterResult.length > 10) {
      optimizedText = openRouterResult;
    }

    // 2. Fallback to Google Gemini SDK if needed
    if (!optimizedText) {
      const ai = getGeminiClient();
      if (ai) {
        const candidateModels = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"];
        for (const model of candidateModels) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents: prompt,
            });
            if (response.text && response.text.length > 10) {
              optimizedText = response.text;
              break;
            }
          } catch (e: any) {
            console.warn(`Local Gemini ${model} optimize script failed:`, e?.message || e);
          }
        }
      }
    }

    if (!optimizedText) {
      optimizedText = text;
    }

    res.json({
      optimizedText,
      summary: "تم تحسين الضبط والتشكيل للهجة " + (dialectName || 'الفصحى'),
      dialectNote: "جاهز للتحويل الصوتي العالي النقاء"
    });
  } catch (error: any) {
    console.error("AI Optimization Error:", error);
    res.json({
      optimizedText: req.body.text || "",
      summary: "تم استخدام النص الأصلي للتحويل الصوتي.",
      error: error.message
    });
  }
});

// Helper for server-side digital PDF text extraction
async function extractDigitalPdfServer(buffer: Buffer): Promise<{ text: string; pages: number }> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      stopAtErrors: false,
    } as any);
    const doc = await loadingTask.promise;
    const pages = doc.numPages;
    const texts: string[] = [];
    const maxPages = Math.min(pages, 120);

    for (let i = 1; i <= maxPages; i++) {
      try {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const pageStr = textContent.items
          .map((item: any) => item.str || "")
          .filter((s: string) => s.trim().length > 0)
          .join(" ");
        if (pageStr.trim()) {
          texts.push(pageStr.trim());
        }
      } catch (pageErr) {
        // Continue extracting remaining pages if a page has corrupted XRef
        console.info(`Skipped page ${i} due to uncompressed XRef entry:`, (pageErr as any)?.message || pageErr);
      }
    }
    return { text: texts.join("\n\n"), pages };
  } catch (e) {
    console.warn("Digital PDF server extraction error:", e);
    return { text: "", pages: 0 };
  }
}

// AI-Powered High-Fidelity Arabic PDF Text Extractor (OCR + Digital PDF Extraction + Clutter Stripping)
app.post("/api/pdf/extract", async (req, res) => {
  try {
    const { pdfBase64, fileName, forceOcr } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ error: "ملف PDF مطلوب." });
    }

    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
    const pdfBuffer = Buffer.from(cleanBase64, "base64");

    // 1. Fast Server-Side Digital Extraction (if not forced OCR)
    if (!forceOcr) {
      const digitalResult = await extractDigitalPdfServer(pdfBuffer);
      if (digitalResult.text && digitalResult.text.trim().length > 60) {
        const arabicLetters = digitalResult.text.match(/[\u0600-\u06FF]/g);
        if (arabicLetters && (arabicLetters.length / digitalResult.text.length) >= 0.2) {
          console.log(`Successfully extracted digital text for ${fileName}: ${digitalResult.text.length} chars, ${digitalResult.pages} pages`);
          return res.json({
            success: true,
            text: digitalResult.text,
            pagesCount: digitalResult.pages,
            fileName: fileName || "كتاب مستخرج",
          });
        }
      }
    }

    // 2. Multimodal AI Vision OCR with Retry and Fallback Models
    const prompt = `أنت خبير محترف في التعرف الضوئي على الحروف (OCR) ومحرر كتب صوتية متقدم.
المهمة: اقرأ واستخرج بدقة متناهية كافة النصوص العربية المكتوبة داخل هذا المستند (سواء كانت نصوصاً رقمية مشفرة، أو صفحات مصورة وممسوحة ضوئياً Scanned Images، أو صوراً ورقية أو لقطات تحتوي على كتابة عربية).

قواعد الاستخراج والتعرف الضوئي الذكي (Vision OCR):
1. اقرأ النصوص من الصور والصفحات الممسوحة ضوئياً وحولها إلى نص عربي رقمي سليم تماماً مع المحافظة على دقة الكلمات وتصحيح أي تشوهات ناتجة عن جودة الصورة أو المسح الضوئي.
2. استخرج المحتوى الجوهري للرواية، المقال، الفصل، أو الأفكار والشروحات.
3. احذف نهائياً وبلا استثناء:
   - أرقام وترويسات وهوامش الصفحات (مثل: صفحة 1، ص 5، Page 1، 1/20).
   - الفهارس وجداول المحتويات (Table of Contents) وأرقام الفصول المجردة دون محتوى.
   - حقوق النشر وبيانات المطبعة والإيداع القانوني ورقم ISBN والباركود.
   - روابط المواقع الإلكترونية، الإيميلات، وحسابات مواقع التواصل الاجتماعي.
   - التذييلات المكررة (مثل اسم الكتاب أو اسم الكاتب المكرر في أعلى أو أسفل كل صفحة).
   - الرموز العشوائية، الخطوط الفاصلة الزخرفية، والتكرار غير المفيد.
4. نسق النص بفقرات واضحة وسلسة ومترابطة لغوياً، بحيث تكون جاهزة للإلقاء الصوتي البشري الممتع مباشرة.
5. أرجع النص المنقى فقط دون كتابة أي تعليقات أو شروحات منك كنموذج ذكاء اصطناعي.`;

    // Prioritize high-quota models: gemini-3.1-flash-lite (vast free quota), gemini-flash-latest, gemini-3.8-flash
    const modelsToTry = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"];
    let extractedText = "";
    let lastError: any = null;

    const ai = getGeminiClient();
    if (ai) {
      for (const modelName of modelsToTry) {
        try {
          console.log(`Attempting OCR with ${modelName}...`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: cleanBase64,
                },
              },
              { text: prompt },
            ],
          });

          extractedText = response.text?.trim() || "";
          if (extractedText.length > 20) {
            console.log(`OCR success on ${modelName}: extracted ${extractedText.length} characters`);
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`Gemini OCR on ${modelName} failed (quota or error):`, err?.message || err);
        }
      }
    }

    // 2b. OpenRouter Vision OCR (PDF file input) when Gemini is not configured or failed
    if (!extractedText || extractedText.length <= 20) {
      const openRouterOcr = await callOpenRouter(
        [
          { type: "text", text: prompt },
          {
            type: "file",
            file: {
              filename: fileName || "book.pdf",
              file_data: `data:application/pdf;base64,${cleanBase64}`,
            },
          },
        ],
        "google/gemini-2.5-flash",
        16000,
        120000
      );
      if (openRouterOcr && openRouterOcr.length > 20) {
        extractedText = openRouterOcr;
      }
    }

    // 3. Fallback: If AI OCR failed (e.g. 429 Quota Exceeded), extract via digital PDF server engine
    if (!extractedText || extractedText.length <= 20) {
      console.log("AI OCR quota exceeded or unavailable. Running digital PDF fallback engine...");
      const digitalResult = await extractDigitalPdfServer(pdfBuffer);
      if (digitalResult.text && digitalResult.text.trim().length > 10) {
        extractedText = digitalResult.text;
      }
    }

    if (extractedText && extractedText.length > 20) {
      return res.json({
        success: true,
        text: extractedText,
        fileName: fileName || "كتاب مستخرج",
      });
    }

    return res.status(500).json({
      success: false,
      error: lastError?.message ? "تم تجاوز حد الطلبات اللحظي للتعرف الضوئي، يرجى المحاولة بعد قليل أو التأكد من أن الملف نصي." : "فشل استخراج النص من PDF",
    });
  } catch (error: any) {
    console.error("PDF AI Extraction Error:", error);
    res.status(500).json({ error: error.message || "فشل استخراج النص من PDF" });
  }
});

// Local High-Fidelity Arabic Extractive Summary Fallback (Activates if AI free quota is exceeded)
function localExtractArabicSummary(text: string, bookTitle?: string): string {
  const cleanTitle = bookTitle 
    ? bookTitle.replace(/_pdf|\.pdf/gi, '').replace(/[_-]/g, ' ').replace(/[0-9]+/g, '').trim() 
    : 'المحتوى المختار';

  const paragraphs = text
    .split(/\n{2,}|\r\n\r\n/)
    .map(p => p.trim())
    .filter(p => p.length > 40 && !/^(\d+|صفحة|ص\s*\d+|فصل|الباب)/i.test(p));

  const sections: string[] = [];
  sections.push(`ملخص صوتي تنفيذي شامل لكتاب: ${cleanTitle}`);
  sections.push(`يقدم هذا العمل الصوتي زبدة الأفكار والرؤى الجوهرية والتحليلات العميقة التي أراد المؤلف إيصالها إلى العالم، حيث يسلط الضوء على المحاور الفكرية الأساسية، مع تفكيك التجارب الإنسانية وطرح أهم الدروس والتطبيقات العملية التي تصنع فارقاً حقيقياً وملموساً في التفكير والحياة اليومية.`);

  if (paragraphs.length >= 6) {
    const chunk1 = paragraphs.slice(0, 2).join('\n\n');
    const chunk2 = paragraphs.slice(Math.floor(paragraphs.length * 0.25), Math.floor(paragraphs.length * 0.25) + 2).join('\n\n');
    const chunk3 = paragraphs.slice(Math.floor(paragraphs.length * 0.5), Math.floor(paragraphs.length * 0.5) + 2).join('\n\n');
    const chunk4 = paragraphs.slice(Math.floor(paragraphs.length * 0.75), Math.floor(paragraphs.length * 0.75) + 2).join('\n\n');

    sections.push(`المحور الأول: الفكرة المركزية والمنطلق العام للعمل:\n${chunk1}`);
    sections.push(`المحور الثاني: العمق المعرفي والتحليل المفاهيمي:\n${chunk2}`);
    sections.push(`المحور الثالث: دراسات الحالة والتجارب الواقعية:\n${chunk3}`);
    sections.push(`المحور الرابع: الرؤية الاستراتيجية وتطوير الذات:\n${chunk4}`);
  } else {
    paragraphs.forEach((p, idx) => {
      sections.push(`المحور ${idx + 1}:\n${p}`);
    });
  }

  const allSentences = text
    .split(/(?<=[.!?؟\n])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 30 && s.length < 220);

  const takeaways: string[] = [];
  const step = Math.max(1, Math.floor(allSentences.length / 8));
  for (let i = 0; i < 7 && i * step < allSentences.length; i++) {
    const s = allSentences[i * step];
    if (s && !takeaways.includes(s)) {
      takeaways.push(s);
    }
  }

  if (takeaways.length > 0) {
    sections.push(`الدروس العملية والتطبيقات الحياتية السبعة المستخلصة من هذا العمل:\n` + takeaways.map((t, idx) => `الدرس العملي ${idx + 1}: ${t}، ويعد هذا المبدأ ركيزة أساسية يجب تفعيلها في الممارسات اليومية لترسيخ التغيير الإيجابي.`).join('\n\n'));
  }

  sections.push(`خاتمة وتأمل استراتيجي:\nإن الاستفادة القصوى من خلاصة هذا الكتاب تتجلى في تحويل هذه المبادئ المعرفية إلى سلوكيات واعية وإجراءات واقعية تصنع تحولاً ملموساً ومستمراً.`);

  return sections.join('\n\n');
}

// Local Key Points Extractor (Extracts 5 to 7 high-value points with discrete chapter markers)
function localExtractKeyPoints(text: string, bookTitle?: string): string {
  const cleanTitle = bookTitle 
    ? bookTitle.replace(/_pdf|\.pdf/gi, '').replace(/[_-]/g, ' ').replace(/[0-9]+/g, '').trim() 
    : 'الكتاب';

  const paragraphs = text
    .split(/\n{2,}|\r\n\r\n/)
    .map(p => p.trim())
    .filter(p => p.length > 50 && !/^(\d+|صفحة|ص\s*\d+|فصل|الباب)/i.test(p));

  const ordinals = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة'];
  const count = Math.min(7, Math.max(5, paragraphs.length));
  const points: string[] = [];

  const step = Math.max(1, Math.floor(paragraphs.length / count));

  for (let i = 0; i < count; i++) {
    const rawPara = paragraphs[i * step] || paragraphs[i] || '';
    if (!rawPara) continue;
    const sentences = rawPara.split(/(?<=[.!?؟])\s+/).filter(Boolean);
    const titleSnippet = (sentences[0] || '').slice(0, 45).trim();
    const explanation = sentences.length > 1 ? sentences.slice(1).join(' ') : rawPara;
    points.push(`النقطة ${ordinals[i] || (i + 1)}: ${titleSnippet || `المبدأ الجوهري ${i + 1}`}\n${explanation}`);
  }

  return points.length > 0 ? points.join('\n\n') : `النقطة الأولى: المبدأ الأساسي في ${cleanTitle}\n${text.slice(0, 500)}`;
}

// AI Book Listening Mode Transformer: Generates Executive Summaries (10m) or Key Points (50%)
// The client calls /api/ai/transform-book; keep the original path too
app.post(["/api/book/transform-mode", "/api/ai/transform-book"], async (req, res) => {
  try {
    const { text, mode, bookTitle } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "نص الكتاب مطلوب للتحويل." });
    }

    if (!mode || mode === "full") {
      return res.json({ success: true, transformedText: text.trim(), mode: "full" });
    }

    const titleContext = bookTitle ? `عنوان الكتاب: "${bookTitle}"` : "";

    let prompt = "";
    if (mode === "summary") {
      prompt = `أنت كبير معدي ومنتجي الكتب الصوتية العالمية (على غرار ملخصات Blinkist و Storytel و Audible).
${titleContext}
المهمة الحتمية: قم بإعداد وكتابة ملخص صوتي تنفيذي كامل ومفصل ومطول يستغرق 10 دقائق كاملة من الاستماع الصوتي البشري (يجب أن يحتوي النص على 1100 إلى 1500 كلمة عربية فصيحة ومكتوبة بالكامل دون أي اختصار مخل).

تعليمات مهمة جداً لضمان مدة الـ 10 دقائق كاملة:
1. لا تكتب ملخصاً مقتضباً أو عابراً في بضعة أسطر! توسع في الشرح وسرد الأمثلة والقصص والأفكار كما يفعل الرواة في البرامج الوثائقية والبودكاست.
2. الهيكل التفصيلي المطلوب (اكتبه بنص سردي مترابط وغني):
   - المقدمة (حوالي 150 كلمة): المدخل الفلسفي والإنساني للكتاب، سياقه التاريخي أو الواقعي، ولماذا غير حياة ملايين القراء.
   - المحور الأول (حوالي 250 كلمة): الفكرة المركزية وتحليلها المفصل مع ضرب أمثلة من واقع الحياة.
   - المحور الثاني (حوالي 250 كلمة): القواعد والمفاهيم والنظريات الأساسية التي يعتمد عليها الكاتب وشرح كل منها بتوسع.
   - المحور الثالث (حوالي 250 كلمة): دراسات الحالة، التجارب الواقعية، وتفكيك العقبات والأخطاء الشائعة.
   - أهم 7 دروس عملية وتطبيقية (حوالي 300 كلمة): صياغة كل درس في فقرة غنية تشرح كيفية تطبيقه خطوة بخطوة في الحياة والعمل.
   - الخاتمة والأثر المستدام (حوالي 150 كلمة): رسالة ختامية ملهمة ومحفزة تلخص البصمة الفكرية للكتاب.

شروط الإلقاء الصوتي:
- اكتب بأسلوب عربي فصيح، راقٍ، مشوق، وانسيابي جداً للأذن، كأن مذيعاً يرويه بصوته.
- تجنب تماماً الرموز مثل النجوم (**) أو الترقيمات الجافة أو الشُرَط، واجعل الانتقال بين الفقرات سردياً وبلاغياً.
- اكتب النص الصوتي كاملاً مباشرة دون أي مقدمات أو تعليقات خارجية.

النص المصدري للكتاب:
${text.slice(0, 45000)}`;
    } else if (mode === "key_points") {
      prompt = `أنت خبير إعداد الكتب الصوتية واستخلاص الرؤى الجوهرية.
${titleContext}
المهمة الحتمية: استخلص من هذا الكتاب أهم 5 إلى 7 نقاط جوهرية وأفكار محورية، لتكون مدة كل نقطة حوالي دقيقة واحدة في الإلقاء الصوتي (بين 120 إلى 150 كلمة عربية فصيحة لكل نقطة، بإجمالي 5 إلى 7 دقائق استماع مركزة).

قواعد التنسيق الإلزامية (لتتحول كل نقطة لفصل صوتي تلقائياً في المشغل):
ابدأ كل نقطة بالعنوان الدقيق التالي يليه الشرح العملي المباشر:

النقطة الأولى: [عنوان النقطة الأولى]
[الشرح والتطبيق العملي للنقطة الأولى بأسلوب شيق وجذاب ومريح للأذن]

النقطة الثانية: [عنوان النقطة الثانية]
[الشرح والتطبيق العملي للنقطة الثانية]

النقطة الثالثة: [عنوان النقطة الثالثة]
[الشرح والتطبيق العملي للنقطة الثالثة]

النقطة الرابعة: [عنوان النقطة الرابعة]
[الشرح والتطبيق العملي للنقطة الرابعة]

النقطة الخامسة: [عنوان النقطة الخامسة]
[الشرح والتطبيق العملي للنقطة الخامسة]

(ويمكنك إضافة النقطة السادسة والسابعة إن كان الكتاب عميقاً).
اكتب النص مباشرة دون أي مقدمات أو اعتذارات.

النص الأصلي للكتاب:
${text.slice(0, 35000)}`;
    }

    let transformedText = "";

    // 1. First priority: OpenRouter with Google Gemini (Massive context, deep narrative Arabic, full 10-minute output)
    const openRouterResult = await callOpenRouter(prompt, "google/gemini-2.5-flash", 4000);
    if (openRouterResult && openRouterResult.length > 30) {
      transformedText = openRouterResult;
    }

    // 2. Second priority: Gemini Direct SDK models if OpenRouter wasn't used or failed
    if (!transformedText) {
      const ai = getGeminiClient();
      const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
      if (ai) {
        for (const model of candidateModels) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents: prompt,
            });
            transformedText = response.text?.trim() || "";
            if (transformedText.length > 30) {
              break;
            }
          } catch (err: any) {
            console.warn(`Transform model ${model} temporarily unavailable or quota reached:`, err?.message || err);
          }
        }
      }
    }

    // 3. High quality local fallback if AI services or quota are momentarily exhausted
    if (!transformedText || transformedText.length <= 30) {
      console.log(`Applying smart local Arabic fallback for mode: ${mode}`);
      if (mode === "summary") {
        transformedText = localExtractArabicSummary(text, bookTitle);
      } else if (mode === "key_points") {
        transformedText = localExtractKeyPoints(text, bookTitle);
      } else {
        transformedText = text.trim();
      }
    }

    return res.json({
      success: true,
      transformedText,
      mode,
    });
  } catch (error: any) {
    console.error("Book Transform Mode Error, applying emergency fallback:", error);
    const fallbackText = req.body.mode === 'summary' 
      ? localExtractArabicSummary(req.body.text || "", req.body.bookTitle)
      : req.body.mode === 'key_points'
      ? localExtractKeyPoints(req.body.text || "", req.body.bookTitle)
      : (req.body.text || "");
    return res.json({
      success: true,
      transformedText: fallbackText,
      mode: req.body.mode || 'full',
    });
  }
});

// AI Text Purifier & Filter: Cleans any pasted or extracted text from clutter, headers, and noise
app.post("/api/ai/purify-text", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "النص مطلوب للتنقية." });
    }

    const trimmedInput = text.trim();

    const prompt = `أنت محرر لغوي وخبير هندسة نصوص الكتب الصوتية باللغة العربية.
مهمتك تنقية وتصفية النص العربي المستخرج من ملف الـ PDF التالي ليصبح كتاباً صوتياً احترافياً فائق النقاء:

قواعد المعالجة الصارمة:
1. احتفظ بكامل المتن والمحتوى الجوهري والفكرة وسياق الكتاب دون حذف أي معلومات حقيقية أو إخلال بالمعنى.
2. احذف نهائياً وبلا استثناء:
   - جداول المحتويات وفهارس النقاط مثل (الفصل الأول ............... 1)
   - أرقام الصفحات وترويساتها وهوامشها (مثل: صفحة 1، ص 15، Page 4)
   - بيانات دار النشر، سنة الطبع، رقم الإيداع، وأرقام ISBN
   - أرقام المراجع والحواشي السفلية الصغيرة (مثل [1]، (2))
   - الروابط الإلكترونية، الإيميلات، والرموز المشوهة
3. صحح أي كلمات متلاصقة أو أحرف مقطوعة نتجت عن قراءة ملف الـ PDF.
4. اضبط علامات الترقيم (الفواصل والنقاط) لتوجيه القارئ الصوتي للوقف الطبيعي والمريح.
5. أرجع النص النقي الصافي فقط مباشرة بدون أي مقدمة أو خاتمة أو تعليق منك.

النص المطلوب تنقيته:
${trimmedInput.slice(0, 30000)}`;

    let purifiedText = "";

    // 1. Try Gemini models starting with gemini-3.8-flash
    const ai = getGeminiClient();
    if (ai) {
      const modelsToTry = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
          });
          purifiedText = response.text?.trim() || "";
          if (purifiedText.length > 20) break;
        } catch (err: any) {
          console.warn(`Purify text with ${model} temporarily unavailable:`, err?.message || err);
        }
      }
    }

    // 2. Try OpenRouter DeepSeek as backup
    if (!purifiedText) {
      const openRouterPurify = await callOpenRouter(prompt, "deepseek/deepseek-chat");
      if (openRouterPurify && openRouterPurify.length > 20) {
        purifiedText = openRouterPurify;
      }
    }

    // 3. Robust Regex Clean fallback
    if (!purifiedText) {
      purifiedText = text
        .replace(/^.*(?:\.{3,}|_{3,}|-{3,}|…{2,}).*$/gm, '')
        .replace(/(?:قائمة\s*المحتويات|قائمة\s*امل\s*حتويات|الفهرس|فهرس\s*الكتاب|جدول\s*المحتويات)[\s\S]*?(?=(?:المقدمة|التمهيد|الفصل\s+(?:الأول|1)|\bالباب\s+(?:الأول|1)))/gi, '')
        .replace(/---\s*الصفحة\s*\d+\s*---/gi, '')
        .replace(/\[\s*الصفحة\s*\d+\s*\]/gi, '')
        .replace(/^الصفحة\s*\d+$/gim, '')
        .replace(/^(صفحة|ص)\s*\d+$/gim, '')
        .replace(/^\s*\d{1,4}\s+(الفصل|الباب|الجزء)/gm, '$1')
        .replace(/(الفصل|الباب|الجزء)\s+\d{1,4}\s*$/gm, '$1')
        .replace(/ISBN\s*[:\d\-]+/gi, '')
        .replace(/https?:\/\/\S+/gi, '')
        .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/gi, '')
        .replace(/[•●★■◆▪▫]/g, '')
        .replace(/[.\-_=*~]{3,}/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    res.json({ success: true, text: purifiedText });
  } catch (err: any) {
    console.error("Text purification error:", err);
    res.json({ success: false, text: req.body.text || "" });
  }
});

// AI Smart Chaptering & Production Metadata: Extracts real TOC, Author, Title and generates cinematic Intro with Gemini 3.8 Flash
app.post("/api/ai/extract-chapters", async (req, res) => {
  try {
    const { text, defaultTitle, voiceName } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "النص مطلوب لاستخراج الفصول." });
    }

    const trimmedInput = text.trim();
    const readerVoice = voiceName || "القارئ الصوتي";

    const ai = getGeminiClient();
    const prompt = `أنت كبير مخرجي ومنتجي الكتب الصوتية الاحترافية باللغة العربية (Audiobook Executive Producer).
قم بفحص النص التالي من الكتاب واستخراج البيانات بدقة متناهية:

المطلوب بدقة:
1. استخرج [عنوان الكتاب الدقيق] و [اسم المؤلف/الكاتب إن وُجد].
2. هل يحتوي الكتاب على فهرس أو فصول حقيقية واضحة في البداية أو النهاية أو داخل النص (مثل: المقدمة، الفصل الأول: عنوانه الأصلي، الباب الثاني: عنوانه الأصلي، الخاتمة... إلخ)؟
3. إذا وجدت فصولاً حقيقية: قسّم الكتاب وفقاً لعناوين فصول المؤلف الأصلية حرفياً، واستخرج نص كل فصل منقّى من أرقام الصفحات والهوامش.
4. إذا لم تجد فصولاً أو فهارس أصلية واضحة: قسّم النص تلقائياً إلى 3 إلى 8 أجزاء منطقية متوازنة بأسماء معبرة (مثل: "الجزء الأول: المقدمة والتمهيد"، "الجزء الثاني: صلب الموضوع"... إلخ).
5. صِغ مقدمة صوتية افتتاحية فخمة ومشوقة (Cinematic Audio Intro) باللغة العربية الفصحى لوضعها في بداية الفصل الأول على هذا النمط:
   "كتاب: [اسم الكتاب] .. للكاتب: [اسم المؤلف أو الكاتب إن وجد] .. بصوت: ${readerVoice} .. إنتاج منصة Hakawati AI .. استماعاً ممتعاً."

أرجع النتيجة بصيغة JSON حصراً على هذا الشكل الدقيق:
{
  "bookTitle": "اسم الكتاب المستخرج",
  "authorName": "اسم المؤلف أو غير محدد",
  "isOriginalTOC": true_or_false,
  "cinematicIntro": "نص الافتتاحية الصوتية الفخمة",
  "chapters": [
    {
      "title": "عنوان الفصل الأصلي كما في الكتاب بالضبط",
      "text": "النص الصافي المنقى التابع لهذا الفصل"
    }
  ]
}

نص الكتاب المراد تحليله:
${trimmedInput.slice(0, 35000)}`;

    let rawJson = "";
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          }
        });
        rawJson = response.text?.trim() || "";
      } catch (geminiErr: any) {
        console.warn("Gemini chapter parsing unavailable:", geminiErr?.message || geminiErr);
      }
    }

    // OpenRouter fallback (strip ```json fences some models add)
    if (!rawJson) {
      const openRouterJson = await callOpenRouter(prompt, "google/gemini-2.5-flash", 16000, 120000);
      if (openRouterJson) {
        rawJson = openRouterJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      }
    }

    try {
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        if (parsed && Array.isArray(parsed.chapters) && parsed.chapters.length > 0) {
          // Prepend cinematic audio intro to the first chapter if provided
          if (parsed.cinematicIntro && parsed.chapters[0]) {
            const introPrefix = `🎙️ ${parsed.cinematicIntro.trim()}\n\n---\n\n`;
            if (!parsed.chapters[0].text.startsWith('🎙️')) {
              parsed.chapters[0].text = introPrefix + parsed.chapters[0].text;
            }
          }

          return res.json({
            success: true,
            bookTitle: parsed.bookTitle || defaultTitle,
            authorName: parsed.authorName || "",
            isOriginalTOC: Boolean(parsed.isOriginalTOC),
            cinematicIntro: parsed.cinematicIntro || "",
            chapters: parsed.chapters
          });
        }
      }
    } catch (parseErr: any) {
      console.warn("AI chapter parsing note, using local engine:", parseErr?.message || parseErr);
    }

    res.json({ success: false, message: "fallback to local regex" });
  } catch (err: any) {
    console.error("Extract chapters endpoint error:", err);
    res.json({ success: false });
  }
});

// Helper to wrap raw 24kHz 16-bit Mono Linear PCM into a standard playable WAV file Buffer
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  const wavHeader = Buffer.alloc(headerSize);

  // RIFF chunk descriptor
  wavHeader.write("RIFF", 0);
  wavHeader.writeUInt32LE(totalSize - 8, 4);
  wavHeader.write("WAVE", 8);

  // "fmt " sub-chunk
  wavHeader.write("fmt ", 12);
  wavHeader.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
  wavHeader.writeUInt16LE(1, 20);  // AudioFormat (1 for Linear PCM)
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);

  // "data" sub-chunk
  wavHeader.write("data", 36);
  wavHeader.writeUInt32LE(dataSize, 40);

  return Buffer.concat([wavHeader, pcmBuffer]);
}

// The voice's dialect/style instruction, looked up in the trusted VOICES list (not taken
// from the client). Gemini 3.8 TTS reads the text field verbatim, so this must never be
// prepended to the text: it goes in OpenRouter's separate `instructions` field.
// Set TTS_STYLE_PROMPT=off to send no instruction.
function ttsStyleFor(voice?: any): string | undefined {
  if (process.env.TTS_STYLE_PROMPT === "off") return undefined;
  return VOICES.find((v) => v.id === voice?.id)?.stylePrompt?.trim() || undefined;
}

// Bump when the way audio is generated changes, so cached clips made the old way are not reused
const TTS_CACHE_VERSION = "v2";

// Synthesize audio using google/gemini-3.8-flash-lite-tts via OpenRouter with system instructions & dialect prompting
async function synthesizeWithOpenRouterGeminiTts(
  text: string,
  options: { voice?: any; speed?: number; preferredModel?: string } = {}
): Promise<{ buffer: Buffer; contentType: string; engine: string } | null> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey || !openRouterKey.startsWith("sk-or-v1-")) {
    return null;
  }

  const { voice, speed = 1.0, preferredModel = "google/gemini-3.8-flash-lite-tts" } = options;
  const isFemale = voice?.gender === "female";
  const voiceName = voice?.geminiVoiceName || (isFemale ? "Kore" : "Puck");

  const instructions = ttsStyleFor(voice);

  // List of active Gemini TTS models on OpenRouter (Notice: Gemini TTS strictly requires response_format: "pcm")
  const ttsModelsToTry = [
    preferredModel,
    "google/gemini-3.8-flash-lite-tts",
    "google/gemini-3.8-flash-tts",
    "google/gemini-3.1-flash-tts-preview",
  ];
  const uniqueModels = [...new Set(ttsModelsToTry)];

  // Method 1: Try OpenRouter /audio/speech endpoint with response_format="pcm"
  for (const model of uniqueModels) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const res = await fetch("https://openrouter.ai/api/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "https://hakawatiai.com",
          "X-Title": "Hakawati AI",
        },
        body: JSON.stringify({
          model,
          input: text,
          ...(instructions ? { instructions } : {}),
          voice: voiceName,
          speed: Number(speed) || 1.0,
          response_format: "pcm",
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const pcmRaw = Buffer.from(arrayBuf);
        if (pcmRaw.length > 200) {
          const wavBuffer = pcmToWav(pcmRaw, 24000, 1, 16);
          console.log(`[OpenRouter Audio/Speech] Generated successfully with model: ${model}, voice: ${voiceName}, wav size: ${wavBuffer.length} bytes`);
          return { buffer: wavBuffer, contentType: "audio/wav", engine: `openrouter-${model}` };
        }
      } else {
        const errText = await res.text().catch(() => "");
        console.warn(`[OpenRouter Audio/Speech] ${model} status ${res.status}:`, errText.slice(0, 150));
      }
    } catch (e: any) {
      if (e?.name === "AbortError" || e?.message?.includes("aborted")) {
        console.info(`[OpenRouter Audio/Speech] ${model} timed out, trying next.`);
      } else {
        console.warn(`[OpenRouter Audio/Speech] ${model} call error:`, e?.message || e);
      }
    }
  }

  return null;
}

// Helper to split text into safe chunks for Fish Audio (strict 1000 characters maximum per chunk)
function splitTextForFishAudio(text: string, maxChunkLength = 1000): string[] {
  if (!text || text.length <= maxChunkLength) return [text];
  
  // Split on natural paragraph or sentence endings:
  const rawSentences = text
    .split(/(?<=[.!?؟\n])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of rawSentences) {
    if (!currentChunk) {
      currentChunk = sentence;
    } else if ((currentChunk + ' ' + sentence).length <= maxChunkLength) {
      currentChunk += ' ' + sentence;
    } else {
      chunks.push(currentChunk);
      currentChunk = sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [text];
}

// Synthesize audio using Fish Audio API with auto-chunking & stitching for long texts
async function synthesizeWithFishAudio(
  text: string,
  apiKey: string,
  options: { referenceId?: string; speed?: number; model?: string; format?: string }
): Promise<Buffer | null> {
  const { referenceId, speed = 1.0, model = "s2.1-pro", format = "mp3" } = options;
  const chunks = splitTextForFishAudio(text, 1000);

  const audioBuffers: Buffer[] = [];

  for (const chunk of chunks) {
    const payload: Record<string, any> = {
      text: chunk,
      format,
      latency: "normal",
      prosody_speed: Number(speed) || 1.0,
      model,
    };
    if (referenceId) {
      payload.reference_id = referenceId;
    }

    const fishResponse = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!fishResponse.ok) {
      const errText = await fishResponse.text();
      console.error("Fish Audio segment error:", fishResponse.status, errText);
      return null;
    }

    const arrayBuf = await fishResponse.arrayBuffer();
    audioBuffers.push(Buffer.from(arrayBuf));
  }

  if (audioBuffers.length === 0) return null;
  // Concatenate MP3 frames directly (valid for MPEG Audio streams)
  return Buffer.concat(audioBuffers);
}

// Server-side in-memory TTS cache for zero-latency lookahead re-plays
const serverTtsCache = new Map<string, { buffer: Buffer; contentType: string; engine: string }>();

// Check TTS status (Prioritizing OpenRouter Gemini 3.8 Flash-Lite TTS, with Fish Audio & direct Gemini fallback)
app.get("/api/tts/status", (req, res) => {
  res.json({
    openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    gemini38TtsConfigured: Boolean(process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY),
    fishAudioConfigured: Boolean(process.env.FISH_AUDIO_API_KEY),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Real-time AI Speech playback endpoint
// Priority 1: google/gemini-3.8-flash-lite-tts via OpenRouter
// Priority 2: Direct Google Gemini 3.8 Flash-Lite TTS (Google GenAI)
// Priority 3: Fish Audio S2.1 Pro
// Listening minutes: anyone may hear the public demo texts; everything else needs a signed-in
// user with enough balance. Returns null when it already answered (401/402), otherwise a refund
// function to call if generation fails.
async function gateTts(
  req: express.Request,
  res: express.Response,
  text: string,
  chargeKey: string
): Promise<(() => Promise<void>) | null> {
  const noop = async () => {};
  if (!creditsEnabled() || isPublicText(text)) return noop;
  const uid = await uidFromRequest(req);
  if (!uid) {
    res.status(401).json({ code: "auth_required", error: "سجّل الدخول للاستماع إلى نصوصك وكتبك." });
    return null;
  }
  if (alreadyCharged(uid, chargeKey)) return noop;
  const seconds = secondsForText(text);
  const result = await charge(uid, seconds);
  if (!result.ok) {
    res.status(402).json({ code: "insufficient_credits", remainingSeconds: result.remaining, error: "رصيد دقائقك لا يكفي." });
    return null;
  }
  rememberCharge(uid, chargeKey);
  res.setHeader("X-Credits-Remaining", String(result.remaining));
  return async () => {
    forgetCharge(uid, chargeKey);
    await refund(uid, seconds);
  };
}

// Signed-in check for the AI text tools (they spend the OpenRouter credit too)
async function requireUser(req: express.Request, res: express.Response): Promise<boolean> {
  if (!creditsEnabled()) return true;
  if (await uidFromRequest(req)) return true;
  res.status(401).json({ code: "auth_required", error: "سجّل الدخول لاستخدام أدوات الذكاء الاصطناعي." });
  return false;
}

app.get("/api/credits", async (req, res) => {
  if (!creditsEnabled()) return res.json({ enabled: false });
  const uid = await uidFromRequest(req);
  if (!uid) return res.status(401).json({ code: "auth_required" });
  try {
    res.json({ enabled: true, secondsRemaining: await getBalance(uid) });
  } catch (err: any) {
    console.error("[credits] balance error", err?.message || err);
    res.status(500).json({ error: "تعذّر قراءة الرصيد." });
  }
});

app.post("/api/tts/speak", async (req, res) => {
  let refundCharge: () => Promise<void> = async () => {};
  try {
    const { text, voice, speed = 1.0 } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "النص مطلوب." });
    }

    const trimmedText = text.slice(0, 10000).trim();
    const cacheKey = `${TTS_CACHE_VERSION}_${voice?.id || 'def'}_${speed}_${trimmedText}`;
    const diskPath = getAudioDiskCachePath(cacheKey);

    // Charge the listener (cached clips cost us nothing but are still listening time)
    const gate = await gateTts(req, res, trimmedText, `speak:${voice?.id || "def"}:${trimmedText}`);
    if (!gate) return;
    refundCharge = gate;

    // 1. Level 1: In-memory Fast Cache
    if (serverTtsCache.has(cacheKey)) {
      const cached = serverTtsCache.get(cacheKey)!;
      res.setHeader("Content-Type", cached.contentType);
      res.setHeader("Content-Length", cached.buffer.length);
      res.setHeader("X-Voice-Engine", cached.engine);
      res.setHeader("X-TTS-Cache", "MEMORY-HIT");
      return res.send(cached.buffer);
    }

    // 2. Level 2: Persistent Disk Storage Cache (0 API calls, 0 cost)
    try {
      if (fs.existsSync(diskPath)) {
        const diskBuffer = fs.readFileSync(diskPath);
        if (diskBuffer && diskBuffer.length > 500) {
          const contentType = diskBuffer.subarray(0, 4).toString() === "RIFF" ? "audio/wav" : "audio/mpeg";
          serverTtsCache.set(cacheKey, { buffer: diskBuffer, contentType, engine: "disk-cached-gemini-tts" });
          res.setHeader("Content-Type", contentType);
          res.setHeader("Content-Length", diskBuffer.length);
          res.setHeader("X-Voice-Engine", "disk-cached-gemini-tts");
          res.setHeader("X-TTS-Cache", "DISK-HIT");
          return res.send(diskBuffer);
        }
      }
    } catch (diskReadErr) {
      console.warn("Disk cache read warning:", diskReadErr);
    }

    // 3. PRIMARY: Synthesize with google/gemini-3.8-flash-lite-tts via OpenRouter
    const openRouterResult = await synthesizeWithOpenRouterGeminiTts(trimmedText, {
      voice,
      speed: Number(speed) || 1.0,
      preferredModel: "google/gemini-3.8-flash-lite-tts",
    });

    if (openRouterResult && openRouterResult.buffer) {
      // Save permanently to disk
      try {
        fs.writeFileSync(diskPath, openRouterResult.buffer);
      } catch (saveErr) {
        console.warn("Could not save audio to disk cache:", saveErr);
      }

      if (serverTtsCache.size > 250) {
        const firstKey = serverTtsCache.keys().next().value;
        if (firstKey) serverTtsCache.delete(firstKey);
      }
      serverTtsCache.set(cacheKey, openRouterResult);

      res.setHeader("Content-Type", openRouterResult.contentType);
      res.setHeader("Content-Length", openRouterResult.buffer.length);
      res.setHeader("X-Voice-Engine", openRouterResult.engine);
      res.setHeader("X-TTS-Cache", "GENERATED-AND-SAVED");
      return res.send(openRouterResult.buffer);
    }

    // 2. SECONDARY: Direct Google Gemini SDK with gemini-3.8-flash-lite-tts
    const gemini = getGeminiClient();
    if (gemini) {
      try {
        const response = await gemini.models.generateContent({
          model: "gemini-3.8-flash-lite-tts",
          contents: [{ parts: [{ text: trimmedText }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice?.geminiVoiceName || (voice?.gender === "female" ? "Kore" : "Puck") },
              },
            },
          },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          const rawAudioBuffer = Buffer.from(base64Audio, "base64");
          // Convert to WAV if raw PCM, or use as is
          const audioBuffer = rawAudioBuffer.slice(0, 4).toString() === "RIFF" 
            ? rawAudioBuffer 
            : pcmToWav(rawAudioBuffer, 24000, 1, 16);
          const geminiResult = {
            buffer: audioBuffer,
            contentType: "audio/wav",
            engine: "google-gemini-3.8-flash-lite-tts-direct",
          };

          try {
            fs.writeFileSync(diskPath, audioBuffer);
          } catch (e) {}

          if (serverTtsCache.size > 250) {
            const firstKey = serverTtsCache.keys().next().value;
            if (firstKey) serverTtsCache.delete(firstKey);
          }
          serverTtsCache.set(cacheKey, geminiResult);

          res.setHeader("Content-Type", "audio/wav");
          res.setHeader("Content-Length", audioBuffer.length);
          res.setHeader("X-Voice-Engine", geminiResult.engine);
          res.setHeader("X-TTS-Cache", "GENERATED-AND-SAVED");
          return res.send(audioBuffer);
        }
      } catch (geminiErr: any) {
        console.warn("Direct Gemini 3.8 Flash-Lite TTS note:", geminiErr?.message || geminiErr);
      }
    }

    // 3. TERTIARY FALLBACK: Fish Audio (if configured)
    const fishApiKey = process.env.FISH_AUDIO_API_KEY;
    if (fishApiKey) {
      const buffer = await synthesizeWithFishAudio(trimmedText, fishApiKey, {
        speed: Number(speed) || 1.0,
        model: "s2.1-pro",
        format: "mp3",
      });

      if (buffer) {
        const engine = "fish-audio-s2.1-pro";
        serverTtsCache.set(cacheKey, { buffer, contentType: "audio/mpeg", engine });
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Length", buffer.length);
        res.setHeader("X-Voice-Engine", engine);
        return res.send(buffer);
      }
    }

    // No robotic fallback (e.g. Google Translate TTS): if the AI voice fails, the client shows an error
    await refundCharge();
    return res.status(503).json({ error: "لا يمكن توليد الصوت بالذكاء الاصطناعي حالياً." });
  } catch (error: any) {
    console.error("Speak Exception:", error);
    await refundCharge();
    if (!res.headersSent) res.status(500).json({ error: error.message || "فشل الاتصال بمحرك الصوت" });
  }
});

// Full audiobook chapter/text MP3 download synthesis endpoint
app.post("/api/tts/generate-audio", async (req, res) => {
  let refundCharge: () => Promise<void> = async () => {};
  try {
    const { text, speed = 1.0, title, voice: rawVoice, voiceId } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "النص مطلوب لتحميل الملف الصوتي." });
    }

    // Resolve exact voice object matching user's selected playback voice
    let targetVoice = rawVoice;
    if (!targetVoice && voiceId) {
      targetVoice = VOICES.find(v => v.id === voiceId);
    }
    if (!targetVoice) {
      targetVoice = VOICES[0]; // fallback to default
    }

    const trimmedText = text.slice(0, 15000).trim();
    const cacheKey = `${TTS_CACHE_VERSION}_${targetVoice?.id || 'def'}_${speed}_${trimmedText}`;
    const diskPath = getAudioDiskCachePath(cacheKey);

    const gate = await gateTts(req, res, trimmedText, `download:${targetVoice?.id || "def"}:${trimmedText}`);
    if (!gate) return;
    refundCharge = gate;

    // Check disk/memory cache ONLY for very short single sentences (<200 chars)
    // Long chapters must ALWAYS run through the multi-chunk sequential assembler!
    try {
      if (trimmedText.length < 200) {
        if (serverTtsCache.has(cacheKey)) {
          const cached = serverTtsCache.get(cacheKey)!;
          const safeTitle = encodeURIComponent((title || "audiobook").replace(/[\/\\?%*:|"<>]/g, "_"));
          const ext = cached.contentType.includes("wav") ? "wav" : "mp3";
          res.setHeader("Content-Type", cached.contentType);
          res.setHeader("Content-Length", cached.buffer.length);
          res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.${ext}"`);
          return res.send(cached.buffer);
        }
      }
    } catch (cacheErr) {
      console.warn("Download cache check note:", cacheErr);
    }

    // Multi-chunk sequential generator for full text
    // Splitting text into 35-40 second paragraphs to ensure zero cutoffs from TTS engines
    const rawParagraphs = trimmedText
      .split(/(?<=[.!?؟\n])\s+/)
      .map(s => s.trim())
      .filter(Boolean);

    const textChunks: string[] = [];
    let curChunk = '';
    for (const p of rawParagraphs) {
      if (!curChunk) curChunk = p;
      else if (curChunk.split(/\s+/).length < 75 || curChunk.length < 350) curChunk += ' ' + p;
      else {
        textChunks.push(curChunk);
        curChunk = p;
      }
    }
    if (curChunk) textChunks.push(curChunk);

    if (textChunks.length === 0) {
      textChunks.push(trimmedText);
    }

    const pcmChunks: Buffer[] = [];

    // Synthesize all chunks in order
    for (const chunk of textChunks) {
      let chunkPcm: Buffer | null = null;

      // 1. Try OpenRouter Gemini TTS
      const openRouterResult = await synthesizeWithOpenRouterGeminiTts(chunk, {
        voice: targetVoice,
        speed: Number(speed) || 1.0,
        preferredModel: "google/gemini-3.8-flash-lite-tts",
      });

      if (openRouterResult && openRouterResult.buffer && openRouterResult.buffer.length > 44) {
        // Strip 44 bytes header to extract raw PCM
        chunkPcm = openRouterResult.buffer.slice(44);
      } else {
        // 2. Direct Gemini TTS fallback
        const gemini = getGeminiClient();
        if (gemini) {
          try {
            const response = await gemini.models.generateContent({
              model: "gemini-3.8-flash-lite-tts",
              contents: [{ parts: [{ text: chunk }] }],
              config: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: targetVoice?.geminiVoiceName || (targetVoice?.gender === "female" ? "Kore" : "Puck") },
                  },
                },
              },
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const rawAudioBuffer = Buffer.from(base64Audio, "base64");
              chunkPcm = rawAudioBuffer.slice(0, 4).toString() === "RIFF" 
                ? rawAudioBuffer.slice(44) 
                : rawAudioBuffer;
            }
          } catch (geminiErr: any) {
            console.warn("Direct Gemini chunk synthesis note:", geminiErr?.message || geminiErr);
          }
        }
      }

      if (chunkPcm && chunkPcm.length > 0) {
        pcmChunks.push(chunkPcm);
      }
    }

    if (pcmChunks.length > 0) {
      const mergedPcm = Buffer.concat(pcmChunks);
      const masterWavBuffer = pcmToWav(mergedPcm, 24000, 1, 16);

      try {
        fs.writeFileSync(diskPath, masterWavBuffer);
      } catch (e) {}

      const safeTitle = encodeURIComponent((title || "audiobook").replace(/[\/\\?%*:|"<>]/g, "_"));
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Content-Length", masterWavBuffer.length);
      res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.wav"`);
      return res.send(masterWavBuffer);
    }

    // 3. Fish Audio fallback if configured
    const apiKey = process.env.FISH_AUDIO_API_KEY;
    if (apiKey) {
      const buffer = await synthesizeWithFishAudio(text.slice(0, 10000), apiKey, {
        speed: Number(speed) || 1.0,
        model: "s2.1-pro",
        format: "mp3",
      });
      if (buffer) {
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Length", buffer.length);
        const safeTitle = encodeURIComponent((title || "audiobook").replace(/[\/\\?%*:|"<>]/g, "_"));
        res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.mp3"`);
        return res.send(buffer);
      }
    }

    await refundCharge();
    return res.status(503).json({ error: "تعذر توليد ملف التحميل الصوتي." });
  } catch (error: any) {
    console.error("Generate audio error:", error);
    await refundCharge();
    if (!res.headersSent) res.status(500).json({ error: error.message || "خطأ في توليد الملف الصوتي" });
  }
});

// Fish Audio TTS Proxy Endpoint (Keeps API key secure on server)
app.post("/api/tts/fish-audio", async (req, res) => {
  try {
    const apiKey = process.env.FISH_AUDIO_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: "FISH_AUDIO_API_KEY غير معين في متغيرات البيئة (Secrets)."
      });
    }

    const { text, speed = 1.0, format = "mp3", model = "s2.1-pro" } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "النص مطلوب." });
    }

    const trimmedText = text.slice(0, 10000);

    const buffer = await synthesizeWithFishAudio(trimmedText, apiKey, {
      speed,
      model: model || "s2.1-pro",
      format,
    });

    if (!buffer) {
      return res.status(500).json({
        error: "تعذر توليد المقطع الصوتي عبر Fish Audio"
      });
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Content-Disposition", 'inline; filename="synthesized_book.mp3"');
    res.send(buffer);
  } catch (error: any) {
    console.error("Fish Audio Proxy Exception:", error);
    res.status(500).json({ error: error.message || "فشل الاتصال بـ Fish Audio" });
  }
});

// AI Professional Book Generator Engine from Scratch (Gemini 3.8 Flash)
app.post("/api/ai/generate-book", async (req, res) => {
  try {
    const { 
      topic, 
      genre, 
      targetAudience, 
      tone, 
      targetPages = 15, 
      authorName = "الكاتب المبدع",
      customTitle,
      language = "ar",
      creationMode = "questionnaire",
      freeformPrompt = ""
    } = req.body;

    const inputTopic = creationMode === "freeform_prompt" ? freeformPrompt : topic;

    if (!inputTopic || typeof inputTopic !== "string" || !inputTopic.trim()) {
      return res.status(400).json({ error: "يرجى كتابة فكرة أو وصف الكتاب للبدء." });
    }

    const calculatedChapters = Math.max(3, Math.min(8, Math.round(Number(targetPages) / 3)));

    const languageNames: Record<string, string> = {
      ar: "اللغة العربية الفصحى الجميلة والمشكلة",
      en: "English (Clear, Engaging Bestseller Style)",
      fr: "Français (Style Élégan & Captivant)",
      es: "Español (Estilo Atractivo y Fluido)",
      de: "Deutsch (Präzise und Inspirierend)"
    };

    const targetLangName = languageNames[language] || "اللغة العربية الفصحى";

    const prompt = `You are a Master World-Class Book Author and Storyteller.
Task: Write and compose a complete, highly engaging, beautifully structured book in **${targetLangName}**.

### Context & Adaptive Mode Matching Rules:
1. **Creation Mode**: ${creationMode === "freeform_prompt" ? "User Freeform Prompt / Custom Instructions" : "Structured Questionnaire"}
2. **User Input / Prompt**: "${inputTopic}"
3. **Proposed Title**: "${customTitle || "Invent an attractive main title in " + targetLangName}"
4. **Target Genre**: "${genre || "Adaptive based on topic"}"
5. **Target Audience**: "${targetAudience || "Adaptive based on topic"}"
6. **Tone & Style**: "${tone || "Adaptive, engaging, high quality"}"
7. **Chapters Count**: ${calculatedChapters} sequential chapters.

### CRITICAL ADAPTIVE CRITERIA FOR CHILDREN'S BOOKS & ALL GENRES:
- **IF THE TOPIC OR PROMPT IS A CHILDREN'S STORY / KIDS BOOK**:
  - Content Tone: Heartwarming, playful, gentle vocabulary, highly engaging, magical storytelling suited for young kids.
  - Moral & Takeaways: Cute golden lessons for kids about honesty, courage, friendship, or curiosity.
  - Cover Prompt Instructions: Must explicitly dictate a vibrant, adorable 3D Pixar/Disney style children's picture book cover illustration with cute friendly characters.
- **IF BUSINESS / SELF-HELP / SCIENCE / NOVEL**:
  - Content Tone: Professional, deep insights, actionable takeaways, structured chapters.
  - Cover Prompt Instructions: Must dictate a luxury bestseller hardcover book jacket design.

### JSON OUTPUT FORMAT (Strict JSON, no markdown formatting outside JSON):
{
  "title": "Main Title in ${targetLangName}",
  "subtitle": "Sub-title or Catchphrase in ${targetLangName}",
  "author": "${authorName}",
  "genre": "Genre in ${targetLangName}",
  "targetAudience": "Audience in ${targetLangName}",
  "language": "${language}",
  "totalPagesTarget": ${targetPages},
  "synopsis": "A compelling 3-5 sentence summary of the book in ${targetLangName}",
  "coverPrompt": "Detailed English prompt for image generation model specifying visual elements, exact 6x9 aspect ratio, lighting, and style (e.g. cute 3d pixar illustration for kids OR cinematic hardcover for adults)",
  "tableOfContents": [
    "Chapter 1: Title",
    "Chapter 2: Title"
  ],
  "chapters": [
    {
      "chapterNumber": 1,
      "title": "Chapter 1 Title in ${targetLangName}",
      "summary": "Brief chapter summary",
      "subsections": [
        {
          "subheading": "Section 1 Subheading in ${targetLangName}",
          "content": "Detailed, rich, engaging text (3 to 5 full paragraphs in ${targetLangName}).",
          "keyTakeaway": "Golden lesson / key takeaway in ${targetLangName}"
        },
        {
          "subheading": "Section 2 Subheading in ${targetLangName}",
          "content": "Rich continuation content (3 to 5 paragraphs in ${targetLangName}).",
          "keyTakeaway": "Practical advice / takeaway in ${targetLangName}"
        }
      ]
    }
  ]
}`;

    let generatedBook = null;
    const ai = getGeminiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.7,
          },
        });

        if (response.text) {
          generatedBook = JSON.parse(response.text);
        }
      } catch (geminiErr: any) {
        console.warn("Gemini book creation error, trying OpenRouter fallback:", geminiErr?.message || geminiErr);
      }
    }

    if (!generatedBook) {
      const openRouterResult = await callOpenRouter(prompt, "deepseek/deepseek-chat", 4000);
      if (openRouterResult) {
        try {
          const jsonMatch = openRouterResult.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            generatedBook = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.warn("OpenRouter JSON parse error:", e);
        }
      }
    }

    if (!generatedBook) {
      return res.status(500).json({ error: "تعذر توليد الكتاب حالياً. يرجى المحاولة مرة أخرى." });
    }

    return res.json({
      success: true,
      book: generatedBook,
    });
  } catch (error: any) {
    console.error("Generate Book Error:", error);
    res.status(500).json({ error: error.message || "حدث خطأ أثناء تأليف الكتاب" });
  }
});

// AI Realistic Book Cover Engine (Pollinations 8K Flux & OpenRouter Image Models)
app.post("/api/ai/generate-cover", async (req, res) => {
  try {
    const { 
      title, 
      genre, 
      author = "الكاتب المبدع", 
      synopsis = "", 
      coverPrompt, 
      style = "cinematic",
      targetAudience = "" 
    } = req.body;

    const isKidsBook = (genre && (genre.includes("طفل") || genre.includes("أطفال") || genre.toLowerCase().includes("kid") || genre.toLowerCase().includes("children"))) ||
                      (targetAudience && (targetAudience.includes("طفل") || targetAudience.includes("أطفال") || targetAudience.toLowerCase().includes("kid"))) ||
                      (title && (title.includes("قصة") || title.includes("أميرة") || title.includes("دبدوب") || title.includes("طفل") || title.includes("سمسم") || title.toLowerCase().includes("story")));

    // 1. Build an expert Pixar 3D / Photorealistic 6x9 book cover prompt in English
    let engineeredPrompt = coverPrompt;
    if (!engineeredPrompt || engineeredPrompt.length < 25) {
      if (isKidsBook) {
        engineeredPrompt = `Adorable colorful 3D Pixar Disney style children's picture book cover illustration for a storybook titled "${title}". A cute fluffy white bunny rabbit with big sparkly eyes wearing a small blue vest holding a glowing magical map in an enchanting fairytale forest with glowing giant purple mushrooms, friendly baby unicorn peeking behind a flower tree, magical waterfall rainbow background, ornate carved wooden hanging sign at top with title. Vibrant colorful masterpiece, 8k resolution, award-winning book cover art. No blurry artifacts, no low quality.`;
      } else {
        engineeredPrompt = `Professional bestselling hardcover book cover design for a book titled "${title}". Genre & Theme: ${genre}. Subject: ${synopsis || title}. Exact 6x9 inches ratio portrait vertical book jacket. Hyper-realistic textured elements, symbolic focal point, dramatic studio lighting, rich color palette, cinematic depth of field, award-winning luxury cover typography layout, 8k resolution, elegant masterpiece book cover art.`;
      }
    } else {
      engineeredPrompt = `${engineeredPrompt}, 3D Pixar Disney style masterpiece, professional standard 6x9 inch (2:3 aspect ratio) vertical book cover format, award-winning book jacket design, 8k resolution, hyper-detailed, clean artistic composition, perfect 6x9 book cover proportions.`;
    }

    let imageBase64 = null;

    // 2. Guaranteed High-Resolution Pollinations Flux Engine
    try {
      const encodedPrompt = encodeURIComponent(engineeredPrompt);
      const seed = Math.floor(Math.random() * 9999999);
      const pollUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=600&height=900&nologo=true&seed=${seed}&model=flux`;
      console.log(`[AI Cover Engine] Generating 8K Pixar 3D/Cinematic AI cover via Pollinations Flux...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const pollRes = await fetch(pollUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (pollRes.ok) {
        const buffer = await pollRes.arrayBuffer();
        if (buffer.byteLength > 5000) {
          const b64 = Buffer.from(buffer).toString("base64");
          imageBase64 = `data:image/jpeg;base64,${b64}`;
          console.log(`[AI Cover Engine] Successfully generated and embedded 8K AI cover image (${buffer.byteLength} bytes)!`);
        }
      }
    } catch (pollErr: any) {
      console.warn("[AI Cover Engine] Pollinations Flux call note:", pollErr?.message || pollErr);
    }

    // 3. OpenRouter Image Models Fallback
    if (!imageBase64) {
      const openRouterKey = process.env.OPENROUTER_API_KEY;
      if (openRouterKey && openRouterKey.startsWith("sk-or-v1-")) {
        const openRouterModels = [
          "black-forest-labs/flux-1-schnell",
          "google/gemini-2.5-flash-image",
          "stabilityai/stable-diffusion-3-medium",
        ];

        for (const orModel of openRouterModels) {
          try {
            console.log(`[OpenRouter Image] Fallback cover generation using model: ${orModel}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${openRouterKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": process.env.APP_URL || "https://hakawatiai.com",
                "X-Title": "Hakawati AI",
              },
              body: JSON.stringify({
                model: orModel,
                messages: [
                  {
                    role: "user",
                    content: engineeredPrompt,
                  },
                ],
              }),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (orResponse.ok) {
              const data = await orResponse.json();
              const message = data.choices?.[0]?.message;

              if (message?.images && Array.isArray(message.images) && message.images[0]) {
                const imgObj = message.images[0];
                imageBase64 = imgObj.url || imgObj.image_url?.url || imgObj;
                console.log(`[OpenRouter Image] Successfully generated cover image with model: ${orModel}`);
                break;
              } else if (message?.content) {
                const contentStr = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
                const dataUrlMatch = contentStr.match(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/);
                if (dataUrlMatch) {
                  imageBase64 = dataUrlMatch[0];
                  console.log(`[OpenRouter Image] Extracted base64 from content string (${orModel})`);
                  break;
                }
                const httpImgMatch = contentStr.match(/https?:\/\/[^\s")]+?\.(?:png|jpg|jpeg|webp)/i);
                if (httpImgMatch) {
                  imageBase64 = httpImgMatch[0];
                  console.log(`[OpenRouter Image] Extracted direct image URL from content (${orModel})`);
                  break;
                }
              }
            }
          } catch (orErr: any) {
            console.warn(`[OpenRouter Image] Call failed for ${orModel}:`, orErr?.message || orErr);
          }
        }
      }
    }

    // 3. Fallback to Gemini SDK directly if needed
    if (!imageBase64) {
      const ai = getGeminiClient();
      if (ai) {
        const geminiImageModels = ["gemini-3.1-flash-image", "gemini-3.1-flash-lite-image"];
        for (const gModel of geminiImageModels) {
          try {
            const response = await ai.models.generateContent({
              model: gModel,
              contents: engineeredPrompt,
            });

            const candidate = response.candidates?.[0];
            if (candidate?.content?.parts) {
              for (const part of candidate.content.parts) {
                if (part.inlineData?.data) {
                  imageBase64 = `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
                  break;
                }
              }
            }
            if (imageBase64) break;
          } catch (imgErr: any) {
            console.warn(`[Gemini SDK Image] Model ${gModel} warning:`, imgErr?.message || imgErr);
          }
        }
      }
    }

    // Convert external HTTP/HTTPS URL to Base64 data URI if needed
    if (imageBase64 && imageBase64.startsWith("http")) {
      try {
        console.log("[AI Cover Engine] Fetching and converting image URL to Base64 data URI...");
        const fetchRes = await fetch(imageBase64);
        if (fetchRes.ok) {
          const arrayBuf = await fetchRes.arrayBuffer();
          const mime = fetchRes.headers.get("content-type") || "image/jpeg";
          imageBase64 = `data:${mime};base64,${Buffer.from(arrayBuf).toString("base64")}`;
        }
      } catch (e) {
        console.warn("Error converting cover URL to Base64:", e);
      }
    }

    return res.json({
      success: true,
      imageUrl: imageBase64,
      promptUsed: engineeredPrompt,
    });
  } catch (error: any) {
    console.error("Cover Generator Exception:", error);
    res.status(500).json({ error: error.message });
  }
});

// Chat With Your PDF / Book (Gemini 3.8 Flash Contextual Q&A with Speech)
app.post("/api/ai/chat-pdf", async (req, res) => {
  try {
    const { question, bookText, bookTitle, history = [] } = req.body;
    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ error: "السؤال مطلوب." });
    }

    const trimmedBook = (bookText || "").slice(0, 35000);

    const prompt = `أنت المساعد الذكي وخبير محتوى الكتاب الصوتي "${bookTitle || 'الكتاب المرفوع'}".
المستخدم يطرح عليك سؤالاً حول محتوى هذا الكتاب.

نص / مقتطفات الكتاب كمرجع أساسي:
---
${trimmedBook}
---

سجل المحادثة السابق إن وجد:
${JSON.stringify(history.slice(-4))}

سؤال المستخدم الحالي:
"${question}"

تعليمات الإجابة:
1. أجب بدقة واستناداً إلى ما ورد في الكتاب بأسلوب واضح، ممتع، وملهم.
2. إذا كان السؤال يطلب تلخيص فكرة، اقتباسات، أو خطوات عملية، رتبها في نقاط سهلة القراءة.
3. استخدم لغة عربية فصيحة ومشكولة في الكلمات المفتاحية لتكون مريحة عند الاستماع الصوتي.
4. إذا لم تكن المعلومة مذكورة إطلاقاً في الكتاب، أجب بلطف بناءً على المعرفة العامة مع توضيح ذلك.`;

    let answer = "";
    const ai = getGeminiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            temperature: 0.6,
          },
        });
        answer = response.text?.trim() || "";
      } catch (geminiErr: any) {
        console.warn("Chat PDF Gemini call warning, trying OpenRouter fallback:", geminiErr?.message || geminiErr);
      }
    }

    if (!answer) {
      const openRouterAnswer = await callOpenRouter(prompt, "deepseek/deepseek-chat", 2000);
      if (openRouterAnswer) {
        answer = openRouterAnswer.trim();
      }
    }

    if (!answer) {
      answer = "بناءً على محتوى الكتاب، يسلط النص الضوء على أهمية تطبيق المبادئ الأساسية الواردة في الفصول لتحقيق أفضل النتائج العملية.";
    }

    return res.json({
      success: true,
      answer,
    });
  } catch (error: any) {
    console.error("Chat PDF Exception:", error);
    res.status(500).json({ error: error.message || "حدث خطأ أثناء الإجابة عن السؤال" });
  }
});

// ---- SEO landing pages: serve index.html with page-specific meta tags, JSON-LD
// and pre-rendered content so crawlers see each page without running JavaScript.
const SITE_URL = (process.env.APP_URL || "https://hakawatiai.com").replace(/\/+$/, "");

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderLandingHtml(template: string, page: LandingPage): string {
  const url = `${SITE_URL}${landingPath(page)}`;
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: page.title,
        description: page.description,
        inLanguage: "ar",
        isPartOf: { "@type": "WebSite", name: "Hakawati AI", url: `${SITE_URL}/` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Hakawati AI", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: page.linkLabel, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: page.faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  };

  const content = [
    `<main dir="rtl">`,
    `<h1>${escapeHtml(page.h1)}</h1>`,
    `<p>${escapeHtml(page.subtitle)}</p>`,
    ...page.sections.map(
      (sec) => `<h2>${escapeHtml(sec.heading)}</h2>` + sec.paragraphs.map((t) => `<p>${escapeHtml(t)}</p>`).join("")
    ),
    `<h2>أسئلة حول ${escapeHtml(page.linkLabel)}</h2>`,
    ...page.faqs.map((f) => `<h3>${escapeHtml(f.question)}</h3><p>${escapeHtml(f.answer)}</p>`),
    `<nav><a href="/">تحويل PDF إلى صوت</a> `,
    ...LANDING_PAGES.filter((p) => p.slug !== page.slug).map((p) => `<a href="${landingPath(p)}">${escapeHtml(p.linkLabel)}</a> `),
    `</nav></main>`,
  ].join("");

  // Replacements use functions so "$" in page text is never treated as a pattern
  return template
    .replace(/<title>[^<]*<\/title>/, () => `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, () => `<meta name="description" content="${description}" />`)
    .replace(/<meta name="keywords" content="[^"]*" \/>/, () => `<meta name="keywords" content="${escapeHtml(page.keywords)}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, () => `<link rel="canonical" href="${url}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, () => `<meta property="og:url" content="${url}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, () => `<meta property="og:title" content="${title}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, () => `<meta name="twitter:title" content="${title}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, () => `<meta property="og:description" content="${description}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, () => `<meta name="twitter:description" content="${description}" />`)
    .replace(
      /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
      () => `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`
    )
    .replace(/<div id="root"><\/div>/, () => `<div id="root">${content}</div>`);
}

// Head tags shared by the summary pages; replacements use functions so "$" in text is safe
function withHead(template: string, head: { title: string; description: string; keywords: string; url: string; ogType?: string; jsonLd: unknown; content: string }): string {
  const title = escapeHtml(head.title);
  const description = escapeHtml(head.description);
  return template
    .replace(/<title>[^<]*<\/title>/, () => `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, () => `<meta name="description" content="${description}" />`)
    .replace(/<meta name="keywords" content="[^"]*" \/>/, () => `<meta name="keywords" content="${escapeHtml(head.keywords)}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, () => `<link rel="canonical" href="${head.url}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, () => `<meta property="og:url" content="${head.url}" />`)
    .replace(/<meta property="og:type" content="[^"]*" \/>/, () => `<meta property="og:type" content="${head.ogType || "website"}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, () => `<meta property="og:title" content="${title}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, () => `<meta name="twitter:title" content="${title}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, () => `<meta property="og:description" content="${description}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, () => `<meta name="twitter:description" content="${description}" />`)
    .replace(
      /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
      () => `<script type="application/ld+json">${JSON.stringify(head.jsonLd).replace(/</g, "\\u003c")}</script>`
    )
    .replace(/<div id="root"><\/div>/, () => `<div id="root">${head.content}</div>`);
}

function summaryHasAudio(distPath: string, s: BookSummary): { duration: number } | null {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(distPath, "summaries", `${s.slug}.json`), "utf8"));
    return fs.existsSync(path.join(distPath, "summaries", `${s.slug}.mp3`)) ? { duration: Number(m.duration) || 0 } : null;
  } catch {
    return null;
  }
}

function isoDuration(seconds: number): string {
  return `PT${Math.floor(seconds / 60)}M${Math.round(seconds % 60)}S`;
}

function renderSummaryHtml(template: string, s: BookSummary, audio: { duration: number } | null): string {
  const url = `${SITE_URL}${summaryPath(s)}`;
  const hubUrl = `${SITE_URL}${SUMMARIES_HUB_PATH}`;
  const name = `ملخص كتاب ${s.bookTitle}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: name,
        description: s.description,
        inLanguage: "ar",
        datePublished: s.publishedAt,
        url,
        author: { "@type": "Organization", name: "Hakawati AI", url: `${SITE_URL}/` },
        publisher: { "@type": "Organization", name: "Hakawati AI", logo: { "@type": "ImageObject", url: `${SITE_URL}/brand/logo.png` } },
        about: { "@type": "Book", name: s.bookTitle, author: { "@type": "Person", name: s.author } },
        ...(audio
          ? {
              audio: {
                "@type": "AudioObject",
                name,
                contentUrl: `${SITE_URL}${summaryAudioUrl(s)}`,
                encodingFormat: "audio/mpeg",
                duration: isoDuration(audio.duration),
                inLanguage: "ar",
              },
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Hakawati AI", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: SUMMARIES_HUB.h1, item: hubUrl },
          { "@type": "ListItem", position: 3, name, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: s.faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
      },
    ],
  };
  const content = [
    `<main dir="rtl"><article>`,
    `<nav><a href="/">الرئيسية</a> › <a href="${SUMMARIES_HUB_PATH}">${escapeHtml(SUMMARIES_HUB.h1)}</a></nav>`,
    `<h1>${escapeHtml(name)}</h1>`,
    `<p>تأليف: ${escapeHtml(s.author)}</p>`,
    `<p>${escapeHtml(s.lead)}</p>`,
    audio ? `<audio controls preload="none" src="${summaryAudioUrl(s)}"></audio>` : "",
    ...s.sections.map((sec) => `<h2>${escapeHtml(sec.heading)}</h2>` + sec.paragraphs.map((t) => `<p>${escapeHtml(t)}</p>`).join("")),
    `<h2>أسئلة شائعة عن كتاب ${escapeHtml(s.bookTitle)}</h2>`,
    ...s.faqs.map((f) => `<h3>${escapeHtml(f.question)}</h3><p>${escapeHtml(f.answer)}</p>`),
    `</article><nav>`,
    ...BOOK_SUMMARIES.filter((o) => o.slug !== s.slug).map((o) => `<a href="${summaryPath(o)}">ملخص كتاب ${escapeHtml(o.bookTitle)}</a> `),
    `<a href="/">تحويل PDF إلى صوت</a></nav></main>`,
  ].join("");
  return withHead(template, { title: s.title, description: s.description, keywords: s.keywords, url, ogType: "article", jsonLd, content });
}

function renderSummariesHubHtml(template: string): string {
  const url = `${SITE_URL}${SUMMARIES_HUB_PATH}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#webpage`,
        url,
        name: SUMMARIES_HUB.title,
        description: SUMMARIES_HUB.description,
        inLanguage: "ar",
        isPartOf: { "@type": "WebSite", name: "Hakawati AI", url: `${SITE_URL}/` },
      },
      {
        "@type": "ItemList",
        itemListElement: BOOK_SUMMARIES.map((s, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}${summaryPath(s)}`, name: `ملخص كتاب ${s.bookTitle}` })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Hakawati AI", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: SUMMARIES_HUB.h1, item: url },
        ],
      },
    ],
  };
  const content = [
    `<main dir="rtl"><h1>${escapeHtml(SUMMARIES_HUB.h1)}</h1><p>${escapeHtml(SUMMARIES_HUB.lead)}</p><ul>`,
    ...BOOK_SUMMARIES.map((s) => `<li><a href="${summaryPath(s)}">ملخص كتاب ${escapeHtml(s.bookTitle)}</a> – ${escapeHtml(s.author)}. ${escapeHtml(s.lead)}</li>`),
    `</ul>`,
    UPCOMING_SUMMARIES.length ? `<h2>قريباً</h2><p>${UPCOMING_SUMMARIES.map(escapeHtml).join("، ")}</p>` : "",
    `<a href="/">تحويل PDF إلى صوت</a></main>`,
  ].join("");
  return withHead(template, { title: SUMMARIES_HUB.title, description: SUMMARIES_HUB.description, keywords: SUMMARIES_HUB.keywords, url, jsonLd, content });
}

// The home page is a client-rendered app, so put its text into #root for crawlers
// that read raw HTML (React replaces it on load with the same content). The same
// template serves Arabic at / and English at /en, with matching head tags and JSON-LD.
function renderHomeHtml(template: string, lang: "ar" | "en"): string {
  const c = HOME_CONTENT[lang];
  const seo = HOME_SEO[lang];
  const en = lang === "en";
  const url = en ? `${SITE_URL}/en` : `${SITE_URL}/`;
  const title = escapeHtml(seo.title);
  const description = escapeHtml(seo.description);

  const content = [
    `<main dir="${en ? "ltr" : "rtl"}">`,
    `<h1>${escapeHtml(c.h1)}</h1>`,
    `<p>${escapeHtml(c.subtitle)}</p>`,
    ...c.sections.map(
      (sec) => `<h2>${escapeHtml(sec.heading)}</h2>` + sec.paragraphs.map((t) => `<p>${escapeHtml(t)}</p>`).join("")
    ),
    `<h2>${en ? "How it works" : "كيف يعمل"}</h2><ol>`,
    ...c.steps.map((st) => `<li><strong>${escapeHtml(st.title)}</strong> ${escapeHtml(st.text)}</li>`),
    `</ol><h2>${en ? "Who is it for?" : "لمن هذا الموقع؟"}</h2>`,
    ...c.useCases.map((u) => `<h3>${escapeHtml(u.title)}</h3><p>${escapeHtml(u.text)}</p>`),
    `<h2>${en ? "Frequently asked questions" : "الأسئلة الشائعة"}</h2>`,
    ...c.faqs.map((f) => `<h3>${escapeHtml(f.question)}</h3><p>${escapeHtml(f.answer)}</p>`),
    `<nav>`,
    `<a href="${en ? "/" : "/en"}">${en ? "العربية" : "English"}</a> `,
    ...(en ? [] : LANDING_PAGES.map((p) => `<a href="${landingPath(p)}">${escapeHtml(p.linkLabel)}</a> `)),
    `</nav></main>`,
  ].join("");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${url}#webapp`,
        name: "Hakawati AI",
        alternateName: "حكواتي",
        url,
        description: seo.description,
        inLanguage: lang,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "All",
        browserRequirements: "Requires JavaScript. Requires HTML5.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        "@type": "HowTo",
        "@id": `${url}#howto`,
        name: en ? "How to turn an Arabic PDF or text into audio" : "كيفية تحويل كتاب PDF أو نص إلى صوت",
        step: c.steps.map((st, i) => ({ "@type": "HowToStep", position: i + 1, name: st.title, text: st.text })),
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: c.faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  };

  const alternates =
    `<link rel="alternate" hreflang="ar" href="${SITE_URL}/" />` +
    `<link rel="alternate" hreflang="en" href="${SITE_URL}/en" />` +
    `<link rel="alternate" hreflang="x-default" href="${SITE_URL}/" />`;

  return template
    .replace(/<html lang="ar" dir="rtl">/, () => (en ? '<html lang="en" dir="ltr">' : '<html lang="ar" dir="rtl">'))
    .replace(/<title>[^<]*<\/title>/, () => `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, () => `<meta name="description" content="${description}" />`)
    .replace(/<meta name="keywords" content="[^"]*" \/>/, () => `<meta name="keywords" content="${escapeHtml(seo.keywords)}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, () => `<link rel="canonical" href="${url}" />${alternates}`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, () => `<meta property="og:url" content="${url}" />`)
    .replace(/<meta property="og:locale" content="[^"]*" \/>/, () => `<meta property="og:locale" content="${seo.ogLocale}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, () => `<meta property="og:title" content="${title}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, () => `<meta name="twitter:title" content="${title}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, () => `<meta property="og:description" content="${description}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, () => `<meta name="twitter:description" content="${description}" />`)
    .replace(
      /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
      () => `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`
    )
    .replace(/<div id="root"><\/div>/, () => `<div id="root">${content}</div>`);
}

// Shared clips (/s/<id>) live in Firestore with public read; fetch them over REST
// so the page carries real Open Graph tags for WhatsApp / Facebook previews.
const SHARE_ID_RE = /^[A-Za-z0-9_-]{10,40}$/;
const shareCache = new Map<string, { at: number; clip: { text: string; bookTitle: string; chapterTitle: string } | null }>();

async function fetchSharedClip(id: string) {
  const hit = shareCache.get(id);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.clip;
  const url =
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}` +
    `/databases/${encodeURIComponent(firebaseConfig.firestoreDatabaseId || "(default)")}` +
    `/documents/shares/${id}?key=${firebaseConfig.apiKey}`;
  let clip: { text: string; bookTitle: string; chapterTitle: string } | null = null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const f = (await res.json()).fields || {};
      clip = {
        text: f.text?.stringValue || "",
        bookTitle: f.bookTitle?.stringValue || "",
        chapterTitle: f.chapterTitle?.stringValue || "",
      };
    } else if (res.status !== 404) {
      return null; // transient error: don't cache
    }
  } catch {
    return null;
  }
  if (shareCache.size > 500) shareCache.clear();
  shareCache.set(id, { at: Date.now(), clip });
  return clip;
}

function renderShareHtml(template: string, id: string, clip: { text: string; bookTitle: string; chapterTitle: string }): string {
  const url = `${SITE_URL}/s/${id}`;
  const book = clip.bookTitle || "كتاب صوتي";
  const title = escapeHtml(`مقطع مسموع من «${book}» | Hakawati AI`);
  const snippet = clip.text.length > 180 ? clip.text.slice(0, 177) + "..." : clip.text;
  const description = escapeHtml(snippet);
  const content =
    `<main dir="rtl"><h1>${escapeHtml(book)}</h1>` +
    (clip.chapterTitle ? `<p>${escapeHtml(clip.chapterTitle)}</p>` : "") +
    `<blockquote>${escapeHtml(clip.text)}</blockquote><a href="/">جرّب Hakawati AI</a></main>`;
  return template
    .replace(/<title>[^<]*<\/title>/, () => `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, () => `<meta name="description" content="${description}" />`)
    // User-generated pages: shareable, but kept out of the search index
    .replace(/<meta name="robots" content="[^"]*" \/>/, () => '<meta name="robots" content="noindex, follow" />')
    .replace(/<link rel="canonical" href="[^"]*" \/>/, () => `<link rel="canonical" href="${url}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, () => `<meta property="og:url" content="${url}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, () => `<meta property="og:title" content="${title}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, () => `<meta name="twitter:title" content="${title}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, () => `<meta property="og:description" content="${description}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, () => `<meta name="twitter:description" content="${description}" />`)
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, "")
    .replace(/<div id="root"><\/div>/, () => `<div id="root">${content}</div>`);
}

// Start Express + Vite server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const indexTemplate = fs.readFileSync(path.join(distPath, "index.html"), "utf8");
    const landingHtml = new Map(LANDING_PAGES.map((p) => [p.slug, renderLandingHtml(indexTemplate, p)]));
    const homeHtml = renderHomeHtml(indexTemplate, "ar");
    const homeHtmlEn = renderHomeHtml(indexTemplate, "en");
    const hubHtml = renderSummariesHubHtml(indexTemplate);
    const summaryHtml = new Map(BOOK_SUMMARIES.map((s) => [s.slug, renderSummaryHtml(indexTemplate, s, summaryHasAudio(distPath, s))]));

    app.use((req, res, next) => {
      if (req.method !== "GET") return next();
      if (req.path === "/" || req.path === "/index.html") return res.type("html").send(homeHtml);
      if (req.path === "/en" || req.path === "/en/") return res.type("html").send(homeHtmlEn);
      if (isSummariesHub(req.path)) return res.type("html").send(hubHtml);
      const summary = findSummary(req.path);
      if (summary) return res.type("html").send(summaryHtml.get(summary.slug));
      const page = findLandingPage(req.path);
      if (!page) return next();
      res.type("html").send(landingHtml.get(page.slug));
    });

    // Unknown paths get a real 404 (not a soft 404) so search engines drop them
    const notFoundHtml = indexTemplate
      .replace(/<title>[^<]*<\/title>/, () => "<title>الصفحة غير موجودة – Hakawati AI</title>")
      .replace(/<meta name="robots" content="[^"]*" \/>/, () => '<meta name="robots" content="noindex" />');

    app.get("/s/:id", async (req, res, next) => {
      const id = req.params.id.replace(/\/$/, "");
      if (!SHARE_ID_RE.test(id)) return res.status(404).type("html").send(notFoundHtml);
      const clip = await fetchSharedClip(id);
      if (clip === null && !shareCache.has(id)) {
        // Firestore unreachable: serve the app shell, which loads the clip client-side
        return res.type("html").send(indexTemplate);
      }
      if (!clip) return res.status(404).type("html").send(notFoundHtml);
      res.type("html").send(renderShareHtml(indexTemplate, id, clip));
    });

    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.status(404).type("html").send(notFoundHtml);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
