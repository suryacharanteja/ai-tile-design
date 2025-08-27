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
        Analyze the provided image of a room. Your task is to identify and list the main distinct objects and surfaces suitable for color changes. Be specific and granular; for example, if there are multiple walls visible, label them as "left wall", "back wall", "accent wall", etc.

        For each object you identify, provide the following:
        1.  'name': A clear, specific name (e.g., "left wall", "sofa", "hardwood floor", "window frame").
        2.  'is_primary': A boolean value. Set it to 'true' for the most prominent or largest single object suitable for a color change (like the main wall), and 'false' for all others. Only one object should be primary.
        3.  'bounding_box': An object containing the normalized coordinates of the object's bounding box. The coordinates (x_min, y_min, x_max, y_max) should be floats between 0.0 and 1.0, where (0,0) is the top-left corner.

        Return the response as a JSON object with a single key "objects" containing an array of these structured objects.
    `;
    
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
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
                                required: ["name", "is_primary", "bounding_box"]
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
            model: 'gemini-2.5-flash-image-preview',
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