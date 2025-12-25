
import { GoogleGenAI, Type } from "@google/genai";
import { DetectedWord, SourceLanguage } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async analyzePage(imageBlob: Blob, sourceLang: SourceLanguage = 'German'): Promise<DetectedWord[]> {
    const base64Data = await this.blobToBase64(imageBlob);
    
    // Adjust target language logic: if source is Arabic, maybe target English? 
    // But per instructions, we keep Arabic as a core helper.
    const targetLang = sourceLang === 'Arabic' ? 'English' : 'Arabic';

    const prompt = `You are a ${sourceLang}-${targetLang} language expert. 
    Analyze this document page.
    1. Find all text labels and vocabulary words in the image.
    2. For each word/label, identify its exact location in the image.
    3. Provide the ${targetLang} translation for each word.
    4. Provide a simple, short example sentence in ${sourceLang} using that word.
    5. Provide the ${targetLang} translation for that example sentence.
    6. Return the results as a JSON array where each object has:
       - "german": The ${sourceLang} word (use this key regardless of language).
       - "arabic": The ${targetLang} translation (use this key regardless of language).
       - "exampleGerman": A short example sentence in ${sourceLang}.
       - "exampleArabic": Translation of the example sentence in ${targetLang}.
       - "ymin", "xmin", "ymax", "xmax": Normalized coordinates (0-1000) of the text label.`;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: imageBlob.type,
                  data: base64Data
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                german: { type: Type.STRING },
                arabic: { type: Type.STRING },
                exampleGerman: { type: Type.STRING },
                exampleArabic: { type: Type.STRING },
                ymin: { type: Type.NUMBER },
                xmin: { type: Type.NUMBER },
                ymax: { type: Type.NUMBER },
                xmax: { type: Type.NUMBER }
              },
              required: ["german", "arabic", "exampleGerman", "exampleArabic", "ymin", "xmin", "ymax", "xmax"]
            }
          }
        }
      });

      const jsonStr = response.text || "[]";
      return JSON.parse(jsonStr).map((item: any, idx: number) => ({
        ...item,
        id: `word-${idx}-${Date.now()}`,
        sourceLanguage: sourceLang // Store the language of origin
      }));
    } catch (error) {
      console.error("Gemini analysis failed:", error);
      throw error;
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
