/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export interface BoundingBox {
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
}

export interface DetectedFurnitureSet {
    name: string;
    description: string;
    bounding_box: BoundingBox;
    is_primary: boolean;
    category: string;
    set_type: 'furniture_set' | 'single_piece' | 'decor_group';
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
 * Detects complete furniture sets and decor groups in an image, thinking like an interior designer.
 * Focuses on placeable units rather than individual components.
 * @param imageFile The room image file.
 * @returns A promise that resolves to an array of detected furniture sets.
 */
export const detectFurnitureSets = async (imageFile: File): Promise<DetectedFurnitureSet[]> => {
    if (!import.meta.env.VITE_API_KEY) {
        throw new Error("VITE_API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    const imagePart = await fileToPart(imageFile);

    const prompt = `
        **ROLE:** You are a master interior designer and furniture expert analyzing room images to identify complete, placeable furniture sets and decor groups for interior design placement.

        **OBJECTIVE:** Think like an interior designer who is cataloguing complete furniture sets and decor collections that can be specified, purchased, and placed as unified units in interior spaces.

        **INTERIOR DESIGNER MINDSET:**
        Focus on complete, ready-to-specify furniture sets and decor groups:

        **PRIMARY FURNITURE SETS TO DETECT:**
        - **Living Room Sets**: "3-Piece Sectional Sofa Set", "Coffee Table & Side Table Set", "Entertainment Center Set"
        - **Dining Sets**: "Dining Table & Chairs Set", "Complete Dining Room Set"  
        - **Bedroom Sets**: "Master Bedroom Set" (bed + nightstands + dresser), "Nightstand Pair"
        - **Office Sets**: "Home Office Desk Set", "Executive Office Suite"
        - **Storage Systems**: "Modular Shelving System", "Walk-in Closet System", "Media Storage Unit"
        - **Seating Collections**: "Accent Chair Pair", "Ottoman Set", "Bar Stool Set"
        - **Lighting Collections**: "Pendant Light Trio", "Floor & Table Lamp Set", "Chandelier Set"

        **DECOR GROUPS TO DETECT:**
        - **Wall Art Collections**: "Gallery Wall Set", "Mirror Collection", "Art Triptych"
        - **Plant Collections**: "Indoor Plant Arrangement", "Succulent Garden Set"
        - **Textile Groups**: "Throw Pillow Collection", "Area Rug & Runner Set"
        - **Decorative Sets**: "Vase & Sculpture Collection", "Candle Arrangement"

        **DETECTION PRINCIPLES:**
        1. **Complete Units Only**: Detect furniture as complete, purchasable sets an interior designer would specify
        2. **Functional Grouping**: Group items that work together functionally and aesthetically
        3. **Interior Designer Perspective**: Think "What complete set would I order for this space?"
        4. **Set Thinking**: Multiple similar items = "Set" (e.g., "Dining Chair Set" not individual chairs)
        5. **Placement Ready**: Only detect items that can be specified and placed as unified collections

        **ENHANCED EXAMPLES:**
        - ✅ "Modern Sectional Sofa Set", "Rustic Dining Table & Chair Set", "Contemporary Bedroom Set"
        - ✅ "Gallery Wall Art Collection", "Indoor Plant Arrangement", "Pendant Light Trio"
        - ❌ "Single chair", "One pillow", "Individual lamp shade"

        **NAMING CONVENTION:**
        Use descriptive, specification-ready names:
        - Style + Item + "Set/Collection/Arrangement" (e.g., "Mid-Century Coffee Table Set")
        - For single major pieces: Style + Item (e.g., "Contemporary Sectional Sofa")

        **OUTPUT REQUIREMENTS:**
        For each detected furniture set/collection:
        1. **'name'**: Descriptive, specification-ready name (e.g., "Scandinavian Living Room Set")
        2. **'description'**: Brief description of what's included in the set (e.g., "3-seat sofa, loveseat, and coffee table")
        3. **'is_primary'**: true for the most prominent/central set in the room
        4. **'category'**: Always 'furniture' for this interior design analysis
        5. **'set_type'**: 'furniture_set' for multi-piece furniture, 'single_piece' for major single items, 'decor_group' for decorative collections
        6. **'bounding_box'**: Precise normalized coordinates covering the complete set

        Return a JSON object with a single top-level key "furniture_sets" which is an array of these complete furniture collections ready for interior design specification.

        The JSON structure should strictly follow this format:
        \`\`\`json
        {
          "furniture_sets": [
            {
              "name": "string",
              "description": "string", 
              "is_primary": boolean,
              "category": "string",
              "set_type": "string",
              "bounding_box": {
                "x_min": number,
                "y_min": number,
                "x_max": number,
                "y_max": number
              }
            }
          ]
        }
        \`\`\`
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [{ text: prompt }, imagePart] },
        });

        const jsonString = response.text.trim();
        
        // Clean JSON string from markdown backticks if present
        const cleanedJsonString = jsonString.replace(/^```json\n|\n```$/g, '').trim();

        const parsedResult = JSON.parse(cleanedJsonString);
        
        if (!parsedResult.furniture_sets || !Array.isArray(parsedResult.furniture_sets)) {
            console.warn("Model returned unexpected format for furniture_sets, falling back to empty array.", parsedResult);
            return [];
        }
        return parsedResult.furniture_sets;
    } catch (error) {
        console.error("Error detecting furniture sets:", error);
        throw new Error("Failed to parse the furniture. The AI could not identify complete furniture sets.");
    }
};