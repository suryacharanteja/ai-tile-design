/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { modifyImage, getDesignThemes, DetectedObject, DesignTheme, detectObjects, redesignFloor, placeObject } from '../services/geminiService';
import { detectFurnitureSets, FurnitureSet } from '../services/furnitureDetectionService';
import { Product } from '../types';
import { getTilesByRoomType, getTileSetsByRoomType, getKitchenModularSetsByRoomType, KajariaTile, TileSet, KitchenModularSet } from '../types/kajaria';
import { toast } from 'sonner';

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

export const useRoomVisualization = (roomType: string) => {
  const [state, setState] = useState<AppState>(AppState.Initial);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [modifiedImage, setModifiedImage] = useState<string | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [designThemes, setDesignThemes] = useState<DesignTheme[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<EditorTab>('floor');
  const [customPrompt, setCustomPrompt] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [lastModification, setLastModification] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [furnitureSets, setFurnitureSets] = useState<FurnitureSet[]>([]);
  const [accordionStates, setAccordionStates] = useState<AccordionState>({
    interior: false,
    furniture: false,
    aiColors: false,
    standardColors: false,
    wood: false,
    marble: false,
    granite: false,
    tiles: false,
    other: false,
  });

  // Room-specific tile data
  const [selectedTiles, setSelectedTiles] = useState<KajariaTile[]>([]);
  const [selectedBathroomSets, setSelectedBathroomSets] = useState<TileSet[]>([]);
  const [selectedKitchenSets, setSelectedKitchenSets] = useState<KitchenModularSet[]>([]);
  const [designGallery, setDesignGallery] = useState<Array<{url: string, name: string}>>([]);

  const tiles = getTilesByRoomType(roomType);
  const tileSets = getTileSetsByRoomType(roomType);
  const kitchenModularSets = getKitchenModularSetsByRoomType(roomType);

  const addToHistory = useCallback((imageUrl: string) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(imageUrl);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const handleImageUpload = useCallback(async (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
    setModifiedImage(imageUrl);
    addToHistory(imageUrl);
    
    setState(AppState.Detecting);
    try {
      const objects = await detectObjects(file);
      setDetectedObjects(objects);
      
      if (roomType === 'kitchen') {
        const furnitureSetsData = await detectFurnitureSets(file);
        setFurnitureSets(furnitureSetsData);
      }
      
      setState(AppState.Editing);
    } catch (error) {
      console.error('Error detecting objects:', error);
      setState(AppState.Editing);
    }
  }, [addToHistory, roomType]);

  const handleTileSelect = useCallback((tile: KajariaTile) => {
    setSelectedTiles(prev => {
      const isSelected = prev.some(t => t.id === tile.id);
      if (isSelected) {
        return prev.filter(t => t.id !== tile.id);
      } else {
        return [...prev, tile];
      }
    });
  }, []);

  const handleBathroomSetSelect = useCallback((tileSet: TileSet) => {
    setSelectedBathroomSets(prev => {
      const isSelected = prev.some(set => set.id === tileSet.id);
      if (isSelected) {
        return prev.filter(set => set.id !== tileSet.id);
      } else {
        return [...prev, tileSet];
      }
    });
  }, []);

  const handleKitchenSetSelect = useCallback((kitchenSet: KitchenModularSet) => {
    setSelectedKitchenSets(prev => {
      const isSelected = prev.some(set => set.id === kitchenSet.id);
      if (isSelected) {
        return prev.filter(set => set.id !== kitchenSet.id);
      } else {
        return [...prev, kitchenSet];
      }
    });
  }, []);

  const urlToFile = useCallback(async (url: string, filename: string = 'image.jpg'): Promise<File> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  }, []);

  const processDesignApplication = useCallback(async (prompt: string, description: string) => {
    if (!modifiedImage) return;
    
    setState(AppState.Generating);
    try {
      // Convert URL to File if needed
      const imageFile = await urlToFile(modifiedImage, 'room-image.jpg');
      const result = await redesignFloor(imageFile, prompt);
      setModifiedImage(result);
      addToHistory(result);
      setLastModification(description);
      toast.success(`Applied ${description} successfully!`);
    } catch (error) {
      console.error('Error applying design:', error);
      toast.error(`Failed to apply ${description}`);
    } finally {
      setState(AppState.Editing);
    }
  }, [modifiedImage, addToHistory, urlToFile]);

  const handleApplySelectedTiles = useCallback(async () => {
    if (selectedTiles.length === 0 || !modifiedImage) {
      toast.error('Please select tiles and upload an image first');
      return;
    }

    const tilePrompts = selectedTiles.map(tile => `${tile.name} (${tile.size})`).join(', ');
    const prompt = `Apply these tiles to the floor: ${tilePrompts}. Make it look realistic with proper lighting and perspective.`;
    
    await processDesignApplication(prompt, `${selectedTiles.length} selected tile(s)`);
  }, [selectedTiles, processDesignApplication]);

  const handleApplySelectedBathroomSet = useCallback(async () => {
    if (selectedBathroomSets.length === 0 || !modifiedImage) {
      toast.error('Please select bathroom sets and upload an image first');
      return;
    }

    const setPrompts = selectedBathroomSets.map(set => 
      `Apply ${set.floorTile.name} to the floor and ${set.wallTile.name} to the walls`
    ).join('. ');
    
    await processDesignApplication(setPrompts, `${selectedBathroomSets.length} bathroom set(s)`);
  }, [selectedBathroomSets, processDesignApplication]);

  const handleApplySelectedKitchenSet = useCallback(async () => {
    if (selectedKitchenSets.length === 0 || !modifiedImage) {
      toast.error('Please select kitchen sets and upload an image first');
      return;
    }

    const setPrompts = selectedKitchenSets.map(set => 
      `Apply ${set.backsplashTile.name} as backsplash tiles, place a ${set.sinkSpecs.material} ${set.sinkSpecs.type} sink, and suggest ${set.graniteRecommendation.color} ${set.graniteRecommendation.pattern} countertops`
    ).join('. ');
    
    await processDesignApplication(setPrompts, `${selectedKitchenSets.length} kitchen set(s)`);
  }, [selectedKitchenSets, processDesignApplication]);

  return {
    // State
    state,
    uploadedImage,
    modifiedImage,
    detectedObjects,
    designThemes,
    selectedObjects,
    activeTab,
    customPrompt,
    products,
    showDebugModal,
    isPreviewModalOpen,
    isColorPickerOpen,
    lastModification,
    history,
    historyIndex,
    furnitureSets,
    accordionStates,
    selectedTiles,
    selectedBathroomSets,
    selectedKitchenSets,
    designGallery,
    tiles,
    tileSets,
    kitchenModularSets,

    // Actions
    setState,
    setUploadedImage,
    setModifiedImage,
    setDetectedObjects,
    setDesignThemes,
    setSelectedObjects,
    setActiveTab,
    setCustomPrompt,
    setProducts,
    setShowDebugModal,
    setIsPreviewModalOpen,
    setIsColorPickerOpen,
    setLastModification,
    setHistory,
    setHistoryIndex,
    setFurnitureSets,
    setAccordionStates,
    setSelectedTiles,
    setSelectedBathroomSets,
    setSelectedKitchenSets,
    setDesignGallery,
    addToHistory,
    handleImageUpload,
    handleTileSelect,
    handleBathroomSetSelect,
    handleKitchenSetSelect,
    handleApplySelectedTiles,
    handleApplySelectedBathroomSet,
    handleApplySelectedKitchenSet,
    processDesignApplication,
  };
};