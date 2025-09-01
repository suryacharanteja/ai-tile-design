/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";

export interface BoundingBox {
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
}

export interface DetectedObject {
    name: string;
    bounding_box: BoundingBox;
    is_primary: boolean;
    category: 'interior' | 'furniture';
}

export interface DesignTheme {
    name: string;
    description: string;
    suggestions: {
        objectName: string;
        colorName: string;
        hex: string;
    }[];
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
 * Identifies distinct objects in a room image that are suitable for color changes.
 * @param imageFile The image file of the room.
 * @returns A promise that resolves to an array of detected objects.
 */
export const detectObjects = async (imageFile: File): Promise<DetectedObject[]> => {
    if (!import.meta.env.VITE_API_KEY) {
        throw new Error("VITE_API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    const imagePart = await fileToPart(imageFile);

    const prompt = `
        You are an expert computer vision model specializing in semantic segmentation for interior design applications. Your task is to act as a meticulous scene parser. Analyze the provided room image to identify and delineate every individual paintable surface and distinct object. The primary goal is to enable a user to select any single element (like a wall, a window frame, or a piece of furniture) for modification without affecting adjacent or overlapping items.

        **Core Directive: Precise Segmentation of Composite Surfaces**

        Your most critical function is to deconstruct composite surfaces into their constituent parts. Do not group elements.

        1.  **Wall and Window Separation:** A wall that contains a window must be identified as **two separate and distinct objects**:
            *   One object for the 'wall' itself.
            *   A second, separate object for the 'window'.
            *   **NEVER** label them as a single 'wall with window'.

        2.  **Wall and Fixture Separation:** Similarly, a wall with a picture frame, a light switch, or a mirror must be segmented into:
            *   The 'wall'.
            *   The 'picture frame' (as its own object).
            *   The 'light switch' (as its own object).
            *   The 'mirror' (as its own object).

        **Bounding Box Logic:**
        - The bounding box for a larger surface (like a wall) must encompass the entire visible area of that surface.
        - The bounding boxes for smaller objects on that surface (like a window or a picture frame) will naturally be located *inside* the bounding box of the larger surface. This is expected and correct. Your segmentation logic must be precise enough to differentiate them.

        **Categorization Rules:**

        - **'interior'**: This category is exclusively for major, non-movable architectural elements. This includes all "Walls", the "Floor", the "Ceiling", "Windows", "Doors", and fixed trim like "baseboards" or "crown molding".
        - **'furniture'**: This category is for all other items. This includes furniture (sofa, table), decor (rug, wall art, mirror), and fixtures (lamps, light switches).

        **Output Requirements:**

        For each identified item, provide the following in a JSON object:
        1.  **'name'**: A specific, descriptive name. Use location for clarity (e.g., "Back wall", "Window on back wall", "Left baseboard").
        2.  **'is_primary'**: \`true\` for the single most dominant object in each category (e.g., the largest wall, the main sofa), otherwise \`false\`.
        3.  **'category'**: Strictly 'interior' or 'furniture' based on the rules above.
        4.  **'bounding_box'**: A precise, normalized bounding box \`{x_min, y_min, x_max, y_max}\` for each object.

        Your final output must be a single JSON object with the key "objects", containing an array of these structured descriptions. The accuracy of your segmentation is paramount.
    `;
    
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Using flash for this task as it is efficient and cheaper
            contents: { parts: [ {text: prompt}, imagePart ]},
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        objects: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    is_primary: { type: Type.BOOLEAN },
                                    category: { type: Type.STRING },
                                    bounding_box: {
                                        type: Type.OBJECT,
                                        properties: {
                                            x_min: { type: Type.NUMBER },
                                            y_min: { type: Type.NUMBER },
                                            x_max: { type: Type.NUMBER },
                                            y_max: { type: Type.NUMBER },
                                        },
                                        required: ["x_min", "y_min", "x_max", "y_max"],
                                    }
                                },
                                required: ["name", "is_primary", "bounding_box", "category"]
                            }
                        }
                    },
                    required: ["objects"]
                },
            },
        });

        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString);
        if (!result.objects || !Array.isArray(result.objects)) {
            console.warn("Model returned unexpected format for objects, falling back to empty array.", result);
            return [];
        }
        return result.objects;
    } catch (error) {
        console.error("Error detecting objects:", error);
        throw new Error("Failed to parse the scene. The AI could not identify distinct objects.");
    }
};


/**
 * Generates interior design themes based on an image and its detected objects.
 * @param imageFile The image file of the room.
 * @param objects An array of DetectedObject.
 * @returns A promise that resolves to an array of design themes.
 */
export const getDesignThemes = async (imageFile: File, objects: DetectedObject[]): Promise<DesignTheme[]> => {
    if (!import.meta.env.VITE_API_KEY) {
        throw new Error("VITE_API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    const imagePart = await fileToPart(imageFile);
    const objectNames = objects.map(o => o.name).join(', ');

    const prompt = `
        You are an expert interior designer. Analyze the provided room image. Based on its style and the following list of detected objects, create 3 distinct and stylish design themes.
        The objects are: ${objectNames}.

        For each of the 3 themes:
        1.  'name': Give it a creative, descriptive name (e.g., "Scandinavian Serenity", "Industrial Loft", "Modern Coastal").
        2.  'description': Write a brief, one-sentence description of the theme's feel and aesthetic.
        3.  'suggestions': For each object in the original list, suggest a suitable color that fits the theme. Provide a common color name (e.g., "Sage Green") and its corresponding HEX code.
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
                        themes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING, description: "e.g., 'Scandinavian Serenity'" },
                                    description: { type: Type.STRING, description: "A brief description of the theme." },
                                    suggestions: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                objectName: { type: Type.STRING, description: "e.g., 'sofa'" },
                                                colorName: { type: Type.STRING, description: "e.g., 'Sage Green'" },
                                                hex: { type: Type.STRING, description: "e.g., '#B2AC88'" },
                                            },
                                            required: ["objectName", "colorName", "hex"],
                                        }
                                    }
                                },
                                required: ["name", "description", "suggestions"]
                            }
                        }
                    },
                    required: ["themes"]
                },
            },
        });
        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString);
        return result.themes || [];
    } catch (error) {
        console.error("Error generating design themes:", error);
        return [];
    }
};


/**
 * Modifies an image based on a custom prompt (e.g., changing colors, adding/removing objects).
 * Can optionally take a second image (e.g., a product) to be used in the modification.
 * @param baseImageFile The original scene image file.
 * @param prompt The detailed instructions for the AI.
 * @param productImageFile An optional second image file (e.g., a product to add).
 * @returns A promise that resolves to the data URL of the generated image.
 */
export const modifyImage = async (
  baseImageFile: File,
  prompt: string,
  productImageFile?: File | null
): Promise<string> => {
    if (!import.meta.env.VITE_API_KEY) {
        throw new Error("VITE_API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    
    const baseImagePart = await fileToPart(baseImageFile);
    const textPart = { text: prompt };

    // FIX: Explicitly type `parts` to allow both image and text content. This resolves a TypeScript error
    // where the array was inferred to only contain image parts, preventing the text part from being added.
    const parts: ({ inlineData: { mimeType: string; data: string; } } | { text: string })[] = [baseImagePart];
    if (productImageFile) {
        const productImagePart = await fileToPart(productImageFile);
        // The prompt should be structured to know which image is which.
        // The convention established in App.tsx is [scene, product, text].
        parts.push(productImagePart);
    }
    parts.push(textPart);

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        return `data:${mimeType};base64,${data}`;
    }

    console.error("Model response did not contain an image part.", response);
    throw new Error("The AI model did not return an image. Please try again.");
};

/**
 * Redesigns a floor in an image using a more powerful model for better results.
 * @param baseImageFile The original scene image file.
 * @param prompt The detailed instructions for the AI.
 * @returns A promise that resolves to the data URL of the generated image.
 */
export const redesignFloor = async (
  baseImageFile: File,
  prompt: string,
): Promise<string> => {
    if (!import.meta.env.VITE_API_KEY) {
        throw new Error("VITE_API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    
    const baseImagePart = await fileToPart(baseImageFile);
    const textPart = { text: prompt };
    const parts = [baseImagePart, textPart];

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        return `data:${mimeType};base64,${data}`;
    }

    console.error("Model response did not contain an image part.", response);
    throw new Error("The AI model did not return an image. Please try again.");
};

/**
 * Changes the color of an object in an image or applies a custom prompt.
 * @param imageFile The original image file.
 * @param selectedObject The name of the object to change.
 * @param selectedColor The desired color name.
 * @param customPrompt A custom text prompt for more complex edits.
 * @returns A promise that resolves to the data URL of the generated image.
 */
export const changeColor = async (
  imageFile: File,
  selectedObject: string | null,
  selectedColor: string | null,
  customPrompt: string
): Promise<string> => {
    if (!import.meta.env.VITE_API_KEY) {
        throw new Error("VITE_API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    const imagePart = await fileToPart(imageFile);

    const instruction = customPrompt 
        ? `Apply the following change: "${customPrompt}".`
        : `Change the color of the **${selectedObject}** to **${selectedColor}**.`;

    const prompt = `
        **Role:** You are a photorealistic interior design assistant. Your task is to modify a room image based on a specific instruction, while preserving the original image's integrity.

        **Core Instruction:**
        ${instruction}

        **Crucial Rules:**
        1.  **Photorealism:** The final image must be indistinguishable from a real photograph.
        2.  **Preservation:** You MUST preserve all other elements of the image. Textures, lighting, shadows, reflections, and objects not mentioned in the instruction must remain exactly as they were in the original image.
        3.  **Targeted Change:** Only modify the specified object or area. Do not alter the rest of the scene.
        4.  **No Text Output:** The output must ONLY be the modified image. Do not add any text, explanation, or commentary.
    `;

    const textPart = { text: prompt };

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        return `data:${mimeType};base64,${data}`;
    }

    console.error("Model response did not contain an image part.", response);
    throw new Error("The AI model did not return an image. Please try again.");
};