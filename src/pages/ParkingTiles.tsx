/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowLeft, Car, Download, Palette, Wand2, Trash2 } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ImageUploader from '../components/ImageUploader';
import ColorPickerPopover from '../components/ColorPickerPopover';
import ParkingTileCard from '../components/ParkingTileCard';
import Spinner from '../components/Spinner';
import { defaultParkingTiles, ParkingTile } from '../types/parkingTiles';
import { generateModelImage, generateVirtualTryOnImage } from '../services/parkingTileService';
import { changeColor } from '../services/geminiService';

enum AppState {
  WaitingForImage,
  StructureAnalyzing,
  Editing,
  Generating,
}

const ParkingTiles: React.FC = () => {
  const navigate = useNavigate();
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [structureAnalyzedImageUrl, setStructureAnalyzedImageUrl] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.WaitingForImage);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTiles, setSelectedTiles] = useState<Set<string>>(new Set());
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [imageHistory, setImageHistory] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'structure' | 'tiles' | 'placement'>('structure');
  const [applyingTileId, setApplyingTileId] = useState<string | null>(null);

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
    setImageHistory(prev => [newImageUrl, ...prev.slice(0, 9)]);
    setDisplayImageUrl(newImageUrl);
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setOriginalImage(file);
    const imageUrl = URL.createObjectURL(file);
    setDisplayImageUrl(imageUrl);
    setImageHistory([imageUrl]);
    setAppState(AppState.StructureAnalyzing);
    clearError();

    try {
      const analyzedImageUrl = await generateModelImage(file);
      setStructureAnalyzedImageUrl(analyzedImageUrl);
      updateHistory(analyzedImageUrl);
      setAppState(AppState.Editing);
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
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
              Design your Parking Tiles
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
              Durable exterior tiles with AI visualization. Upload your parking area image to see how our tiles will transform your driveway.
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
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
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
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setColorPickerOpen(true)}
            >
              <Palette className="w-4 h-4 mr-2" />
              Change Color
            </Button>
            {colorPickerOpen && (
              <ColorPickerPopover
                currentColor={selectedColor}
                onColorChange={setSelectedColor}
                onClose={() => {
                  setColorPickerOpen(false);
                  handleColorChange();
                }}
              />
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownloadImage}
              disabled={!displayImageUrl}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Image Display */}
          <div className="lg:col-span-2">
            <Card className="p-4">
              {displayImageUrl && (
                <div className="relative">
                  <img 
                    src={displayImageUrl} 
                    alt="Parking tiles visualization" 
                    className="w-full h-auto rounded-lg border-2 border-border"
                  />
                  {(isGenerating || isAnalyzing) && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                      <div className="text-white text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p>{isAnalyzing ? 'Analyzing structure...' : 'Applying tiles...'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Tools Sidebar */}
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'structure' | 'tiles' | 'placement')} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="structure">Structure Painter</TabsTrigger>
                <TabsTrigger value="tiles">Try Parking Tiles</TabsTrigger>
                <TabsTrigger value="placement">Structure Placement</TabsTrigger>
              </TabsList>
              
              <TabsContent value="structure" className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Structure Detection</h3>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      AI has analyzed your parking space to detect:
                    </p>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Parking surfaces (driveways, garage floors)</li>
                      <li>• Building facades and elevation</li>
                      <li>• Landscape boundaries</li>
                      <li>• Existing surface materials</li>
                      <li>• Lighting conditions and shadows</li>
                    </ul>
                    {structureAnalyzedImageUrl && (
                      <Badge variant="outline" className="text-green-600">
                        Structure analysis complete
                      </Badge>
                    )}
                  </div>
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
                      Modify exterior elements and structures:
                    </p>
                    <div className="grid gap-2">
                      <Button variant="outline" size="sm" className="justify-start">
                        <Wand2 className="w-4 h-4 mr-2" />
                        Add Landscaping
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start">
                        <Car className="w-4 h-4 mr-2" />
                        Place Vehicle
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove Elements
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click on structures in the image to place or remove exterior elements.
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