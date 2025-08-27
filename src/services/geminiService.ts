/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Note: This is a mock implementation since we don't have access to the actual Google Gemini API in this environment
// In a real implementation, you would use the @google/generative-ai package

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

// Mock implementation for demonstration
export const detectObjects = async (imageFile: File): Promise<DetectedObject[]> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return mock detected objects for demonstration
    return [
        {
            name: "main wall",
            bounding_box: { x_min: 0.1, y_min: 0.1, x_max: 0.9, y_max: 0.7 },
            is_primary: true
        },
        {
            name: "sofa",
            bounding_box: { x_min: 0.2, y_min: 0.5, x_max: 0.6, y_max: 0.9 },
            is_primary: false
        },
        {
            name: "coffee table",
            bounding_box: { x_min: 0.35, y_min: 0.65, x_max: 0.55, y_max: 0.8 },
            is_primary: false
        },
        {
            name: "floor",
            bounding_box: { x_min: 0.0, y_min: 0.7, x_max: 1.0, y_max: 1.0 },
            is_primary: false
        }
    ];
};

export const getDesignThemes = async (imageFile: File, objects: DetectedObject[]): Promise<DesignTheme[]> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return mock design themes
    return [
        {
            name: "Modern Minimalist",
            description: "Clean lines and neutral tones for a sophisticated, uncluttered aesthetic.",
            suggestions: objects.map(obj => ({
                objectName: obj.name,
                colorName: obj.name === "main wall" ? "Pure White" : obj.name === "sofa" ? "Charcoal Gray" : obj.name === "coffee table" ? "Natural Oak" : "Light Gray",
                hex: obj.name === "main wall" ? "#FFFFFF" : obj.name === "sofa" ? "#36454F" : obj.name === "coffee table" ? "#D2B48C" : "#D3D3D3"
            }))
        },
        {
            name: "Scandinavian Warmth",
            description: "Cozy earth tones and natural textures inspired by Nordic design principles.",
            suggestions: objects.map(obj => ({
                objectName: obj.name,
                colorName: obj.name === "main wall" ? "Warm Beige" : obj.name === "sofa" ? "Forest Green" : obj.name === "coffee table" ? "Birch Wood" : "Cream White",
                hex: obj.name === "main wall" ? "#F5F5DC" : obj.name === "sofa" ? "#228B22" : obj.name === "coffee table" ? "#F5DEB3" : "#FFFDD0"
            }))
        },
        {
            name: "Coastal Serenity",
            description: "Ocean-inspired blues and sandy neutrals for a tranquil, beach-house vibe.",
            suggestions: objects.map(obj => ({
                objectName: obj.name,
                colorName: obj.name === "main wall" ? "Ocean Blue" : obj.name === "sofa" ? "Sandy Beige" : obj.name === "coffee table" ? "Driftwood" : "Sea Salt",
                hex: obj.name === "main wall" ? "#4682B4" : obj.name === "sofa" ? "#F5E6D3" : obj.name === "coffee table" ? "#8B7355" : "#F8F8FF"
            }))
        }
    ];
};

export const changeColor = async (
    imageFile: File,
    selectedObject: string | null,
    selectedColor: string | null,
    customPrompt: string
): Promise<string> => {
    // Simulate AI image generation delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // In a real implementation, this would call the Gemini API to generate a new image
    // For now, we'll return the original image URL as a placeholder
    return URL.createObjectURL(imageFile);
};