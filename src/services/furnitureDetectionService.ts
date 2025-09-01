/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

export interface FurnitureSet {
  id: string;
  name: string;
  description: string;
  category: 'living_room' | 'bedroom' | 'dining_room' | 'office' | 'decor' | 'lighting';
  imageUrl: string;
  confidence: number;
}

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
  
  const arr = dataUrl.split(',');
  if (arr.length < 2) throw new Error("Invalid data URL");
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
  
  const mimeType = mimeMatch[1];
  const data = arr[1];
  return { inlineData: { mimeType, data } };
};

/**
 * Detects complete furniture sets from an uploaded product image, thinking like an interior designer.
 * Focuses on identifying complete furniture groupings rather than individual components.
 */
export const detectFurnitureSets = async (imageFile: File): Promise<FurnitureSet[]> => {
  if (!import.meta.env.VITE_API_KEY) {
    throw new Error("VITE_API_KEY environment variable is not set");
  }
  
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
  const imagePart = await fileToPart(imageFile);

  const prompt = `
    You are an expert interior designer and furniture specialist. Analyze this uploaded product image to identify complete furniture sets and decor items that would be sold and used together as cohesive units.

    **Think like an Interior Designer:**
    - Focus on COMPLETE furniture sets rather than individual components
    - Consider how furniture is marketed and sold in showrooms
    - Group related pieces that work together aesthetically and functionally
    - Identify the primary furniture set that dominates the image

    **Furniture Set Categories to Identify:**

    1. **Living Room Sets:**
       - "3-Piece Sofa Set" (sofa + 2 chairs)
       - "Sectional Sofa Set" 
       - "Coffee Table Set" (coffee table + side tables)
       - "Entertainment Center Set"
       - "TV Wall Unit Set"

    2. **Bedroom Sets:**
       - "Master Bedroom Set" (bed + nightstands + dresser)
       - "Queen Bedroom Set"
       - "Kids Bedroom Set"
       - "Wardrobe Set"

    3. **Dining Room Sets:**
       - "6-Piece Dining Set" (table + 6 chairs)
       - "Bar Table Set"
       - "Breakfast Nook Set"

    4. **Office Sets:**
       - "Home Office Set" (desk + chair + storage)
       - "Executive Desk Set"

    5. **Decor Collections:**
       - "Wall Art Collection"
       - "Lighting Set" (multiple matching fixtures)
       - "Accent Furniture Set"

    **Requirements:**
    - Generate a cropped image showing ONLY the main furniture set (remove background/irrelevant items)
    - Name sets descriptively (e.g., "Modern Gray Sectional Sofa Set", "Rustic Oak Dining Set")
    - Focus on the DOMINANT furniture grouping in the image
    - Provide confidence score (0.1-1.0) based on how clearly the set is visible
    - Include brief description of style and key features
    - Assign appropriate category

    **Output:** Identify 1-3 main furniture sets maximum. Quality over quantity.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }, imagePart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            furniture_sets: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  category: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                },
                required: ["id", "name", "description", "category", "confidence"]
              }
            }
          },
          required: ["furniture_sets"]
        }
      }
    });

    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString);
    
    if (!result.furniture_sets || !Array.isArray(result.furniture_sets)) {
      console.warn("Model returned unexpected format for furniture sets, falling back to empty array.", result);
      return [];
    }

    // Convert the original image to data URL for now (in production, we'd generate cropped versions)
    const originalImageUrl = URL.createObjectURL(imageFile);
    
    return result.furniture_sets.map((set: any, index: number) => ({
      ...set,
      id: set.id || `furniture-set-${index}`,
      imageUrl: originalImageUrl, // Using original image for now
      confidence: Math.min(Math.max(set.confidence || 0.8, 0.1), 1.0)
    }));

  } catch (error) {
    console.error("Error detecting furniture sets:", error);
    throw new Error("Failed to analyze the furniture image. Please ensure the image shows clear furniture items.");
  }
};