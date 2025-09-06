/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { modifyImage, getDesignThemes, DetectedObject, DesignTheme, detectObjects, redesignFloor, placeObject } from '../services/geminiService';
import { detectFurnitureSets, FurnitureSet } from '../services/furnitureDetectionService';
import Header from '../components/Header';
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
import { getTilesByRoomType, getTileSetsByRoomType, getKitchenModularSetsByRoomType, KajariaTile, TileSet, KitchenModularSet } from '../types/kajaria';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { ArrowLeft, Eye, Download, Wand2, Home } from 'lucide-react';
import DesignGallery from '../components/DesignGallery';
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
  {
    category: 'Wood',
    textures: [
      { name: 'Oak Hardwood', prompt: 'natural oak hardwood flooring with visible wood grain' },
      { name: 'Walnut Planks', prompt: 'rich walnut wood planks with dark brown tones' },
      { name: 'Pine Flooring', prompt: 'light pine wood flooring with natural knots' },
      { name: 'Bamboo', prompt: 'sustainable bamboo flooring with linear grain pattern' },
      { name: 'Cherry Wood', prompt: 'elegant cherry wood flooring with reddish-brown hue' },
      { name: 'Maple Hardwood', prompt: 'light maple hardwood with subtle grain patterns' },
    ]
  },
  {
    category: 'Marble',
    textures: [
      { name: 'Carrara Marble', prompt: 'white Carrara marble with gray veining' },
      { name: 'Calacatta Gold', prompt: 'luxurious Calacatta marble with gold veining' },
      { name: 'Emperador Dark', prompt: 'dark brown Emperador marble with light veining' },
      { name: 'Statuario', prompt: 'white Statuario marble with dramatic gray veining' },
      { name: 'Nero Marquina', prompt: 'black Nero Marquina marble with white veining' },
      { name: 'Crema Marfil', prompt: 'beige Crema Marfil marble with subtle patterns' },
    ]
  },
  {
    category: 'Granite',
    textures: [
      { name: 'Black Galaxy', prompt: 'black granite with golden speckles like stars' },
      { name: 'Kashmir White', prompt: 'white granite with gray and burgundy speckles' },
      { name: 'Absolute Black', prompt: 'solid black granite with minimal patterns' },
      { name: 'Tan Brown', prompt: 'brown granite with black and gold speckles' },
      { name: 'Baltic Brown', prompt: 'dark brown granite with lighter brown patterns' },
      { name: 'Colonial White', prompt: 'white granite with gray and black speckles' },
    ]
  },
  {
    category: 'Tiles',
    textures: [
      { name: 'Subway Tiles', prompt: 'classic white subway tiles in brick pattern' },
      { name: 'Hexagon Tiles', prompt: 'modern hexagonal tiles in geometric pattern' },
      { name: 'Moroccan Tiles', prompt: 'colorful Moroccan tiles with intricate patterns' },
      { name: 'Terrazzo', prompt: 'terrazzo tiles with colorful aggregate chips' },
      { name: 'Penny Tiles', prompt: 'small round penny tiles in mosaic pattern' },
      { name: 'Large Format', prompt: 'large format porcelain tiles with minimal grout lines' },
    ]
  },
  {
    category: 'Other',
    textures: [
      { name: 'Concrete', prompt: 'polished concrete floor with industrial finish' },
      { name: 'Vinyl Plank', prompt: 'luxury vinyl plank flooring mimicking wood' },
      { name: 'Carpet', prompt: 'plush carpet flooring in neutral tones' },
      { name: 'Cork', prompt: 'natural cork flooring with organic texture' },
      { name: 'Linoleum', prompt: 'modern linoleum flooring in solid colors' },
      { name: 'Epoxy', prompt: 'glossy epoxy resin floor with seamless finish' },
    ]
  }
];

const HallBedroom: React.FC = () => {
  const navigate = useNavigate();
  const selectedRoomType = 'hall-bedroom';
  
  // State variables
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
  const [selectedColor, setSelectedColor] = useState('#E0E0E0');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [debugInfo, setDebugInfo] = useState<{ imageUrl: string | null; prompt: string | null }>({ imageUrl: null, prompt: null });
  const [accordionState, setAccordionState] = useState<AccordionState>({
    interior: true, furniture: true, aiColors: true, standardColors: true,
    wood: true, marble: false, granite: false, tiles: false, other: false,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [placementPrompt, setPlacementPrompt] = useState('');
  const [objectToRemove, setObjectToRemove] = useState<DetectedObject | null>(null);
  const [activeThemeIndex, setActiveThemeIndex] = useState<number | null>(null);
  const [detectedFurnitureSets, setDetectedFurnitureSets] = useState<FurnitureSet[]>([]);
  const [selectedFurnitureSet, setSelectedFurnitureSet] = useState<FurnitureSet | null>(null);
  const [isDetectingFurniture, setIsDetectingFurniture] = useState(false);
  const [uploadStep, setUploadStep] = useState<'upload' | 'furniture'>('upload');
  const [kajariaTiles, setKajariaTiles] = useState<KajariaTile[]>([]);
  const [selectedTiles, setSelectedTiles] = useState<Set<string>>(new Set());
  const [tileSets, setTileSets] = useState<TileSet[]>([]);
  const [selectedTileSets, setSelectedTileSets] = useState<Set<string>>(new Set());
  const [kitchenModularSets, setKitchenModularSets] = useState<KitchenModularSet[]>([]);
  const [selectedKitchenSets, setSelectedKitchenSets] = useState<Set<string>>(new Set());
  const [generatingMultiple, setGeneratingMultiple] = useState(false);
  const [generatedDesigns, setGeneratedDesigns] = useState<Array<{ imageUrl: string; tileName?: string }>>([]);
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);

  // Initialize room-specific data
  useEffect(() => {
    setKajariaTiles(getTilesByRoomType(selectedRoomType));
    setTileSets(getTileSetsByRoomType(selectedRoomType));
    setKitchenModularSets(getKitchenModularSetsByRoomType(selectedRoomType));
  }, []);

  const handleBackHome = () => {
    navigate('/');
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setOriginalImage(file);
    const imageUrl = URL.createObjectURL(file);
    setOriginalImageUrl(imageUrl);
    setDisplayImageUrl(imageUrl);
    setAppState(AppState.Detecting);
    setErrorMessage(null);

    try {
      const objects = await detectObjects(file);
      setDetectedObjects(objects);
      setAppState(AppState.Editing);
      updateHistory(imageUrl);
    } catch (error) {
      console.error('Error detecting objects:', error);
      setErrorMessage('Failed to analyze the image. Please try again.');
      setAppState(AppState.Initial);
    }
  }, []);

  const updateHistory = useCallback((imageUrl: string) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(imageUrl);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setDisplayImageUrl(history[newIndex]);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setDisplayImageUrl(history[newIndex]);
    }
  }, [historyIndex, history]);

  const handleObjectClick = useCallback((obj: DetectedObject) => {
    setSelectedObject(obj);
  }, []);

  const handleColorChange = useCallback(async (color: string) => {
    if (!selectedObject || !originalImage) return;

    setAppState(AppState.Generating);
    setErrorMessage(null);

    try {
      const result = await modifyImage(originalImage, selectedObject, color);
      setDisplayImageUrl(result.imageUrl);
      updateHistory(result.imageUrl);
      setDebugInfo({ imageUrl: result.imageUrl, prompt: result.prompt });
      setAppState(AppState.Editing);
    } catch (error) {
      console.error('Error modifying image:', error);
      setErrorMessage('Failed to apply color change. Please try again.');
      setAppState(AppState.Editing);
    }
  }, [selectedObject, originalImage, updateHistory]);

  const handleCustomPromptSubmit = useCallback(async () => {
    if (!selectedObject || !originalImage || !customPrompt.trim()) return;

    setAppState(AppState.Generating);
    setErrorMessage(null);

    try {
      const result = await modifyImage(originalImage, selectedObject, customPrompt.trim());
      setDisplayImageUrl(result.imageUrl);
      updateHistory(result.imageUrl);
      setDebugInfo({ imageUrl: result.imageUrl, prompt: result.prompt });
      setCustomPrompt('');
      setAppState(AppState.Editing);
    } catch (error) {
      console.error('Error modifying image:', error);
      setErrorMessage('Failed to apply custom modification. Please try again.');
      setAppState(AppState.Editing);
    }
  }, [selectedObject, originalImage, customPrompt, updateHistory]);

  const handleThemeGeneration = useCallback(async () => {
    if (!originalImage) return;

    setThemesLoading(true);
    setErrorMessage(null);

    try {
      const themes = await getDesignThemes(originalImage);
      setDesignThemes(themes);
    } catch (error) {
      console.error('Error generating themes:', error);
      setErrorMessage('Failed to generate design themes. Please try again.');
    } finally {
      setThemesLoading(false);
    }
  }, [originalImage]);

  const handleThemeApply = useCallback(async (theme: DesignTheme, index: number) => {
    if (!originalImage) return;

    setAppState(AppState.Generating);
    setActiveThemeIndex(index);
    setErrorMessage(null);

    try {
      const result = await modifyImage(originalImage, null, theme.prompt);
      setDisplayImageUrl(result.imageUrl);
      updateHistory(result.imageUrl);
      setDebugInfo({ imageUrl: result.imageUrl, prompt: result.prompt });
      setAppState(AppState.Editing);
    } catch (error) {
      console.error('Error applying theme:', error);
      setErrorMessage('Failed to apply design theme. Please try again.');
      setAppState(AppState.Editing);
    } finally {
      setActiveThemeIndex(null);
    }
  }, [originalImage, updateHistory]);

  const handleProductPlacement = useCallback(async () => {
    if (!originalImage || !selectedProduct || !placementPrompt.trim()) return;

    setAppState(AppState.Generating);
    setErrorMessage(null);

    try {
      const result = await placeObject(originalImage, selectedProduct, placementPrompt.trim());
      setDisplayImageUrl(result.imageUrl);
      updateHistory(result.imageUrl);
      setDebugInfo({ imageUrl: result.imageUrl, prompt: result.prompt });
      setPlacementPrompt('');
      setAppState(AppState.Editing);
    } catch (error) {
      console.error('Error placing product:', error);
      setErrorMessage('Failed to place product. Please try again.');
      setAppState(AppState.Editing);
    }
  }, [originalImage, selectedProduct, placementPrompt, updateHistory]);

  const handleFloorRedesign = useCallback(async (texture: FloorTexture) => {
    if (!originalImage) return;

    setAppState(AppState.Generating);
    setErrorMessage(null);

    try {
      const result = await redesignFloor(originalImage, texture.prompt);
      setDisplayImageUrl(result.imageUrl);
      updateHistory(result.imageUrl);
      setDebugInfo({ imageUrl: result.imageUrl, prompt: result.prompt });
      setAppState(AppState.Editing);
    } catch (error) {
      console.error('Error redesigning floor:', error);
      setErrorMessage('Failed to redesign floor. Please try again.');
      setAppState(AppState.Editing);
    }
  }, [originalImage, updateHistory]);

  const handleDownload = useCallback(() => {
    if (!displayImageUrl) return;

    const link = document.createElement('a');
    link.href = displayImageUrl;
    link.download = 'modified-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [displayImageUrl]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev * 1.2, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.1));
  }, []);

  const handleResetView = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const toggleAccordion = useCallback((key: keyof AccordionState) => {
    setAccordionState(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleFurnitureDetection = useCallback(async () => {
    if (!originalImage) return;

    setIsDetectingFurniture(true);
    setErrorMessage(null);

    try {
      const furnitureSets = await detectFurnitureSets(originalImage);
      setDetectedFurnitureSets(furnitureSets);
      setUploadStep('furniture');
    } catch (error) {
      console.error('Error detecting furniture:', error);
      setErrorMessage('Failed to detect furniture sets. Please try again.');
    } finally {
      setIsDetectingFurniture(false);
    }
  }, [originalImage]);

  const handleFurnitureSetSelect = useCallback((furnitureSet: FurnitureSet) => {
    setSelectedFurnitureSet(furnitureSet);
  }, []);

  const handleTileToggle = useCallback((tileId: string) => {
    setSelectedTiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tileId)) {
        newSet.delete(tileId);
      } else {
        newSet.add(tileId);
      }
      return newSet;
    });
  }, []);

  const handleTileSetToggle = useCallback((tileSetId: string) => {
    setSelectedTileSets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tileSetId)) {
        newSet.delete(tileSetId);
      } else {
        newSet.add(tileSetId);
      }
      return newSet;
    });
  }, []);

  const handleKitchenSetToggle = useCallback((kitchenSetId: string) => {
    setSelectedKitchenSets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(kitchenSetId)) {
        newSet.delete(kitchenSetId);
      } else {
        newSet.add(kitchenSetId);
      }
      return newSet;
    });
  }, []);

  const handleGenerateMultipleDesigns = useCallback(async () => {
    if (!originalImage || (selectedTiles.size === 0 && selectedTileSets.size === 0 && selectedKitchenSets.size === 0)) {
      toast.error('Please select at least one tile or set to generate designs');
      return;
    }

    setGeneratingMultiple(true);
    setErrorMessage(null);
    const newDesigns: Array<{ imageUrl: string; tileName?: string }> = [];

    try {
      // Generate designs for selected individual tiles
      for (const tileId of selectedTiles) {
        const tile = kajariaTiles.find(t => t.id === tileId);
        if (tile) {
          const result = await modifyImage(originalImage, null, `Apply ${tile.name} tiles to the floor and walls. ${tile.description}`);
          newDesigns.push({ imageUrl: result.imageUrl, tileName: tile.name });
        }
      }

      // Generate designs for selected tile sets
      for (const tileSetId of selectedTileSets) {
        const tileSet = tileSets.find(ts => ts.id === tileSetId);
        if (tileSet) {
          const result = await modifyImage(originalImage, null, `Apply ${tileSet.name} tile set. ${tileSet.description}`);
          newDesigns.push({ imageUrl: result.imageUrl, tileName: tileSet.name });
        }
      }

      // Generate designs for selected kitchen modular sets
      for (const kitchenSetId of selectedKitchenSets) {
        const kitchenSet = kitchenModularSets.find(ks => ks.id === kitchenSetId);
        if (kitchenSet) {
          const result = await modifyImage(originalImage, null, `Apply ${kitchenSet.name} modular kitchen design. ${kitchenSet.description}`);
          newDesigns.push({ imageUrl: result.imageUrl, tileName: kitchenSet.name });
        }
      }

      setGeneratedDesigns(newDesigns);
      setIsGalleryVisible(true);
      toast.success(`Generated ${newDesigns.length} design variations`);
    } catch (error) {
      console.error('Error generating multiple designs:', error);
      setErrorMessage('Failed to generate some designs. Please try again.');
    } finally {
      setGeneratingMultiple(false);
    }
  }, [originalImage, selectedTiles, selectedTileSets, selectedKitchenSets, kajariaTiles, tileSets, kitchenModularSets]);

  if (appState === AppState.Initial) {
    return (
      <div className="container mx-auto p-4">
        <div className="mb-4 flex items-center gap-4">
          <Button 
            onClick={handleBackHome}
            variant="ghost" 
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-semibold">Hall & Bedroom Visualizer</h1>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: '70vh' }}>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-800 mb-4">
            Hall & Bedroom
          </h2>
          <p className="mt-4 text-lg text-zinc-600 max-w-3xl mx-auto mb-8">
            Premium tiles for living spaces. Upload your room image to see how our elegant tiles will transform your hall and bedroom.
          </p>
          <ImageUploader onFileSelect={handleFileSelect} />
        </div>
        <Footer />
      </div>
    );
  }

  if (appState === AppState.Detecting) {
    return (
      <div className="container mx-auto p-4">
        <div className="mb-4 flex items-center gap-4">
          <Button 
            onClick={handleBackHome}
            variant="ghost" 
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
          <Header />
        </div>
        
        <div className="flex flex-col items-center justify-center" style={{ minHeight: '70vh' }}>
          <Spinner />
          <p className="mt-4 text-lg text-zinc-600">Analyzing your image...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex items-center gap-4">
        <Button 
          onClick={handleBackHome}
          variant="ghost" 
          size="sm"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>
        <Header />
      </div>
      
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Image Display */}
        <div className="lg:col-span-2">
          <Card className="relative overflow-hidden">
            <CardContent className="p-0">
              <div className="relative bg-gray-100" style={{ height: '600px' }}>
                {displayImageUrl && (
                  <div 
                    className="absolute inset-0 overflow-hidden cursor-move"
                    style={{
                      transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                      transformOrigin: 'center center'
                    }}
                  >
                    <img
                      src={displayImageUrl}
                      alt="Room visualization"
                      className="w-full h-full object-contain"
                    />
                    {/* Object overlays */}
                    {detectedObjects.map((obj, index) => (
                      <div
                        key={index}
                        className={`absolute border-2 cursor-pointer transition-all ${
                          selectedObject === obj 
                            ? 'border-blue-500 bg-blue-500/20' 
                            : 'border-red-500 bg-red-500/10 hover:bg-red-500/20'
                        }`}
                        style={{
                          left: `${obj.boundingBox.x}%`,
                          top: `${obj.boundingBox.y}%`,
                          width: `${obj.boundingBox.width}%`,
                          height: `${obj.boundingBox.height}%`,
                        }}
                        onClick={() => handleObjectClick(obj)}
                      >
                        <span className="absolute -top-6 left-0 bg-red-500 text-white text-xs px-2 py-1 rounded">
                          {obj.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Controls overlay */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  <Button size="sm" variant="secondary" onClick={handleZoomIn}>
                    <ZoomInIcon />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleZoomOut}>
                    <ZoomOutIcon />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleResetView}>
                    <ResetViewIcon />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleDownload}>
                    <DownloadIcon />
                  </Button>
                </div>

                {/* History controls */}
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                  >
                    <UndoIcon />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                  >
                    <RedoIcon />
                  </Button>
                </div>

                {appState === AppState.Generating && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg flex flex-col items-center">
                      <Spinner />
                      <p className="mt-2 text-sm text-gray-600">Generating design...</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls Panel */}
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'manual', label: 'Manual' },
              { id: 'themes', label: 'Themes' },
              { id: 'placement', label: 'Products' },
              { id: 'floor', label: 'Flooring' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as EditorTab)}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <ScrollArea className="h-[500px]">
            {activeTab === 'manual' && (
              <div className="space-y-4">
                {selectedObject && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">Selected: {selectedObject.name}</h3>
                      
                      {/* Color Picker */}
                      <div className="space-y-3">
                        <ColorPickerPopover
                          color={selectedColor}
                          onChange={setSelectedColor}
                          onApply={() => handleColorChange(selectedColor)}
                          isOpen={isColorPickerOpen}
                          onOpenChange={setIsColorPickerOpen}
                        />
                        
                        {/* Standard Color Palettes */}
                        <div>
                          <button
                            onClick={() => toggleAccordion('standardColors')}
                            className="flex items-center justify-between w-full text-left font-medium"
                          >
                            Standard Colors
                            <ChevronDownIcon open={accordionState.standardColors} />
                          </button>
                          {accordionState.standardColors && (
                            <div className="mt-2 space-y-2">
                              {standardPalettes.map((palette) => (
                                <div key={palette.name}>
                                  <p className="text-xs text-gray-600 mb-1">{palette.name}</p>
                                  <div className="flex gap-1">
                                    {palette.colors.map((color) => (
                                      <button
                                        key={color}
                                        onClick={() => handleColorChange(color)}
                                        className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
                                        style={{ backgroundColor: color }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Custom Prompt */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Custom Modification</label>
                          <Textarea
                            placeholder="Describe how you want to modify this object..."
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                          />
                          <Button 
                            onClick={handleCustomPromptSubmit}
                            disabled={!customPrompt.trim() || appState === AppState.Generating}
                            className="w-full"
                          >
                            Apply Custom Change
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!selectedObject && (
                  <Card>
                    <CardContent className="p-4 text-center text-gray-500">
                      Click on an object in the image to modify it
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'themes' && (
              <div className="space-y-4">
                <Button 
                  onClick={handleThemeGeneration}
                  disabled={themesLoading}
                  className="w-full"
                >
                  {themesLoading ? (
                    <>
                      <RefreshIcon spinning={true} />
                      <span className="ml-2">Generating Themes...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate Design Themes
                    </>
                  )}
                </Button>

                {designThemes.length > 0 && (
                  <div className="space-y-3">
                    {designThemes.map((theme, index) => (
                      <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={theme.imageUrl} 
                              alt={theme.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                            <div className="flex-1">
                              <h4 className="font-medium">{theme.name}</h4>
                              <p className="text-sm text-gray-600">{theme.description}</p>
                            </div>
                          </div>
                          <Button 
                            onClick={() => handleThemeApply(theme, index)}
                            disabled={appState === AppState.Generating}
                            className="w-full mt-3"
                            variant={activeThemeIndex === index ? "default" : "outline"}
                          >
                            {activeThemeIndex === index ? 'Applying...' : 'Apply Theme'}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'placement' && (
              <div className="space-y-4">
                <Button 
                  onClick={() => setSelectedProduct(null)}
                  className="w-full"
                >
                  Add New Product
                </Button>

                {products.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Your Products</h4>
                    {products.map((product) => (
                      <Card 
                        key={product.id}
                        className={`cursor-pointer transition-colors ${
                          selectedProduct?.id === product.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => setSelectedProduct(product)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div>
                              <p className="font-medium text-sm">{product.name}</p>
                              <p className="text-xs text-gray-600">{product.category}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {selectedProduct && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Place: {selectedProduct.name}</h4>
                      <Textarea
                        placeholder="Describe where and how to place this product..."
                        value={placementPrompt}
                        onChange={(e) => setPlacementPrompt(e.target.value)}
                      />
                      <Button 
                        onClick={handleProductPlacement}
                        disabled={!placementPrompt.trim() || appState === AppState.Generating}
                        className="w-full mt-2"
                      >
                        Place Product
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'floor' && (
              <div className="space-y-4">
                {floorTextures.map((category) => (
                  <div key={category.category}>
                    <button
                      onClick={() => toggleAccordion(category.category.toLowerCase() as keyof AccordionState)}
                      className="flex items-center justify-between w-full text-left font-medium mb-2"
                    >
                      {category.category}
                      <ChevronDownIcon open={accordionState[category.category.toLowerCase() as keyof AccordionState]} />
                    </button>
                    {accordionState[category.category.toLowerCase() as keyof AccordionState] && (
                      <div className="grid grid-cols-1 gap-2 mb-4">
                        {category.textures.map((texture) => (
                          <Button
                            key={texture.name}
                            onClick={() => handleFloorRedesign(texture)}
                            disabled={appState === AppState.Generating}
                            variant="outline"
                            className="justify-start h-auto p-3"
                          >
                            <div className="text-left">
                              <div className="font-medium">{texture.name}</div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      <Footer />
      
      {/* Modals */}
      {selectedProduct === null && (
        <AddProductModal
          isOpen={true}
          onClose={() => {}}
          onProductAdd={(product) => {
            setProducts(prev => [...prev, product]);
            setSelectedProduct(product);
          }}
        />
      )}

      <DebugModal 
        isOpen={debugInfo.imageUrl !== null}
        onClose={() => setDebugInfo({ imageUrl: null, prompt: null })}
        imageUrl={debugInfo.imageUrl}
        prompt={debugInfo.prompt}
      />

      {/* Design Gallery */}
      <DesignGallery 
        designs={generatedDesigns}
        isVisible={isGalleryVisible}
        onClose={() => setIsGalleryVisible(false)}
        onImageSelect={(imageUrl) => {
          setDisplayImageUrl(imageUrl);
          updateHistory(imageUrl);
        }}
      />
    </div>
  );
};

export default HallBedroom;
