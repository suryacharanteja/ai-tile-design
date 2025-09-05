/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { modifyImage, getDesignThemes, DetectedObject, DesignTheme, detectObjects, redesignFloor, placeObject } from '../services/geminiService';
import { detectFurnitureSets, FurnitureSet } from '../services/furnitureDetectionService';
import Header from '../components/Header';
import RoomTypeSelector from '../components/RoomTypeSelector';
import ImageUploader from '../components/ImageUploader';
import Spinner from '../components/Spinner';
import DebugModal from '../components/DebugModal';
import { Product } from '../types';
import AddProductModal from '../components/AddProductModal';
import PreviewModal from '../components/PreviewModal';
import ColorPickerPopover from '../components/ColorPickerPopover';
import FurnitureSetCard from '../components/FurnitureSetCard';
import { Textarea } from '../components/ui/textarea';
import Footer from '../components/Footer';
import { getTilesByRoomType, KajariaTile } from '../types/kajaria';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { ArrowLeft, Eye, Download, Wand2 } from 'lucide-react';

enum AppState {
  Initial,
  Detecting,
  Editing,
  Generating,
}

type EditorTab = 'manual' | 'themes' | 'placement' | 'floor';
type AccordionState = {
  interior: boolean;
  furniture: boolean;
  aiColors: boolean;
  standardColors: boolean;
  wood: boolean;
  marble: boolean;
  granite: boolean;
  tiles: boolean;
  other: boolean;
};

// --- UI Icons ---
const UndoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>;
const RedoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>;
const ZoomInIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>;
const ZoomOutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>;
const ResetViewIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l16 16" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const FullScreenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m0 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m0 0v-4m0 4l-5-5" /></svg>;
const ChevronDownIcon = ({ open }: { open: boolean }) => <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
const RefreshIcon = ({ spinning }: { spinning: boolean }) => <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${spinning ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5m7 11v-5h-5M4.88 9.88a8 8 0 1114.24 0M2.84 14.12a8 8 0 010-8.24" /></svg>;


const standardPalettes = [
    { name: 'Vibrant Accents', colors: ['#D32F2F', '#FFC107', '#0288D1', '#388E3C', '#7B1FA2', '#F57C00'] },
    { name: 'Architectural Neutrals', colors: ['#212121', '#616161', '#BDBDBD', '#F5F5F5', '#FFFFFF', '#E8E8E8'] },
    { name: 'Earthy Tones', colors: ['#A1887F', '#795548', '#8D6E63', '#5D4037', '#607D8B', '#455A64'] },
    { name: 'Soft Pastels', colors: ['#F3E5F5', '#E1F5FE', '#E8F5E9', '#FFFDE7', '#FCE4EC', '#F1F8E9'] },
];

interface FloorTexture { name: string; prompt: string; }
interface FloorTextureCategory { category: string; textures: FloorTexture[]; }

const floorTextures: FloorTextureCategory[] = [
  { category: 'Wooden Textures', textures: [
      { name: 'Light Oak', prompt: 'a photorealistic light oak wood floor' },
      { name: 'Dark Walnut', prompt: 'a photorealistic dark walnut wood floor' },
      { name: 'Herringbone Oak', prompt: 'a photorealistic light oak wood floor in a classic herringbone pattern' },
      { name: 'Cherry Wood', prompt: 'a photorealistic cherry wood floor with a warm, reddish tone' },
      { name: 'Grey Washed Wood', prompt: 'a photorealistic grey washed wood floor with a modern, weathered look' },
      { name: 'Bamboo', prompt: 'a photorealistic natural bamboo wood floor' },
  ]},
  { category: 'Marble Textures', textures: [
      { name: 'White Carrara', prompt: 'a photorealistic polished White Carrara marble floor with subtle grey veining' },
      { name: 'Calacatta Gold', prompt: 'a photorealistic polished Calacatta Gold marble floor with dramatic grey and gold veining' },
      { name: 'Nero Marquina', prompt: 'a photorealistic polished Nero Marquina black marble floor with striking white veining' },
      { name: 'Crema Marfil', prompt: 'a photorealistic polished Crema Marfil marble floor with a uniform creamy beige color' },
  ]},
  { category: 'Granite Textures', textures: [
      { name: 'Absolute Black', prompt: 'a photorealistic polished Absolute Black granite floor, solid and deep black' },
      { name: 'Baltic Brown', prompt: 'a photorealistic polished Baltic Brown granite floor with its characteristic circular pattern' },
      { name: 'Kashmir White', prompt: 'a photorealistic polished Kashmir White granite floor with cranberry-colored specks' },
      { name: 'Tan Brown', prompt: 'a photorealistic polished Tan Brown granite floor with a dark brown and black pattern' },
  ]},
  { category: 'Tile Textures', textures: [
      { name: 'Large Concrete', prompt: 'a photorealistic floor of large format polished concrete tiles with minimal grout lines' },
      { name: 'Ceramic Subway', prompt: 'a photorealistic floor of white ceramic subway tiles in an offset pattern with light grey grout' },
      { name: 'Hexagon Porcelain', prompt: 'a photorealistic floor of matte grey porcelain hexagon tiles with dark grout' },
      { name: 'Spanish Patterned', prompt: 'a photorealistic floor of ceramic tiles with a colorful, intricate Spanish or Moroccan pattern' },
      { name: 'Slate', prompt: 'a photorealistic floor of natural slate tiles with a textured, multi-colored surface' },
  ]},
  { category: 'Other Materials', textures: [
      { name: 'Black & White Chess', prompt: 'a photorealistic classic black and white checkered tile floor in a high gloss finish' },
      { name: 'Polished Concrete', prompt: 'a photorealistic seamless polished concrete floor with a smooth, modern industrial look' },
      { name: 'Terrazzo', prompt: 'a photorealistic colorful terrazzo floor with multi-colored marble chips set in a white cement base' },
      { name: 'Blue/Grey Gradient', prompt: 'a photorealistic seamless floor with a smooth gradient from cool blue to a light silver grey' },
  ]},
];

const dataUrlToFile = async (dataUrl: string, filename: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
};

const getLoadingMessage = (activeTab: EditorTab, objectToRemove?: any, placementPrompt?: string, selectedFurnitureSet?: any): string => {
  switch (activeTab) {
    case 'manual':
      return '🎨 Painting your room with precision...';
    case 'floor':
      return '✨ Adding new style to your floor...';
    case 'themes':
      return '🏠 Your room will be stylized beautifully...';
    case 'placement':
      if (objectToRemove) {
        return '🗑️ Removing objects from your space...';
      } else if (selectedFurnitureSet) {
        return '📦 Placing your custom furniture precisely...';
      } else if (placementPrompt) {
        return '🪑 Adding new objects to your room...';
      }
      return '🔄 Processing your object placement...';
    default:
      return '🔄 Processing your request...';
  }
};

const Index: React.FC = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'visualizer'>('dashboard');
  const [selectedRoomType, setSelectedRoomType] = useState<string>('');
  const [kajariaTiles, setKajariaTiles] = useState<KajariaTile[]>([]);
  const [appState, setAppState] = useState<AppState>(AppState.Initial);
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [designThemes, setDesignThemes] = useState<DesignTheme[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);
  const [selectedObject, setSelectedObject] = useState<DetectedObject | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState<EditorTab>('manual');
  const [selectedColor, setSelectedColor] = useState<string>('#E0E0E0');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPanPoint = useRef({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [placementPrompt, setPlacementPrompt] = useState<string>('');
  const [isAddProductModalOpen, setAddProductModalOpen] = useState(false);
  const [touchGhost, setTouchGhost] = useState<{ imageUrl: string | null; position: { x: number; y: number } | null }>({ imageUrl: null, position: null });
  const [debugInfo, setDebugInfo] = useState<{ imageUrl: string | null; prompt: string | null }>({ imageUrl: null, prompt: null });
  const [isDebugModalOpen, setDebugModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [accordionState, setAccordionState] = useState<AccordionState>({
    interior: true, furniture: true, aiColors: true, standardColors: true,
    wood: true, marble: false, granite: false, tiles: false, other: false,
  });
  const [activeThemeIndex, setActiveThemeIndex] = useState<number | null>(null);
  const [objectToRemove, setObjectToRemove] = useState<DetectedObject | null>(null);
  const [placementMarker, setPlacementMarker] = useState<{ x: number; y: number } | null>(null);
  const [isRedetecting, setIsRedetecting] = useState(false);
  const [detectedFurnitureSets, setDetectedFurnitureSets] = useState<FurnitureSet[]>([]);
  const [selectedFurnitureSet, setSelectedFurnitureSet] = useState<FurnitureSet | null>(null);
  const [isDetectingFurniture, setIsDetectingFurniture] = useState(false);
  const [uploadStep, setUploadStep] = useState<'upload' | 'detect' | 'select' | 'place'>('upload');

  const beforeImageRef = useRef<HTMLImageElement>(null);
  const afterImageRef = useRef<HTMLImageElement>(null);

  const clearError = () => setErrorMessage(null);
  
  const handleRoomTypeSelect = (roomType: string) => {
    setSelectedRoomType(roomType);
    setKajariaTiles(getTilesByRoomType(roomType));
    setCurrentView('visualizer');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedRoomType('');
    setAppState(AppState.Initial);
    setOriginalImage(null);
    setOriginalImageUrl(null);
    setDisplayImageUrl(null);
    setDetectedObjects([]);
    setHistory([]);
    setHistoryIndex(-1);
  };

  const handleStartOver = useCallback(() => {
    setAppState(AppState.Initial);
    setOriginalImage(null);
    setOriginalImageUrl(null);
    setDisplayImageUrl(null);
    setDetectedObjects([]);
    setDesignThemes([]);
    setThemesLoading(false);
    setSelectedObject(null);
    setHistory([]);
    setHistoryIndex(-1);
    setActiveTab('manual');
    setSelectedColor('#E0E0E0');
    setIsColorPickerOpen(false);
    setCustomPrompt('');
    setErrorMessage(null);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setProducts([]);
    setSelectedProduct(null);
    setPlacementPrompt('');
    setObjectToRemove(null);
    setDebugInfo({ imageUrl: null, prompt: null });
    setAccordionState({
      interior: true, furniture: true, aiColors: true, standardColors: true,
      wood: true, marble: false, granite: false, tiles: false, other: false,
    });
    setActiveThemeIndex(null);
    setDetectedFurnitureSets([]);
    setSelectedFurnitureSet(null);
    setIsDetectingFurniture(false);
    setUploadStep('upload');
  }, []);

  const handleFileSelect = async (file: File) => {
    clearError();
    setOriginalImage(file);
    const url = URL.createObjectURL(file);
    setOriginalImageUrl(url);
    setDisplayImageUrl(url);
    setAppState(AppState.Detecting);
    setHistory([url]);
    setHistoryIndex(0);

    try {
      const objects = await detectObjects(file);
      setDetectedObjects(objects);
      setAppState(AppState.Editing);

      setThemesLoading(true);
      try {
        const themes = await getDesignThemes(file, objects);
        setDesignThemes(themes);
        if (themes.length > 0) {
            setActiveThemeIndex(0); // Open the first theme by default
        }
      } catch (themeError) {
        console.warn("Could not fetch AI design themes:", themeError);
      } finally {
        setThemesLoading(false);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred during object detection.");
      setAppState(AppState.Initial); // Revert to initial state on failure
    }
  };

  const updateHistory = (newImageUrl: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setDisplayImageUrl(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setDisplayImageUrl(history[newIndex]);
    }
  };

  const handleManualGenerate = async () => {
    if (!displayImageUrl || !originalImage) return;
    clearError();
    setAppState(AppState.Generating);

    let prompt = '';
    if (selectedObject) {
        const otherObjects = detectedObjects.filter(obj => obj.name !== selectedObject.name);
        const otherObjectsContext = otherObjects.length > 0
            ? `**List of Other Detected Objects (For Exclusion Masking):**\n${otherObjects.map(obj => `- Object: "${obj.name}", BBox: [${obj.bounding_box.x_min.toFixed(4)}, ${obj.bounding_box.y_min.toFixed(4)}, ${obj.bounding_box.x_max.toFixed(4)}, ${obj.bounding_box.y_max.toFixed(4)}]`).join('\n')}`
            : '**List of Other Detected Objects (For Exclusion Masking):**\n- None';

       prompt = `
You are a hyper-precise, technical computer vision agent. Your ONLY function is to perform a perfect, targeted color replacement on a specific object within an image, while strictly respecting the boundaries of all other identified objects. This is a technical masking and coloring operation, not a creative one. Follow these instructions with zero deviation.

**OPERATION:** Recolor a single, specified object.

**INPUT PARAMETERS:**
- **Target Object to Recolor:**
  - Name: "${selectedObject.name}"
  - Bounding Box (Primary Locator): [${selectedObject.bounding_box.x_min.toFixed(4)}, ${selectedObject.bounding_box.y_min.toFixed(4)}, ${selectedObject.bounding_box.x_max.toFixed(4)}, ${selectedObject.bounding_box.y_max.toFixed(4)}]
- **Target Color (HEX - Non-negotiable):** "${selectedColor}"
${otherObjectsContext}

**EXECUTION ALGORITHM (MUST BE FOLLOWED EXACTLY):**

1.  **DEFINE POSITIVE MASK:** Identify the primary geometry of the target object "${selectedObject.name}" located strictly inside its specified Bounding Box. This is your initial area of interest.

2.  **DEFINE NEGATIVE MASK (CRITICAL STEP):** From the 'List of Other Detected Objects', identify ANY objects whose bounding boxes overlap with or are inside the Target Object's bounding box. Create a combined "negative mask" from the precise geometry of ALL these other objects. For example, if the target is "Back wall", the negative mask MUST include the "Window on back wall" and any other objects on that wall.

3.  **CALCULATE FINAL MASK:** The final mask for recoloring is the **POSITIVE MASK minus the NEGATIVE MASK**. You will ONLY apply color to the pixels in this final, calculated region. This is the most critical step to prevent color from spilling onto adjacent or contained objects.

4.  **APPLY COLOR:**
    a. For every pixel within the **FINAL MASK**:
    b. Replace its base color with the pure \`${selectedColor}\`.
    c. Analyze the original lighting (shadows, highlights) on that exact pixel from the source image.
    d. Re-apply ONLY the lighting/shadow information (luma/value) to the new base color. The hue and saturation MUST remain identical to \`${selectedColor}\`.

5.  **VALIDATION & OUTPUT:**
    a. **Edge Fidelity:** The recolored area's edges must be perfectly sharp and aligned with the calculated final mask. No feathering or bleeding.
    b. **Color Fidelity:** Pixels in well-lit, non-shadowed areas of the final mask must EXACTLY match the hex code \`${selectedColor}\`.
    c. **Output:** The final output must only be the modified image. Do not add text or any other elements.
`;
    } else if (customPrompt) {
        prompt = customPrompt;
    } else {
        setErrorMessage("Please select an object or enter a custom prompt.");
        setAppState(AppState.Editing);
        return;
    }
    
    const currentImageFile = await dataUrlToFile(displayImageUrl, originalImage.name || 'current-scene.png');
    setDebugInfo({ imageUrl: displayImageUrl, prompt });

    try {
        const newImageUrl = await modifyImage(currentImageFile, prompt);
        setDisplayImageUrl(newImageUrl);
        updateHistory(newImageUrl);
    } catch (error) {
        console.error("Failed to generate image:", error);
        setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
        setAppState(AppState.Editing);
    }
  };
  
  const handleApplyTheme = async (theme: DesignTheme) => {
    if (!displayImageUrl || !originalImage) return;
    clearError();
    setAppState(AppState.Generating);

    const instructions = theme.suggestions
        .map(s => `- Repaint the "${s.objectName}" with the color ${s.colorName} (${s.hex}).`)
        .join('\n');

    const prompt = `
        You are an expert, hyper-realistic digital interior designer AI. Your task is to completely restyle the provided image according to a specific design theme.

        Theme Name: "${theme.name}"
        Theme Description: "${theme.description}"

        Instructions:
        Apply the following color changes precisely to their corresponding objects:
        ${instructions}

        Maintain the original textures, lighting, shadows, and overall photorealism of the image. The final result should be a cohesive and professional interior design visualization. Do not change the structure or contents of the room, only apply the color palette as specified.
    `;
    
    const currentImageFile = await dataUrlToFile(displayImageUrl, originalImage.name || 'current-scene.png');
    setDebugInfo({ imageUrl: displayImageUrl, prompt });

    try {
        const newImageUrl = await modifyImage(currentImageFile, prompt);
        setDisplayImageUrl(newImageUrl);
        updateHistory(newImageUrl);
    } catch (error) {
        console.error("Failed to apply theme:", error);
        setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
        setAppState(AppState.Editing);
    }
  };

  const handleFloorRedesign = async (texture: FloorTexture) => {
      if (!displayImageUrl || !originalImage) return;
      clearError();
      setAppState(AppState.Generating);

      const prompt = `
        As a photorealistic interior design AI, your task is to edit the provided image.
        Action: Replace the existing floor with a new floor.
        New floor texture: "${texture.prompt}".
        Instructions: The new floor must perfectly match the room's perspective, lighting, and shadows. The final image must be indistinguishable from a real photograph. Do not alter any other part of the image.
    `;
    
      const currentImageFile = await dataUrlToFile(displayImageUrl, originalImage.name || 'current-scene.png');
      setDebugInfo({ imageUrl: displayImageUrl, prompt });

      try {
          const newImageUrl = await redesignFloor(currentImageFile, prompt);
          setDisplayImageUrl(newImageUrl);
          updateHistory(newImageUrl);
      } catch (error) {
          console.error("Failed to redesign floor:", error);
          setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
      } finally {
          setAppState(AppState.Editing);
      }
  };

  const handleProductFileSelect = async (file: File) => {
    setIsDetectingFurniture(true);
    setUploadStep('detect');
    
    try {
      const furnitureSets = await detectFurnitureSets(file);
      setDetectedFurnitureSets(furnitureSets);
      setUploadStep('select');
    } catch (error) {
      console.error("Failed to detect furniture:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to analyze furniture image");
      setUploadStep('upload');
    } finally {
      setIsDetectingFurniture(false);
    }
    
    setAddProductModalOpen(false);
  };

  const handleFurnitureSetSelect = async (furnitureSet: FurnitureSet) => {
    setSelectedFurnitureSet(furnitureSet);
    setUploadStep('place');
    
    // Convert the image URL back to a File object for placement
    try {
      const response = await fetch(furnitureSet.imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `${furnitureSet.name}.png`, { type: blob.type });
      
      // Convert furniture set to product for compatibility with existing placement logic
      const product: Product = {
        id: furnitureSet.id,
        name: furnitureSet.name,
        imageUrl: furnitureSet.imageUrl,
        file: file, // Add the file property for placement logic
      };
      setSelectedProduct(product);
      setPlacementPrompt(''); // Clear text prompt when furniture is selected
    } catch (error) {
      console.error('Failed to convert furniture set image to file:', error);
      setErrorMessage('Failed to prepare furniture for placement');
    }
  };

  const handleRemoveObject = async () => {
    if (!displayImageUrl || !originalImage || !objectToRemove) return;
    clearError();
    setAppState(AppState.Generating);

    const currentImageFile = await dataUrlToFile(displayImageUrl, originalImage.name || 'current-scene.png');

    const prompt = `
        You are an expert, hyper-realistic digital artist specializing in inpainting.
        Your task is to completely remove an object from the provided image and realistically reconstruct the area behind it.

        Object to remove: "${objectToRemove.name}".

        Instructions:
        1.  Completely erase the specified object from the scene.
        2.  Intelligently fill the empty space by extending the surrounding textures, patterns, and surfaces (e.g., wall, floor).
        3.  Meticulously match the existing lighting, shadows, and perspective of the room.
        4.  The final result must be photorealistic and seamlessly blended, making it impossible to tell an object was ever there. Do not alter any other part of the image.
    `;
    
    setDebugInfo({ imageUrl: displayImageUrl, prompt });

    try {
        const newImageUrl = await modifyImage(currentImageFile, prompt);
        setDisplayImageUrl(newImageUrl);
        updateHistory(newImageUrl);
    } catch (error) {
        console.error("Failed to remove object:", error);
        setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
        setAppState(AppState.Editing);
        setObjectToRemove(null); // Clear selection after operation
    }
  };
  
  const handlePlaceProduct = async (x: number, y: number) => {
    if (!displayImageUrl || !originalImage) return;

    if (!selectedProduct?.file && !placementPrompt && !selectedProduct?.imageUrl) {
        setErrorMessage("Please select, upload, or describe an object to place in the scene.");
        return;
    }
    
    clearError();
    setAppState(AppState.Generating);
    
    const currentImageFile = await dataUrlToFile(displayImageUrl, originalImage.name || 'current-scene.png');

    try {
        let newImageUrl: string;

        if (selectedProduct?.file) {
            // Use the new placeObject function for placing uploaded products
            newImageUrl = await placeObject(
                currentImageFile, 
                selectedProduct.file, 
                { x, y }, 
                objectToRemove || undefined
            );
            setDebugInfo({ imageUrl: displayImageUrl, prompt: `Placed object at coordinates (${x.toFixed(3)}, ${y.toFixed(3)})` });
        } else if (selectedProduct?.imageUrl) {
            // Handle furniture sets that only have imageUrl (fallback to modifyImage)
            const prompt = `
                You are a hyper-realistic digital art director AI.
                Task: Realistically place the furniture item shown in the second image into the room scene from the first image.
                Furniture: "${selectedProduct.name}".
                Placement: The center of the furniture should be placed at the normalized coordinates x=${x.toFixed(3)}, y=${y.toFixed(3)}.
                Instructions:
                1. Place the furniture item seamlessly and photorealistically into the scene.
                2. Ensure proper scale, perspective, lighting, and shadows to make it look natural.
                3. The result must be indistinguishable from a real photograph.
                4. Do not modify any other part of the original scene.
            `;
            
            // Convert imageUrl to File for modifyImage
            const furnitureResponse = await fetch(selectedProduct.imageUrl);
            const furnitureBlob = await furnitureResponse.blob();
            const furnitureFile = new File([furnitureBlob], `${selectedProduct.name}.png`, { type: furnitureBlob.type });
            
            newImageUrl = await modifyImage(currentImageFile, prompt, furnitureFile);
            setDebugInfo({ imageUrl: displayImageUrl, prompt });
        } else if (placementPrompt) {
            // For text-based object generation, still use modifyImage with enhanced prompt
            const prompt = `
                You are a hyper-realistic digital art director AI.
                Task: Realistically generate and place a new object into the provided room scene image.
                Object to generate: "${placementPrompt}".
                Placement: The center of the new object should be placed at the normalized coordinates x=${x.toFixed(3)}, y=${y.toFixed(3)}.
                Instructions:
                1. Generate the described object from scratch.
                2. Integrate it seamlessly and photorealistically into the scene.
                3. Pay meticulous attention to the room's existing lighting, shadows, perspective, and scale to make the added object look natural.
                4. The result must be indistinguishable from a real photograph. Do not modify any other part of the original scene.
            `;
            
            if (objectToRemove) {
                const enhancedPrompt = `
                    First, remove the "${objectToRemove.name}" from the room.
                    Then: ${prompt}
                `;
                newImageUrl = await modifyImage(currentImageFile, enhancedPrompt);
            } else {
                newImageUrl = await modifyImage(currentImageFile, prompt);
            }
            setDebugInfo({ imageUrl: displayImageUrl, prompt });
        } else {
            throw new Error("No product or placement prompt provided");
        }

        setDisplayImageUrl(newImageUrl);
        updateHistory(newImageUrl);
    } catch (error) {
        console.error("Failed to place product:", error);
        setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
        setAppState(AppState.Editing);
        setSelectedProduct(null); 
        setPlacementPrompt('');
        setObjectToRemove(null); // Clear object to remove after operation
    }
  };

  const handleRedetectObjects = async () => {
    if (!displayImageUrl || !originalImage) return;
    clearError();
    setIsRedetecting(true);
    try {
        const updatedImageFile = await dataUrlToFile(displayImageUrl, originalImage.name || 'updated-scene.png');
        const objects = await detectObjects(updatedImageFile);
        setDetectedObjects(objects);
        setSelectedObject(null);
        setObjectToRemove(null);
    } catch (error) {
        console.error("Failed to re-detect objects:", error);
        setErrorMessage(error instanceof Error ? error.message : "Failed to refresh the object list.");
    } finally {
        setIsRedetecting(false);
    }
  };

  const handleDownload = () => {
    if (displayImageUrl) {
      const link = document.createElement('a');
      link.href = displayImageUrl;
      link.download = 'edited-room.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const toggleAccordion = (key: keyof AccordionState) => {
    setAccordionState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderManualPainter = () => {
      const interiorObjects = detectedObjects.filter(o => o.category === 'interior');
      const furnitureObjects = detectedObjects.filter(o => o.category === 'furniture');

      const renderObjectButtons = (objects: DetectedObject[]) => (
          <div className="flex flex-wrap gap-2 p-3">
              {objects.map(obj => (
                  <button
                      key={obj.name}
                      onClick={() => { setSelectedObject(obj); setCustomPrompt(''); }}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selectedObject?.name === obj.name ? 'bg-blue-600 text-white border-blue-600' : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200'}`}
                  >
                      {obj.name}
                  </button>
              ))}
          </div>
      );

      return (
          <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left column: Object Selection */}
                  <div>
                      <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold text-zinc-800">1. Select an Object</h3>
                          <button onClick={handleRedetectObjects} disabled={isRedetecting} className="flex items-center space-x-2 px-3 py-1 text-sm font-semibold text-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-wait">
                              <RefreshIcon spinning={isRedetecting} />
                              <span>{isRedetecting ? 'Refreshing...' : 'Refresh List'}</span>
                          </button>
                      </div>
                      <p className="text-sm text-zinc-600 mt-1 mb-4">Click an object below. Use refresh after making changes to the image.</p>
                      <div className="space-y-2">
                          {interiorObjects.length > 0 && (
                              <div className="border rounded-md">
                                  <button onClick={() => toggleAccordion('interior')} className="w-full flex justify-between items-center p-3 hover:bg-zinc-50 transition-colors font-semibold">
                                      <span>Interior Elements</span>
                                      <ChevronDownIcon open={accordionState.interior} />
                                  </button>
                                  {accordionState.interior && renderObjectButtons(interiorObjects)}
                              </div>
                          )}
                          {furnitureObjects.length > 0 && (
                              <div className="border rounded-md">
                                  <button onClick={() => toggleAccordion('furniture')} className="w-full flex justify-between items-center p-3 hover:bg-zinc-50 transition-colors font-semibold">
                                      <span>Furniture & Decor</span>
                                      <ChevronDownIcon open={accordionState.furniture} />
                                  </button>
                                  {accordionState.furniture && renderObjectButtons(furnitureObjects)}
                              </div>
                          )}
                      </div>
                  </div>
                  {/* Right column: Custom Prompt */}
                  <div>
                      <h3 className="text-lg font-semibold text-zinc-800">Or Use a Custom Prompt</h3>
                      <p className="text-sm text-zinc-600 mt-1 mb-4">Get creative with a custom prompt.</p>
                      <Textarea
                          value={customPrompt}
                          onChange={(e) => { setCustomPrompt(e.target.value); setSelectedObject(null); }}
                          placeholder="e.g., 'Make the floor a light oak wood', 'Add a window on the back wall'"
                          className="w-full h-36 focus:ring-2 focus:ring-blue-500 transition"
                      />
                  </div>
              </div>

              {/* Color Selection */}
              <div>
                  <h3 className="text-lg font-semibold text-zinc-800 mb-4">2. Choose a Color</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="font-semibold text-sm text-zinc-700 mb-2 block">Custom Color</label>
                          <div className="relative">
                            <button 
                                onClick={() => setIsColorPickerOpen(true)} 
                                className="w-full max-w-xs border rounded-md p-2 flex items-center text-left hover:border-zinc-400 transition-colors"
                            >
                                <div className="w-5 h-5 rounded border border-zinc-300 mr-3" style={{ backgroundColor: selectedColor }}></div>
                                <span className="font-mono">{selectedColor}</span>
                            </button>
                            {isColorPickerOpen && (
                                <ColorPickerPopover 
                                    currentColor={selectedColor}
                                    onColorChange={setSelectedColor}
                                    onClose={() => setIsColorPickerOpen(false)}
                                />
                            )}
                          </div>
                      </div>
                      
                      <div className="border rounded-md">
                          <button onClick={() => toggleAccordion('aiColors')} className="w-full flex justify-between items-center p-3 hover:bg-zinc-50 transition-colors">
                              <span className="font-semibold">AI Palette Suggestions</span>
                              <ChevronDownIcon open={accordionState.aiColors} />
                          </button>
                          {accordionState.aiColors && (
                            <div className="p-4 border-t animate-fade-in space-y-3">
                                {themesLoading && <p className="text-xs text-zinc-500">Loading AI palettes...</p>}
                                {designThemes.map(theme => {
                                    const uniqueColors = [...new Map(theme.suggestions.map(s => [s.hex, s])).values()].map(s => s.hex);
                                    return (
                                        <div key={theme.name}>
                                            <p className="text-sm font-medium text-zinc-600 mb-2">{theme.name}</p>
                                            <div className="grid grid-cols-8 gap-2">
                                                {uniqueColors.map(color => (
                                                    <button key={color} onClick={() => setSelectedColor(color)} className={`w-full aspect-square rounded-full border-2 transition-transform hover:scale-110 ${selectedColor === color ? 'border-blue-500 scale-110 ring-2 ring-offset-1 ring-blue-500' : 'border-transparent'}`} style={{ backgroundColor: color }} aria-label={`Select color ${color}`}></button>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                          )}
                      </div>
                      <div className="border rounded-md">
                          <button onClick={() => toggleAccordion('standardColors')} className="w-full flex justify-between items-center p-3 hover:bg-zinc-50 transition-colors">
                              <span className="font-semibold">Standard Palettes</span>
                              <ChevronDownIcon open={accordionState.standardColors} />
                          </button>
                          {accordionState.standardColors && (
                              <div className="p-4 border-t animate-fade-in space-y-3">
                                  {standardPalettes.map(palette => (
                                      <div key={palette.name}>
                                          <p className="text-sm font-medium text-zinc-600 mb-2">{palette.name}</p>
                                          <div className="grid grid-cols-8 gap-2">
                                              {palette.colors.map(color => (
                                                  <button key={color} onClick={() => setSelectedColor(color)} className={`w-full aspect-square rounded-full border-2 transition-transform hover:scale-110 ${selectedColor === color ? 'border-blue-500 scale-110 ring-2 ring-offset-1 ring-blue-500' : 'border-transparent'}`} style={{ backgroundColor: color }} aria-label={`Select color ${color}`}></button>
                                              ))}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              {/* Generate Button */}
              <div className="pt-4">
                  <button onClick={handleManualGenerate} disabled={appState === AppState.Generating} className="w-full bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300">
                      {appState === AppState.Generating ? 'Applying...' : 'Apply Color Change'}
                  </button>
              </div>
          </div>
      );
  };
  
  const renderFloorRedesign = () => {
      return (
          <div className="space-y-4">
              <h3 className="text-lg font-bold text-zinc-800 mb-1">1. Choose a Floor Texture</h3>
              <p className="text-sm text-zinc-600 mb-4">Select a material to instantly redesign your floor.</p>
              {floorTextures.map(cat => {
                  const categoryKey = cat.category.split(' ')[0].toLowerCase() as keyof AccordionState;
                  return (
                      <div key={cat.category}>
                          <button onClick={() => toggleAccordion(categoryKey)} className="w-full flex justify-between items-center p-3 bg-zinc-100 rounded-md hover:bg-zinc-200 transition-colors">
                              <span className="font-semibold">{cat.category}</span>
                              <ChevronDownIcon open={!!accordionState[categoryKey]} />
                          </button>
                          {accordionState[categoryKey] && (
                              <div className="grid grid-cols-2 gap-2 p-2 animate-fade-in">
                                  {cat.textures.map(texture => (
                                      <button key={texture.name} onClick={() => handleFloorRedesign(texture)} disabled={appState === AppState.Generating} className="text-left p-2 rounded-md transition-colors text-sm bg-white hover:bg-zinc-50 border disabled:opacity-50">
                                          {texture.name}
                                      </button>
                                  ))}
                              </div>
                          )}
                      </div>
                  )
              })}
          </div>
      );
  };

  const renderDesignThemes = () => {
    if (themesLoading) {
      return <p className="text-sm text-zinc-500 text-center">Loading AI design themes...</p>;
    }
    if (designThemes.length === 0) {
      return <p className="text-sm text-zinc-500 text-center">No AI themes were generated for this image.</p>;
    }

    return (
      <div className="space-y-4">
        {designThemes.map((theme, index) => (
          <div key={theme.name} className="border rounded-lg transition-shadow duration-300 hover:shadow-md">
            <button 
                onClick={() => setActiveThemeIndex(activeThemeIndex === index ? null : index)}
                className="w-full flex justify-between items-center p-4 text-left"
            >
              <div>
                <h3 className="font-bold text-lg">{theme.name}</h3>
                <p className="text-sm text-zinc-600 mt-1">{theme.description}</p>
              </div>
              <ChevronDownIcon open={activeThemeIndex === index} />
            </button>
            {activeThemeIndex === index && (
              <div className="p-4 border-t animate-fade-in">
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {[...new Map(theme.suggestions.map(s => [s.hex, s])).values()].map((suggestion) => (
                    <div key={`${suggestion.objectName}-${suggestion.hex}`} className="text-center">
                      <div className="w-12 h-12 rounded-full mx-auto mb-2 border" style={{ backgroundColor: suggestion.hex }}></div>
                      <p className="text-xs font-medium text-zinc-700">{suggestion.colorName}</p>
                      <p className="text-xs text-zinc-500 capitalize">{suggestion.objectName.split(' ').slice(0, 2).join(' ')}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                    <button 
                        onClick={() => handleApplyTheme(theme)}
                        disabled={appState === AppState.Generating}
                        className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                    >
                        {appState === AppState.Generating ? 'Applying Theme...' : 'Apply Theme'}
                    </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderObjectPlacement = () => {
    const exampleChips = ['a potted snake plant', 'a minimalist floor lamp', 'a large abstract wall art', 'a round wooden side table', 'a plush armchair'];
    const interiorObjects = detectedObjects.filter(o => o.category === 'interior');
    const furnitureObjects = detectedObjects.filter(o => o.category === 'furniture');
    const isReadyToPlace = placementPrompt || selectedProduct;

    const handleSelectObjectToRemove = (obj: DetectedObject) => {
        setObjectToRemove(obj);
        setPlacementPrompt('');
        setSelectedProduct(null);
    };

    const renderObjectButtons = (objects: DetectedObject[]) => (
        <div className="flex flex-wrap gap-2 p-3">
            {objects.map(obj => (
                <button
                    key={obj.name}
                    onClick={() => handleSelectObjectToRemove(obj)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${objectToRemove?.name === obj.name ? 'bg-red-600 text-white border-red-600' : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200'}`}
                >
                    {obj.name}
                </button>
            ))}
        </div>
    );

    return (
      <div className="space-y-8">
        {/* Placement Progress Indicator */}
        {isReadyToPlace && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <span className="text-sm font-semibold text-zinc-700">Object Selected</span>
                <div className="w-4 h-px bg-zinc-300"></div>
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold animate-pulse">2</div>
                <span className="text-sm font-semibold text-blue-600">Click to Place</span>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  {selectedProduct ? (
                    <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-8 h-8 object-contain" />
                  ) : (
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-zinc-800">
                    {selectedProduct ? selectedProduct.name : placementPrompt}
                  </p>
                  <p className="text-sm text-zinc-600">Ready to place in your room</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 mb-1">Next Step</p>
                  <div className="flex items-center space-x-2 text-blue-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    <span className="text-sm font-semibold">Click on image →</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 1: Remove an Object */}
        <div className={isReadyToPlace ? 'opacity-60 pointer-events-none' : ''}>
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-zinc-800">1. Remove an Existing Object</h3>
                 <button onClick={handleRedetectObjects} disabled={isRedetecting} className="flex items-center space-x-2 px-3 py-1 text-sm font-semibold text-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-wait">
                    <RefreshIcon spinning={isRedetecting} />
                    <span>{isRedetecting ? 'Refreshing...' : 'Refresh List'}</span>
                </button>
            </div>
            <p className="text-sm text-zinc-600 mt-1 mb-4">Select an object below, then click remove. Use refresh after adding/removing objects.</p>
            <div className="space-y-2">
                {interiorObjects.length > 0 && (
                    <div className="border rounded-md">
                        <button onClick={() => toggleAccordion('interior')} className="w-full flex justify-between items-center p-3 hover:bg-zinc-50 transition-colors font-semibold">
                            <span>Interior Elements</span>
                            <ChevronDownIcon open={accordionState.interior} />
                        </button>
                        {accordionState.interior && renderObjectButtons(interiorObjects)}
                    </div>
                )}
                {furnitureObjects.length > 0 && (
                    <div className="border rounded-md">
                        <button onClick={() => toggleAccordion('furniture')} className="w-full flex justify-between items-center p-3 hover:bg-zinc-50 transition-colors font-semibold">
                            <span>Furniture & Decor</span>
                            <ChevronDownIcon open={accordionState.furniture} />
                        </button>
                        {accordionState.furniture && renderObjectButtons(furnitureObjects)}
                    </div>
                )}
            </div>
            <button 
                onClick={handleRemoveObject}
                disabled={!objectToRemove || appState === AppState.Generating}
                className="mt-4 w-full bg-red-600 text-white font-bold py-3 rounded-md hover:bg-red-700 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
            >
                {appState === AppState.Generating && objectToRemove ? 'Removing Object...' : 'Remove Selected Object'}
            </button>
        </div>

        <div className={`flex items-center text-zinc-500 ${isReadyToPlace ? 'opacity-60' : ''}`}>
            <div className="flex-grow border-t border-zinc-200"></div>
            <span className="flex-shrink mx-4 text-sm font-semibold">OR</span>
            <div className="flex-grow border-t border-zinc-200"></div>
        </div>

        {/* Section 2: Add a New Object */}
        <div className={isReadyToPlace ? 'opacity-60 pointer-events-none' : ''}>
          <h3 className="text-lg font-semibold text-zinc-800">2. Add a New Object</h3>
          <div className="mt-4 space-y-6">
              <div>
                  <h4 className="font-semibold text-zinc-700">Describe or Select an Object to Add</h4>
                  <p className="text-sm text-zinc-600 mt-1 mb-4">Choose a suggestion or write your own description.</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                      {exampleChips.map(chip => (
                          <button
                              key={chip}
                              onClick={() => { setPlacementPrompt(chip); setSelectedProduct(null); setObjectToRemove(null); }}
                              className={`px-3 py-1.5 rounded-full text-sm border transition-all duration-200 capitalize ${placementPrompt === chip ? 'bg-blue-600 text-white border-blue-600 shadow-lg transform scale-105' : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 hover:shadow-md hover:scale-102'}`}
                          >
                              {chip}
                          </button>
                      ))}
                  </div>

                  <input
                      type="text"
                      value={placementPrompt}
                      onChange={(e) => { setPlacementPrompt(e.target.value); setSelectedProduct(null); setObjectToRemove(null); }}
                      placeholder="e.g., 'a small, golden-framed mirror on the wall'"
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
              </div>
              
              <div className="text-center text-zinc-500 text-sm">or</div>

              <div>
                <h4 className="font-semibold text-zinc-700">Upload Your Own Product</h4>
                <p className="text-sm text-zinc-600 mt-1 mb-4">Upload furniture images and our AI will detect complete furniture sets thinking like an interior designer.</p>
                
                {/* Step Indicator */}
                <div className="flex items-center justify-center space-x-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className={`flex items-center space-x-2 ${uploadStep === 'upload' || uploadStep === 'detect' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${uploadStep === 'upload' || uploadStep === 'detect' ? 'bg-blue-100' : 'bg-gray-200'}`}>1</div>
                    <span className="text-sm">Upload Image</span>
                  </div>
                  <div className="w-8 h-0.5 bg-gray-300"></div>
                  <div className={`flex items-center space-x-2 ${uploadStep === 'select' ? 'text-blue-600 font-semibold' : uploadStep === 'place' ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${uploadStep === 'select' ? 'bg-blue-100' : uploadStep === 'place' ? 'bg-green-100' : 'bg-gray-200'}`}>2</div>
                    <span className="text-sm">Select Product</span>
                  </div>
                  <div className="w-8 h-0.5 bg-gray-300"></div>
                  <div className={`flex items-center space-x-2 ${uploadStep === 'place' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${uploadStep === 'place' ? 'bg-blue-100' : 'bg-gray-200'}`}>3</div>
                    <span className="text-sm">Place in Room</span>
                  </div>
                </div>

                {/* Upload Phase */}
                {uploadStep === 'upload' && (
                  <button
                    onClick={() => setAddProductModalOpen(true)}
                    className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold py-3 px-4 rounded-lg text-sm transition-all duration-200 border border-dashed border-zinc-300 shadow-sm hover:shadow-md hover:scale-102"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span>Upload Furniture Image</span>
                    </div>
                  </button>
                )}

                {/* Detecting Phase */}
                {uploadStep === 'detect' && isDetectingFurniture && (
                  <div className="text-center py-8">
                    <Spinner message="🎨 Analyzing furniture sets like an interior designer..." />
                  </div>
                )}

                {/* Select Phase */}
                {uploadStep === 'select' && detectedFurnitureSets.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-800 mb-3">Select a Product:</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                      {detectedFurnitureSets.map((furnitureSet) => (
                        <FurnitureSetCard
                          key={furnitureSet.id}
                          furnitureSet={furnitureSet}
                          isSelected={selectedFurnitureSet?.id === furnitureSet.id}
                          onClick={() => handleFurnitureSetSelect(furnitureSet)}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setUploadStep('upload');
                        setDetectedFurnitureSets([]);
                        setSelectedFurnitureSet(null);
                      }}
                      className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      ← Upload Different Image
                    </button>
                  </div>
                )}

                {/* Place Phase */}
                {uploadStep === 'place' && selectedFurnitureSet && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-12 h-12 bg-white rounded-lg overflow-hidden shadow-sm">
                        <img src={selectedFurnitureSet.imageUrl} alt={selectedFurnitureSet.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h6 className="font-semibold text-gray-800">{selectedFurnitureSet.name}</h6>
                        <p className="text-xs text-gray-600">{selectedFurnitureSet.description}</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium animate-pulse">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                        </svg>
                        <span>CLICK ROOM IMAGE TO PLACE!</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setUploadStep('select');
                        setSelectedFurnitureSet(null);
                        setSelectedProduct(null);
                      }}
                      className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      ← Choose Different Product
                    </button>
                  </div>
                )}

                {/* No furniture detected */}
                {uploadStep === 'select' && detectedFurnitureSets.length === 0 && !isDetectingFurniture && (
                  <div className="text-center py-6 border border-gray-200 rounded-lg">
                    <p className="text-gray-600 mb-3">No furniture sets detected in this image.</p>
                    <button
                      onClick={() => {
                        setUploadStep('upload');
                        setDetectedFurnitureSets([]);
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Try Different Image
                    </button>
                  </div>
                )}
              </div>
          </div>

          <AddProductModal 
              isOpen={isAddProductModalOpen}
              onClose={() => setAddProductModalOpen(false)}
              onFileSelect={handleProductFileSelect}
          />
        </div>

        {/* Clear Selection */}
        {isReadyToPlace && (
          <div className="flex justify-center">
            <button
              onClick={() => {
                setPlacementPrompt('');
                setSelectedProduct(null);
                setObjectToRemove(null);
                setSelectedFurnitureSet(null);
                setUploadStep('upload');
              }}
              className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800 underline transition-colors"
            >
              Clear selection and choose different object
            </button>
          </div>
        )}
      </div>
    );
  };


  const renderEditor = () => {
    const getImageStyle = () => ({
        transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
        transition: 'transform 0.2s ease-out',
        cursor: isPanning.current ? 'grabbing' : 'grab',
    });
    
    const handleAfterImageClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (activeTab !== 'placement' || (!selectedProduct && !placementPrompt) || !afterImageRef.current) {
            return;
        }

        const imageRect = afterImageRef.current.getBoundingClientRect();
        const containerRect = event.currentTarget.getBoundingClientRect();

        const isClickInsideImage = 
            event.clientX >= imageRect.left &&
            event.clientX <= imageRect.right &&
            event.clientY >= imageRect.top &&
            event.clientY <= imageRect.bottom;

        if (isClickInsideImage) {
            const markerX = event.clientX - containerRect.left;
            const markerY = event.clientY - containerRect.top;
            setPlacementMarker({ x: markerX, y: markerY });
            setTimeout(() => setPlacementMarker(null), 1000);

            const x = (event.clientX - imageRect.left) / imageRect.width;
            const y = (event.clientY - imageRect.top) / imageRect.height;
            handlePlaceProduct(x, y);
        }
    };

    const renderImagePanel = (title: string, imageUrl: string | null, ref: React.RefObject<HTMLImageElement>, isAfter = false) => {
        const isPlacementMode = isAfter && activeTab === 'placement' && (selectedProduct || placementPrompt);
        const isRemovalMode = isAfter && activeTab === 'placement' && objectToRemove;
        
        return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold">{title}</h2>
                {isPlacementMode && (
                    <div className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        <span>Click to place object</span>
                    </div>
                )}
                {isRemovalMode && (
                    <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                        <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                        <span>Object marked for removal</span>
                    </div>
                )}
            </div>
            <div 
                ref={imageContainerRef} 
                className={`relative w-full aspect-[4/3] bg-zinc-100 rounded-lg overflow-hidden border transition-all duration-300 ${
                    isPlacementMode 
                        ? 'cursor-crosshair border-blue-500 ring-4 ring-blue-500/20 shadow-lg' 
                        : isRemovalMode 
                        ? 'border-red-500 ring-2 ring-red-500/20'
                        : 'border-zinc-200'
                }`}
                onClick={isAfter ? handleAfterImageClick : undefined}
                onMouseMove={(e) => {
                    if (isPlacementMode && ref.current) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const imageRect = ref.current.getBoundingClientRect();
                        const isOverImage = 
                            e.clientX >= imageRect.left &&
                            e.clientX <= imageRect.right &&
                            e.clientY >= imageRect.top &&
                            e.clientY <= imageRect.bottom;
                        
                        e.currentTarget.style.cursor = isOverImage ? 'crosshair' : 'not-allowed';
                    }
                }}
            >
                {imageUrl ? (
                    <img ref={ref} src={imageUrl} alt={title} className="w-full h-full object-contain pointer-events-none" style={getImageStyle()} />
                ) : <div className="w-full h-full flex items-center justify-center text-zinc-500">Awaiting generation...</div>}
                
                {/* Placement grid overlay for better precision */}
                {isPlacementMode && imageUrl && (
                    <div className="absolute inset-0 pointer-events-none opacity-30">
                        <div className="w-full h-full grid grid-cols-12 grid-rows-8">
                            {Array.from({ length: 96 }).map((_, i) => (
                                <div key={i} className="border border-blue-200/50"></div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Crosshair guide */}
                {isPlacementMode && imageUrl && (
                    <>
                        <div className="absolute top-0 left-1/2 w-px h-full bg-blue-400/50 pointer-events-none transform -translate-x-1/2"></div>
                        <div className="absolute left-0 top-1/2 w-full h-px bg-blue-400/50 pointer-events-none transform -translate-y-1/2"></div>
                    </>
                )}
                
                {isAfter && displayImageUrl && (
                  <button onClick={(e) => { e.stopPropagation(); setIsPreviewModalOpen(true); }} className="absolute top-2 right-2 p-2 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors z-10" aria-label="Full screen preview">
                    <FullScreenIcon />
                  </button>
                )}

                {/* Enhanced placement marker with ripple effect */}
                {isAfter && placementMarker && (
                    <div
                        className="absolute pointer-events-none"
                        style={{
                            top: `${placementMarker.y}px`,
                            left: `${placementMarker.x}px`,
                            transform: 'translate(-50%, -50%)',
                        }}
                    >
                        <div className="relative">
                            <div className="w-4 h-4 bg-green-500 rounded-full shadow-lg animate-ping"></div>
                            <div className="absolute inset-0 w-4 h-4 bg-green-600 rounded-full shadow-lg"></div>
                            <div className="absolute inset-1 w-2 h-2 bg-white rounded-full"></div>
                        </div>
                    </div>
                )}

                {/* Object selection highlights */}
                {isAfter && selectedObject && activeTab === 'manual' && (
                    <div
                        className="absolute border-4 border-blue-500 rounded-md pointer-events-none shadow-lg animate-pulse"
                        style={{
                            left: `${selectedObject.bounding_box.x_min * 100}%`,
                            top: `${selectedObject.bounding_box.y_min * 100}%`,
                            width: `${(selectedObject.bounding_box.x_max - selectedObject.bounding_box.x_min) * 100}%`,
                            height: `${(selectedObject.bounding_box.y_max - selectedObject.bounding_box.y_min) * 100}%`,
                        }}
                    ></div>
                )}
                
                {isAfter && objectToRemove && activeTab === 'placement' && (
                    <div
                        className="absolute border-4 border-red-500 rounded-md pointer-events-none shadow-lg"
                        style={{
                            left: `${objectToRemove.bounding_box.x_min * 100}%`,
                            top: `${objectToRemove.bounding_box.y_min * 100}%`,
                            width: `${(objectToRemove.bounding_box.x_max - objectToRemove.bounding_box.x_min) * 100}%`,
                            height: `${(objectToRemove.bounding_box.y_max - objectToRemove.bounding_box.y_min) * 100}%`,
                        }}
                    >
                        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                    </div>
                )}

                {/* Placement instruction overlay moved to top-left of image for better UX */}
                {isPlacementMode && imageUrl && (
                    <div className="absolute top-2 left-2 bg-blue-600/90 text-white px-3 py-1.5 rounded-lg shadow-lg text-xs font-medium pointer-events-none backdrop-blur-sm">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            <span>Click anywhere to place your object</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
    };

    const TABS: { id: EditorTab; label: string }[] = [
      { id: 'manual', label: 'Manual Painter' },
      { id: 'floor', label: 'Floor Redesign' },
      { id: 'themes', label: 'Design Themes' },
      { id: 'placement', label: 'Object Placement' },
    ];

    return (
        <div className="w-full max-w-7xl mx-auto animate-fade-in">
            <PreviewModal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} imageUrl={displayImageUrl} />
            <DebugModal isOpen={isDebugModalOpen} onClose={() => setDebugModalOpen(false)} imageUrl={debugInfo.imageUrl} prompt={debugInfo.prompt} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {renderImagePanel('Before', originalImageUrl, beforeImageRef)}
                <div>
                    {renderImagePanel('After', displayImageUrl, afterImageRef, true)}
                    <div className="flex items-center justify-between mt-4 p-2 bg-white rounded-lg border">
                        <div className="flex items-center space-x-1">
                            <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 rounded-md hover:bg-zinc-100 disabled:opacity-50"><UndoIcon /></button>
                            <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-md hover:bg-zinc-100 disabled:opacity-50"><RedoIcon /></button>
                        </div>
                        <div className="flex items-center space-x-1">
                            <button className="p-2 rounded-md hover:bg-zinc-100"><ZoomInIcon /></button>
                            <button className="p-2 rounded-md hover:bg-zinc-100"><ZoomOutIcon /></button>
                            <button className="p-2 rounded-md hover:bg-zinc-100"><ResetViewIcon /></button>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => setDebugModalOpen(true)} className="px-3 py-1.5 rounded-md hover:bg-zinc-100 font-medium text-sm border">Debug</button>
                            <button onClick={handleDownload} className="p-2 rounded-md bg-zinc-800 text-white hover:bg-zinc-900 disabled:opacity-50" disabled={!displayImageUrl || displayImageUrl === originalImageUrl}><DownloadIcon /></button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg border mt-8">
                {errorMessage && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg flex justify-between items-center">
                        <span>{errorMessage}</span>
                        <button onClick={clearError} className="font-bold">✕</button>
                    </div>
                )}

                <div className="border-b border-zinc-200 mb-6">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto">
                        {TABS.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'}`}>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {appState === AppState.Generating && (
                  <div className="text-center py-8">
                    <Spinner message={getLoadingMessage(activeTab, objectToRemove, placementPrompt, selectedFurnitureSet)} />
                  </div>
                )}
                
                <div className={appState === AppState.Generating ? 'hidden' : ''}>
                    {activeTab === 'manual' && renderManualPainter()}
                    {activeTab === 'floor' && renderFloorRedesign()}
                    {activeTab === 'themes' && renderDesignThemes()}
                    {activeTab === 'placement' && renderObjectPlacement()}
                </div>
            </div>
        </div>
    );
  };
  
  if (currentView === 'dashboard') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Header />
          <main className="mt-12">
            <RoomTypeSelector onRoomTypeSelect={handleRoomTypeSelect} />
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  if (appState === AppState.Initial) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              onClick={handleBackToDashboard}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedRoomType.replace('-', ' ').toUpperCase()}</Badge>
              <h2 className="text-xl font-semibold">TileVision AI Visualizer</h2>
            </div>
          </div>
          
          <main>
            <div className="grid lg:grid-cols-[1fr,400px] gap-8 items-start">
              <Card className="border-dashed border-2 border-muted-foreground/25">
                <CardContent className="p-6">
                  <ImageUploader id="main-uploader" onFileSelect={handleFileSelect} imageUrl={originalImageUrl} />
                  {errorMessage && <p className="text-red-500 mt-4 text-center">{errorMessage}</p>}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">
                      Kajaria Tile Collection
                    </h3>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex items-center gap-2"
                      disabled={true}
                    >
                      <Wand2 className="w-4 h-4" />
                      Generate All Designs
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {kajariaTiles.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Upload an image to see available tiles.</p>
                        </div>
                      ) : (
                        kajariaTiles.map((tile) => (
                          <Card key={tile.id} className="cursor-pointer hover:shadow-md transition-shadow opacity-50">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                                  <span className="text-xs text-muted-foreground">Preview</span>
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">{tile.name}</h4>
                                  <p className="text-xs text-muted-foreground">{tile.series}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {tile.code}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      {tile.size}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  if (appState === AppState.Detecting) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center text-center" style={{ minHeight: '90vh' }}>
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-zinc-800">
          Room Painter AI
        </h1>
        <p className="mt-4 text-lg text-zinc-600 max-w-3xl mx-auto">
          Transform your living space with AI-powered interior design. Upload a photo of your room and watch as our intelligent system identifies objects and suggests beautiful color schemes.
        </p>
        <button 
          onClick={handleStartOver} 
          className="mt-8 text-blue-600 hover:text-blue-800 font-semibold transition-colors underline"
        >
          Start Over
        </button>
        <div className="mt-12">
          <Spinner message="🔍 Analyzing your space..." />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
          <Header />
      </div>
      <div className="text-center mb-8">
        <button 
            onClick={handleStartOver} 
            className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 transition-colors shadow-sm"
        >
            Start Over
        </button>
      </div>
      {renderEditor()}
      <Footer />
    </div>
  );
};

export default Index;
