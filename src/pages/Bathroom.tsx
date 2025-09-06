/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowLeft, Bath, Download, Palette } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ImageUploader from '../components/ImageUploader';
import ColorPickerPopover from '../components/ColorPickerPopover';
import { redesignBathroomFloorAndWalls, changeColor } from '../services/geminiService';
import { BATHROOM_TILE_SETS, type TileSet } from '../types/kajaria';

enum AppState {
  WaitingForImage,
  Editing,
  Generating,
}

const Bathroom: React.FC = () => {
  const navigate = useNavigate();
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.WaitingForImage);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTileSets, setSelectedTileSets] = useState<Set<string>>(new Set());
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [imageHistory, setImageHistory] = useState<string[]>([]);

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
    setAppState(AppState.Editing);
    clearError();
    toast.success("Image uploaded successfully!");
  }, []);

  const handleApplySelectedTileSet = async (tileSet: TileSet) => {
    if (!displayImageUrl || !originalImage) return;
    clearError();
    setAppState(AppState.Generating);

    const floorTile = tileSet.floorTile;
    const wallTile = tileSet.wallTile;
    
    // Enhanced bathroom-specific prompt for better wall coverage
    const prompt = wallTile 
      ? `Transform this entire bathroom with premium tiles. Apply a photorealistic ${floorTile.name} tile pattern (${floorTile.series} series, code ${floorTile.code}, size ${floorTile.size}) to the ENTIRE floor area. Apply a photorealistic ${wallTile.name} tile pattern (${wallTile.series} series, code ${wallTile.code}, size ${wallTile.size}) to ALL bathroom walls including: main wall, side walls, shower walls, wall behind toilet, wall around bathtub, and any accent walls. Ensure COMPLETE coverage of all vertical wall surfaces from floor to ceiling. The tiles should seamlessly cover every visible wall surface with consistent pattern alignment and natural lighting. Preserve all bathroom fixtures, fittings, and objects exactly as they are.`
      : `Apply a photorealistic ${floorTile.name} tile pattern (${floorTile.series} series, code ${floorTile.code}, size ${floorTile.size}) to the entire floor area. Preserve all other elements of the bathroom exactly as they are. The floor should look natural and realistic with proper lighting and perspective.`;

    try {
      const currentImageFile = await dataUrlToFile(displayImageUrl, originalImage.name || 'current-scene.png');
      const newImageUrl = await redesignBathroomFloorAndWalls(currentImageFile, prompt);
      updateHistory(newImageUrl);
      setAppState(AppState.Editing);
      toast.success("Bathroom tiles applied successfully!");
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred during bathroom redesign.");
      setAppState(AppState.Editing);
      toast.error("Failed to apply tiles. Please try again.");
    }
  };

  const handleColorChange = async () => {
    if (!displayImageUrl || !originalImage) return;
    clearError();
    setAppState(AppState.Generating);

    const customPrompt = `Change the wall color in this bathroom to ${selectedColor}. Apply this color to ALL bathroom walls including main walls, side walls, shower walls, and any visible wall surfaces. Maintain the exact same lighting and preserve all fixtures, tiles, and bathroom elements exactly as they are.`;

    try {
      const currentImageFile = await dataUrlToFile(displayImageUrl, originalImage.name || 'current-scene.png');
      const newImageUrl = await changeColor(currentImageFile, null, selectedColor, customPrompt);
      updateHistory(newImageUrl);
      setAppState(AppState.Editing);
      setColorPickerOpen(false);
      toast.success("Wall color changed successfully!");
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred during color change.");
      setAppState(AppState.Editing);
      toast.error("Failed to change wall color. Please try again.");
    }
  };

  const handleDownloadImage = () => {
    if (displayImageUrl) {
      const link = document.createElement('a');
      link.href = displayImageUrl;
      link.download = 'bathroom-design.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Image downloaded successfully!");
    }
  };

  const toggleTileSetSelection = (tileSet: TileSet) => {
    const newSelectedTileSets = new Set(selectedTileSets);
    if (selectedTileSets.has(tileSet.id)) {
      newSelectedTileSets.delete(tileSet.id);
    } else {
      newSelectedTileSets.add(tileSet.id);
    }
    setSelectedTileSets(newSelectedTileSets);
  };

  const isGenerating = appState === AppState.Generating;

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
              <Bath className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-semibold">Bathroom Visualizer</h1>
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center text-center min-h-[70vh]">
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
              Bathroom Visualizer
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
              Water-resistant floor & wall sets. Upload your bathroom image to see how our durable tiles will enhance your space.
            </p>
            <ImageUploader 
              id="bathroom-uploader"
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
              <Bath className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-semibold">Bathroom Visualizer</h1>
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
                    alt="Bathroom visualization" 
                    className="w-full h-auto rounded-lg border-2 border-border"
                  />
                  {isGenerating && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                      <div className="text-white text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p>Applying tiles...</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Tile Sets Sidebar */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-4">Bathroom Tile Sets</h3>
              <div className="grid gap-3 max-h-[600px] overflow-y-auto">
                {BATHROOM_TILE_SETS.map((tileSet) => {
                  const isSelected = selectedTileSets.has(tileSet.id);
                  return (
                    <Card 
                      key={tileSet.id} 
                      className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => toggleTileSetSelection(tileSet)}
                    >
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <div className="grid grid-cols-2 gap-1 mb-2">
                            <img 
                              src={tileSet.floorTile.imageUrl} 
                              alt={tileSet.floorTile.name}
                              className="w-full h-16 object-cover rounded border"
                            />
                            {tileSet.wallTile && (
                              <img 
                                src={tileSet.wallTile.imageUrl} 
                                alt={tileSet.wallTile.name}
                                className="w-full h-16 object-cover rounded border"
                              />
                            )}
                          </div>
                          <h4 className="text-sm font-semibold mb-2">{tileSet.name}</h4>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplySelectedTileSet(tileSet);
                              }}
                              disabled={isGenerating}
                            >
                              Apply Set Now
                            </Button>
                            {isSelected && (
                              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                                <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Bathroom;