/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowLeft, Car, Download, Palette, Wand2, Trash2, Hammer, MousePointer, ChevronDown, RefreshCw, Undo, Redo, ZoomIn, ZoomOut, RotateCcw, Maximize } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { toast } from 'sonner';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ImageUploader from '../components/ImageUploader';
import ColorPickerPopover from '../components/ColorPickerPopover';
import ParkingTileCard from '../components/ParkingTileCard';
import { defaultParkingTiles, ParkingTile } from '../types/parkingTiles';
import { generateModelImage, generateVirtualTryOnImage } from '../services/parkingTileService';
import { changeColor, detectObjects, DetectedObject } from '../services/geminiService';

enum AppState {
  WaitingForImage,
  StructureAnalyzing,
  Editing,
  Generating,
}

const ParkingTiles: React.FC = () => {
  const navigate = useNavigate();
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [structureAnalyzedImageUrl, setStructureAnalyzedImageUrl] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.WaitingForImage);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTiles, setSelectedTiles] = useState<Set<string>>(new Set());
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#36454F');
  const [imageHistory, setImageHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'painter' | 'tiles' | 'placement'>('painter');
  const [applyingTileId, setApplyingTileId] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedStructure, setSelectedStructure] = useState<{category: string, name: string} | null>(null);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [detectedStructures, setDetectedStructures] = useState<{
    mainStructural: Array<{name: string, highlighted: boolean}>;
    decorativeElements: Array<{name: string, highlighted: boolean}>;
  }>({
    mainStructural: [],
    decorativeElements: []
  });
  const [isDetectingStructures, setIsDetectingStructures] = useState(false);
  
  // Accordion states
  const [accordionState, setAccordionState] = useState({
    mainStructural: true,
    decorativeElements: false,
    aiColors: false,
    standardPalettes: false,
  });

  // References for images
  const beforeImageRef = useRef<HTMLImageElement>(null);
  const afterImageRef = useRef<HTMLImageElement>(null);

  const clearError = () => setErrorMessage(null);

  const handleBackHome = () => {
    navigate('/');
  };

  const dataUrlToFile = async (dataUrl: string, filename: string): Promise<File> => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  };

  const updateHistory = (newImageUrl: string) => {
    const newHistory = [...imageHistory.slice(0, historyIndex + 1), newImageUrl];
    setImageHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setDisplayImageUrl(newImageUrl);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setDisplayImageUrl(imageHistory[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < imageHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setDisplayImageUrl(imageHistory[newIndex]);
    }
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setOriginalImage(file);
    const imageUrl = URL.createObjectURL(file);
    setOriginalImageUrl(imageUrl);
    setDisplayImageUrl(imageUrl);
    setImageHistory([imageUrl]);
    setHistoryIndex(0);
    setAppState(AppState.StructureAnalyzing);
    clearError();

    try {
      const analyzedImageUrl = await generateModelImage(file);
      setStructureAnalyzedImageUrl(analyzedImageUrl);
      updateHistory(analyzedImageUrl);
      setAppState(AppState.Editing);
      
      // Automatically detect structures for the Structure Painter tab
      detectStructureFeatures();
      
      toast.success("Structure analysis completed! Parking surfaces detected.");
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to analyze parking structure.");
      setAppState(AppState.Editing);
      toast.error("Structure analysis failed. You can still apply tiles manually.");
    }
  }, []);

  const handleApplyParkingTile = async (tile: ParkingTile) => {
    if (!displayImageUrl || !originalImage) return;
    clearError();
    setApplyingTileId(tile.id);
    setAppState(AppState.Generating);

    try {
      // Create a temporary image file from the tile URL
      const tileResponse = await fetch(tile.url);
      const tileBlob = await tileResponse.blob();
      const tileFile = new File([tileBlob], `${tile.productCode}.jpg`, { type: 'image/jpeg' });

      const currentImageFile = await dataUrlToFile(displayImageUrl, originalImage.name || 'current-scene.png');
      const newImageUrl = await generateVirtualTryOnImage(displayImageUrl, tileFile);
      updateHistory(newImageUrl);
      setAppState(AppState.Editing);
      toast.success(`${tile.name} applied successfully!`);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to apply parking tile.");
      setAppState(AppState.Editing);
      toast.error("Failed to apply tile. Please try again.");
    } finally {
      setApplyingTileId(null);
    }
  };

  const handleColorChange = async () => {
    if (!displayImageUrl || !originalImage) return;
    clearError();
    setAppState(AppState.Generating);

    const customPrompt = `Change the building elevation and wall colors in this exterior/parking space to ${selectedColor}. Apply this color to building facades, walls, and architectural elements while preserving parking surfaces, landscaping, and lighting exactly as they are.`;

    try {
      const currentImageFile = await dataUrlToFile(displayImageUrl, originalImage.name || 'current-scene.png');
      const newImageUrl = await changeColor(currentImageFile, null, selectedColor, customPrompt);
      updateHistory(newImageUrl);
      setAppState(AppState.Editing);
      setColorPickerOpen(false);
      toast.success("Building color changed successfully!");
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to change building color.");
      setAppState(AppState.Editing);
      toast.error("Failed to change color. Please try again.");
    }
  };

  const handleDownloadImage = () => {
    if (displayImageUrl) {
      const link = document.createElement('a');
      link.href = displayImageUrl;
      link.download = 'parking-tiles-design.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Image downloaded successfully!");
    }
  };

  const toggleTileSelection = (tile: ParkingTile) => {
    const newSelectedTiles = new Set(selectedTiles);
    if (selectedTiles.has(tile.id)) {
      newSelectedTiles.delete(tile.id);
    } else {
      newSelectedTiles.add(tile.id);
    }
    setSelectedTiles(newSelectedTiles);
  };

  const toggleAccordion = (key: keyof typeof accordionState) => {
    setAccordionState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleStructureSelection = (category: string, name: string) => {
    setSelectedStructure({ category, name });
    setCustomPrompt('');
    
    // Toggle highlighting for the selected structure
    setDetectedStructures(prev => ({
      ...prev,
      [category === 'main' ? 'mainStructural' : 'decorativeElements']: prev[category === 'main' ? 'mainStructural' : 'decorativeElements'].map(item => 
        item.name === name ? { ...item, highlighted: !item.highlighted } : { ...item, highlighted: false }
      )
    }));
  };

  const detectStructureFeatures = async () => {
    if (!originalImage) return;
    
    setIsDetectingStructures(true);
    clearError();
    
    try {
      const detectedObjects = await detectObjects(originalImage);
      
      // Categorize structures for parking spaces
      const mainStructural = detectedObjects
        .filter(obj => 
          obj.name.toLowerCase().includes('driveway') ||
          obj.name.toLowerCase().includes('garage') ||
          obj.name.toLowerCase().includes('pathway') ||
          obj.name.toLowerCase().includes('parking') ||
          obj.name.toLowerCase().includes('surface') ||
          obj.name.toLowerCase().includes('floor') ||
          obj.name.toLowerCase().includes('facade') ||
          obj.name.toLowerCase().includes('wall') ||
          obj.name.toLowerCase().includes('building')
        )
        .map(obj => ({ name: obj.name, highlighted: false }));

      const decorativeElements = detectedObjects
        .filter(obj => 
          obj.name.toLowerCase().includes('lighting') ||
          obj.name.toLowerCase().includes('light') ||
          obj.name.toLowerCase().includes('landscape') ||
          obj.name.toLowerCase().includes('grass') ||
          obj.name.toLowerCase().includes('concrete') ||
          obj.name.toLowerCase().includes('edge') ||
          obj.name.toLowerCase().includes('shadow') ||
          obj.name.toLowerCase().includes('material') ||
          obj.name.toLowerCase().includes('trim') ||
          obj.name.toLowerCase().includes('accent')
        )
        .map(obj => ({ name: obj.name, highlighted: false }));

      setDetectedStructures({
        mainStructural,
        decorativeElements
      });
      
      toast.success("Structure features detected successfully!");
    } catch (error) {
      console.error("Error detecting structures:", error);
      setErrorMessage("Failed to detect structure features. Using default options.");
      
      // Fallback to default structure options
      setDetectedStructures({
        mainStructural: [
          { name: "Driveway Surface", highlighted: false },
          { name: "Garage Floor", highlighted: false },
          { name: "Pathway", highlighted: false },
          { name: "Building Facade", highlighted: false }
        ],
        decorativeElements: [
          { name: "Landscape Edges", highlighted: false },
          { name: "Lighting Fixtures", highlighted: false },
          { name: "Concrete Borders", highlighted: false },
          { name: "Shadow Areas", highlighted: false }
        ]
      });
      
      toast.error("Using default structure options");
    } finally {
      setIsDetectingStructures(false);
    }
  };

  const handleApplyStructureChange = async () => {
    if (!displayImageUrl || !originalImage || (!selectedStructure && !customPrompt)) return;
    clearError();
    setAppState(AppState.Generating);

    const prompt = customPrompt || 
      `Modify the ${selectedStructure?.name.toLowerCase()} in this parking/exterior space to use the color ${selectedColor}. Apply this color change realistically while preserving all other elements, lighting, and textures exactly as they are.`;

    try {
      const currentImageFile = await dataUrlToFile(displayImageUrl, originalImage.name || 'current-scene.png');
      const newImageUrl = await changeColor(currentImageFile, null, selectedColor, prompt);
      updateHistory(newImageUrl);
      setAppState(AppState.Editing);
      toast.success("Structure color applied successfully!");
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to apply structure color.");
      setAppState(AppState.Editing);
      toast.error("Failed to apply color. Please try again.");
    }
  };

  // Standard color palettes
  const standardColors = {
    vibrantAccents: ['#DC143C', '#FFD700', '#1E90FF', '#32CD32', '#8A2BE2', '#FF8C00'],
    architecturalNeutrals: ['#2C2C2C', '#696969', '#A9A9A9', '#DCDCDC', '#F5F5F5'],
    earthyTones: ['#8B7355', '#A0522D', '#8B4513', '#654321', '#708090', '#2F4F4F'],
    softPastels: ['#E6E6FA', '#B0E0E6', '#98FB98', '#F0E68C', '#FFC0CB', '#F5F5DC']
  };

  const isGenerating = appState === AppState.Generating;
  const isAnalyzing = appState === AppState.StructureAnalyzing;

  if (appState === AppState.WaitingForImage) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
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
              <Car className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-semibold">Parking Tiles Visualizer</h1>
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center text-center min-h-[70vh]">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Car className="w-12 h-12 text-primary" />
              <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight">
                Design your Parking Tiles
              </h2>
            </div>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
              Durable exterior tiles with AI visualization
            </p>
            <ImageUploader 
              id="parking-uploader"
              onFileSelect={handleFileSelect}
              imageUrl={null}
            />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
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
            <Car className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-semibold">Parking Tiles Visualizer</h1>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
            {errorMessage}
          </div>
        )}

        {/* Before/After Layout */}
        <div className="w-full max-w-7xl mx-auto animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Before Panel */}
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold">Before</h2>
              </div>
              <div className="relative w-full aspect-[4/3] bg-muted rounded-lg overflow-hidden border border-border">
                {originalImageUrl ? (
                  <img 
                    ref={beforeImageRef} 
                    src={originalImageUrl} 
                    alt="Before" 
                    className="w-full h-full object-contain pointer-events-none" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    Awaiting image upload...
                  </div>
                )}
              </div>
            </div>

            {/* After Panel */}
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold">After</h2>
              </div>
              <div className="relative w-full aspect-[4/3] bg-muted rounded-lg overflow-hidden border border-border">
                {displayImageUrl ? (
                  <img 
                    ref={afterImageRef} 
                    src={displayImageUrl} 
                    alt="After" 
                    className="w-full h-full object-contain pointer-events-none" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    Awaiting generation...
                  </div>
                )}
                
                {(isGenerating || isAnalyzing) && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <div className="text-white text-center">
                      <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p>{isAnalyzing ? 'Analyzing structure...' : 'Applying changes...'}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Control Bar */}
              <div className="flex items-center justify-between mt-4 p-2 bg-background rounded-lg border">
                <div className="flex items-center space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleUndo} 
                    disabled={historyIndex <= 0}
                  >
                    <Undo className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleRedo} 
                    disabled={historyIndex >= imageHistory.length - 1}
                  >
                    <Redo className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="sm"><ZoomIn className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm"><ZoomOut className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm"><RotateCcw className="w-4 h-4" /></Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleDownloadImage}
                    disabled={!displayImageUrl || displayImageUrl === originalImageUrl}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Tools Section */}
          <div className="bg-background p-6 rounded-lg border mt-8">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'painter' | 'tiles' | 'placement')} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="painter">Structure Painter</TabsTrigger>
                <TabsTrigger value="tiles">Try Parking Tiles</TabsTrigger>
                <TabsTrigger value="placement">Structure Placement & Removal</TabsTrigger>
              </TabsList>
              
              <TabsContent value="painter" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left column: Structure Selection */}
                  <div>
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-foreground">1. Select a Structure Feature</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        disabled={isGenerating || isDetectingStructures}
                        className="flex items-center space-x-2"
                        onClick={detectStructureFeatures}
                      >
                        {isDetectingStructures ? (
                          <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        <span>{isDetectingStructures ? 'Detecting...' : 'Detect Structures'}</span>
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                      Click a structure element below. Use refresh after making changes to the image.
                    </p>
                    
                    <div className="space-y-2">
                      {/* Main Structural Elements */}
                      <Collapsible 
                        open={accordionState.mainStructural} 
                        onOpenChange={() => toggleAccordion('mainStructural')}
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between"
                          >
                            <span className="font-semibold">Main Structural Elements</span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${accordionState.mainStructural ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="flex flex-wrap gap-2 p-3 border rounded-md">
                            {detectedStructures.mainStructural.length > 0 ? (
                              detectedStructures.mainStructural.map(item => (
                                <Button
                                  key={item.name}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStructureSelection('main', item.name)}
                                  className={`text-sm ${
                                    selectedStructure?.name === item.name 
                                      ? 'bg-primary text-primary-foreground' 
                                      : item.highlighted 
                                      ? 'bg-yellow-100 text-yellow-800 border-yellow-300' 
                                      : 'hover:bg-muted'
                                  }`}
                                >
                                  {item.name}
                                </Button>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground p-2">
                                Click "Detect Structures" to identify main structural elements in your image.
                              </p>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Decorative Elements */}
                      <Collapsible 
                        open={accordionState.decorativeElements} 
                        onOpenChange={() => toggleAccordion('decorativeElements')}
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between"
                          >
                            <span className="font-semibold">Decorating Elements</span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${accordionState.decorativeElements ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="flex flex-wrap gap-2 p-3 border rounded-md">
                            {detectedStructures.decorativeElements.length > 0 ? (
                              detectedStructures.decorativeElements.map(item => (
                                <Button
                                  key={item.name}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStructureSelection('decorative', item.name)}
                                  className={`text-sm ${
                                    selectedStructure?.name === item.name 
                                      ? 'bg-primary text-primary-foreground' 
                                      : item.highlighted 
                                      ? 'bg-yellow-100 text-yellow-800 border-yellow-300' 
                                      : 'hover:bg-muted'
                                  }`}
                                >
                                  {item.name}
                                </Button>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground p-2">
                                Click "Detect Structures" to identify decorative elements in your image.
                              </p>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </div>

                  {/* Right column: Custom Prompt */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Or Use a Custom Prompt</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                      Get creative with a custom prompt.
                    </p>
                    <Textarea
                      value={customPrompt}
                      onChange={(e) => {
                        setCustomPrompt(e.target.value);
                        setSelectedStructure(null);
                      }}
                      placeholder="e.g., 'Change the parking surface to dark asphalt', 'Make the building walls light gray'"
                      className="w-full h-36 focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Color Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">2. Choose a Color</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="font-semibold text-sm text-foreground mb-2 block">Custom Color</label>
                      <div className="relative">
                        <Button 
                          variant="outline"
                          onClick={() => setIsColorPickerOpen(true)} 
                          className="w-full max-w-xs border rounded-md p-2 flex items-center text-left hover:border-muted-foreground"
                        >
                          <div 
                            className="w-5 h-5 rounded border border-border mr-3" 
                            style={{ backgroundColor: selectedColor }}
                          ></div>
                          <span className="font-mono">{selectedColor}</span>
                        </Button>
                        {isColorPickerOpen && (
                          <ColorPickerPopover 
                            currentColor={selectedColor}
                            onColorChange={setSelectedColor}
                            onClose={() => setIsColorPickerOpen(false)}
                          />
                        )}
                      </div>
                    </div>
                    
                    {/* AI Palette Suggestions */}
                    <Collapsible 
                      open={accordionState.aiColors} 
                      onOpenChange={() => toggleAccordion('aiColors')}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between"
                        >
                          <span className="font-semibold">AI Palette Suggestions</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${accordionState.aiColors ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="p-4 border rounded-md">
                          <p className="text-sm text-muted-foreground mb-3">AI-suggested colors for parking and exterior spaces</p>
                          <div className="grid grid-cols-6 gap-2">
                            {['#2C3E50', '#34495E', '#7F8C8D', '#95A5A6', '#BDC3C7', '#ECF0F1'].map(color => (
                              <button
                                key={color}
                                onClick={() => setSelectedColor(color)}
                                className={`w-8 h-8 rounded border-2 ${selectedColor === color ? 'border-primary' : 'border-border'}`}
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Standard Palettes */}
                    <Collapsible 
                      open={accordionState.standardPalettes} 
                      onOpenChange={() => toggleAccordion('standardPalettes')}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between"
                        >
                          <span className="font-semibold">Standard Palettes</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${accordionState.standardPalettes ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="p-4 border rounded-md space-y-4">
                          {Object.entries(standardColors).map(([category, colors]) => (
                            <div key={category}>
                              <h4 className="text-sm font-medium mb-2 capitalize">
                                {category.replace(/([A-Z])/g, ' $1').trim()}
                              </h4>
                              <div className="grid grid-cols-6 gap-2">
                                {colors.map(color => (
                                  <button
                                    key={color}
                                    onClick={() => setSelectedColor(color)}
                                    className={`w-8 h-8 rounded border-2 ${selectedColor === color ? 'border-primary' : 'border-border'}`}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>

                  <Button 
                    onClick={handleApplyStructureChange}
                    disabled={isGenerating || (!selectedStructure && !customPrompt)}
                    className="w-full mt-6"
                    size="lg"
                  >
                    {isGenerating ? 'Applying...' : 'Apply Color Change'}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="tiles" className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Parking Tile Collection</h3>
                  <div className="grid gap-3 max-h-[600px] overflow-y-auto">
                    {defaultParkingTiles.map((tile) => (
                      <ParkingTileCard
                        key={tile.id}
                        tile={tile}
                        isSelected={selectedTiles.has(tile.id)}
                        onSelect={toggleTileSelection}
                        onApply={handleApplyParkingTile}
                        isApplying={applyingTileId === tile.id}
                      />
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="placement" className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Structure Placement & Removal</h3>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Modify external elements and parking structures:
                    </p>
                    <div className="grid gap-2">
                      <Button variant="outline" size="sm" className="justify-start">
                        <Wand2 className="w-4 h-4 mr-2" />
                        Add Landscape Elements
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start">
                        <Car className="w-4 h-4 mr-2" />
                        Place Parking Structures
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove Exterior Elements
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Customize external elevation and parking tile design elements.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ParkingTiles;