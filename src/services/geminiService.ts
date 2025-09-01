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
 * Identifies complete furniture sets and objects in a product image for interior design.
 * Focuses on high-level furniture pieces rather than individual components.
 * @param imageFile The product image file.
 * @returns A promise that resolves to an array of detected furniture objects.
 */
export const detectFurnitureObjects = async (imageFile: File): Promise<DetectedObject[]> => {
    if (!import.meta.env.VITE_API_KEY) {
        throw new Error("VITE_API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    const imagePart = await fileToPart(imageFile);

    const prompt = `
        **ROLE:** You are a master interior designer and furniture expert analyzing product images for precise object detection and room placement.

        **OBJECTIVE:** Identify complete, placeable furniture pieces and decor items that can be integrated into interior spaces as functional units.

        **FURNITURE DETECTION PRIORITIES:**
        Focus ONLY on complete, ready-to-place items that an interior designer would specify:

        **PRIMARY CATEGORIES:**
        - **Seating**: Complete sofas, sectionals, chairs, benches (as unified pieces)
        - **Tables**: Coffee tables, dining tables, side tables, console tables
        - **Storage**: Wardrobes, dressers, bookshelves, cabinets, storage units
        - **Bedroom**: Complete beds, nightstands, dressing tables
        - **Lighting**: Floor lamps, table lamps, chandeliers, pendant lights
        - **Decor Items**: Wall art, mirrors, sculptures, vases, decorative objects
        - **Plants & Planters**: Indoor plants in containers, decorative planters

        **DETECTION RULES:**
        1. **Complete Units Only**: Detect furniture as complete, placeable pieces
        2. **Interior Designer Perspective**: Think "What would I specify for a room?"
        3. **Functional Grouping**: Group items that work together (e.g., "Dining Set" not individual chairs)
        4. **NO Component Breakdown**: Never separate cushions, drawers, or parts
        5. **Placement-Ready**: Only items that can be physically placed in a room

        **ENHANCED EXAMPLES:**
        - ✅ "Modern Sectional Sofa", "Wooden Coffee Table", "Floor Lamp"
        - ✅ "Wall Mirror Set", "Decorative Vase", "Indoor Plant"
        - ❌ "Left sofa cushion", "Table leg", "Lamp shade"

        **BOUNDING BOX PRECISION:**
        - Cover the COMPLETE object including all visual boundaries
        - Include shadows and bases for floor items
        - For wall items, include mounting hardware if visible
        - Ensure tight, accurate bounds for optimal placement extraction

        **OUTPUT REQUIREMENTS:**
        For each detected furniture/decor piece:
        1. **'name'**: Descriptive, placement-ready name (e.g., "Mid-Century Coffee Table")
        2. **'is_primary'**: true for the most prominent/central item in the image
        3. **'category'**: Always 'furniture' for this interior design analysis
        4. **'bounding_box'**: Precise normalized coordinates for perfect object extraction

        Return JSON with "objects" array containing these placement-ready furniture pieces.
    `;
    
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [ {text: prompt}, imagePart ]},
        });

        const jsonString = response.text?.trim() || '';
        
        // Sometimes the model might include markdown backticks around the JSON
        const cleanedJsonString = jsonString.replace(/^```json\n|\n```$/g, '').trim();

        const parsedResult = JSON.parse(cleanedJsonString);
        
        if (!parsedResult.objects || !Array.isArray(parsedResult.objects)) {
            console.warn("Model returned unexpected format for objects, falling back to empty array.", parsedResult);
            return [];
        }
        return parsedResult.objects;
    } catch (error) {
        console.error("Error detecting furniture objects:", error);
        throw new Error("Failed to parse the furniture. The AI could not identify furniture pieces.");
    }
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

/**
 * Places a new object (furniture/decor) at a specific position in the room image.
 * @param baseImageFile The original room image file.
 * @param productImageFile The product/object image to be placed.
 * @param position The x,y coordinates where to place the object (normalized 0-1).
 * @param objectToRemove Optional object to remove before placing the new one.
 * @returns A promise that resolves to the data URL of the generated image.
 */
export const placeObject = async (
  baseImageFile: File,
  productImageFile: File,
  position: { x: number; y: number },
  objectToRemove?: DetectedObject
): Promise<string> => {
    if (!import.meta.env.VITE_API_KEY) {
        throw new Error("VITE_API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    
    const baseImagePart = await fileToPart(baseImageFile);
    const productImagePart = await fileToPart(productImageFile);

    const positionPercentX = Math.round(position.x * 100);
    const positionPercentY = Math.round(position.y * 100);

    let prompt = `
        **CRITICAL INSTRUCTION: PRESERVE ORIGINAL IMAGE DIMENSIONS**
        You MUST maintain the exact same aspect ratio and dimensions as the original room image. NO cropping, clipping, or resizing allowed.

        **Role:** You are a master interior designer with expertise in photorealistic furniture placement and spatial composition.

        **Primary Task:** 
        Analyze the room from the first image and intelligently place the furniture/object from the second image at the user-specified coordinates, creating a perfectly integrated result.

        **SPATIAL ANALYSIS REQUIREMENTS:**
        1. **Room Context Understanding:**
           - Analyze the room's architectural features (walls, floor, ceiling, windows)
           - Identify existing furniture placement patterns and traffic flow
           - Understand the room's lighting conditions and perspective depth
           - Determine the most suitable surface for object placement (floor, wall, table, etc.)

        2. **Smart Placement Logic:**
           - Target position: ${positionPercentX}% from left, ${positionPercentY}% from top
           - If target is on a wall: place object appropriately on the wall surface
           - If target is on floor: place object on floor with proper ground contact
           - If target is near existing furniture: integrate naturally with existing pieces
           - Respect room scale and proportions

        3. **PERSPECTIVE & SCALING ACCURACY:**
           - Calculate proper object size based on room depth and perspective
           - Objects closer to camera should appear larger, farther objects smaller
           - Maintain realistic proportions relative to room and existing furniture
           - Apply correct foreshortening and perspective distortion

        4. **PHOTOREALISTIC INTEGRATION:**
           - Match room's lighting direction, intensity, and color temperature
           - Generate accurate shadows that follow the room's light sources
           - Add reflections on appropriate surfaces (glossy floors, mirrors, etc.)
           - Blend object edges seamlessly with the environment
           - Maintain consistent image quality and grain throughout`;

    if (objectToRemove) {
        prompt += `

        **OBJECT REMOVAL FIRST:**
        - Carefully remove "${objectToRemove.name}" from the room
        - Reconstruct the background area using surrounding patterns and textures
        - Ensure no traces or artifacts remain from the removed object
        - Maintain architectural continuity (wall patterns, floor textures, etc.)`;
    }

    prompt += `

        **TECHNICAL REQUIREMENTS:**
        1. **NO IMAGE MODIFICATION:** Preserve exact original dimensions and aspect ratio
        2. **SEAMLESS INTEGRATION:** No visible edges, artifacts, or inconsistencies
        3. **REALISTIC PHYSICS:** Objects must follow gravity and spatial rules
        4. **LIGHTING CONSISTENCY:** All shadows and highlights must match room lighting
        5. **MATERIAL ACCURACY:** Preserve object textures and material properties
        6. **DEPTH PERCEPTION:** Maintain proper z-order and occlusion relationships

        **OUTPUT:** Return ONLY the modified photorealistic image with the object perfectly placed.
    `;

    const textPart = { text: prompt };
    const parts = [baseImagePart, productImagePart, textPart];

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts },
        });

        const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

        if (imagePartFromResponse?.inlineData) {
            const { mimeType, data } = imagePartFromResponse.inlineData;
            return `data:${mimeType};base64,${data}`;
        }

        console.error("Model response did not contain an image part.", response);
        throw new Error("The AI model did not return an image. Please try again.");
    } catch (error) {
        console.error("Error in placeObject:", error);
        throw new Error("Failed to place object. The AI could not complete the placement.");
    }
};