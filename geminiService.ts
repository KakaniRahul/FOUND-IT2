
import { GoogleGenAI, Type } from "@google/genai";
import { ItemCategory } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeItem = async (description: string, imageBase64?: string) => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Analyze this lost or found item. Extract a concise title, recommend a category from [${Object.values(ItemCategory).join(', ')}], and generate 3-5 relevant tags.
  Description: ${description}`;

  const contents: any[] = [{ text: prompt }];
  if (imageBase64) {
    contents.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageBase64.split(',')[1] || imageBase64
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: contents },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            category: { type: Type.STRING },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            aiDescription: { type: Type.STRING, description: "A refined, professional description of the item" }
          },
          required: ["title", "category", "tags"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return null;
  }
};

export const generateItemImage = async (title: string, description: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `A clear, high-quality photograph of a lost item: ${title}. ${description}. The item is on a neutral campus background like a wooden table. No people. Studio lighting. Professional lost and found catalog style.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        },
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const findMatches = async (newItem: any, existingItems: any[]) => {
  const model = "gemini-3-flash-preview";
  // Filter for opposite status (Lost matches Found)
  const candidates = existingItems.filter(i => i.status !== newItem.status && i.category === newItem.category);
  
  if (candidates.length === 0) return [];

  const context = candidates.map(i => `${i.id}: ${i.title} - ${i.description}`).join('\n');
  
  const prompt = `Goal: Find matching items between reported LOST and FOUND entries.
  Reference Item: "${newItem.title} - ${newItem.description}"
  Candidates:
  ${context}
  
  Return the IDs of the top 3 most likely matching items as a JSON array. If none match, return an empty array.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    return [];
  }
};
