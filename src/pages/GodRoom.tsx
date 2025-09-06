/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useRoomVisualization } from '@/hooks/useRoomVisualization';
import ImageUploader from '@/components/ImageUploader';
import Spinner from '@/components/Spinner';


const GodRoom = () => {
  const {
    state,
    uploadedImage,
    modifiedImage,
    selectedTiles,
    tiles,
    
    handleImageUpload,
    handleTileSelect,
    handleApplySelectedTiles,
  } = useRoomVisualization('god-room');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Room Selection
            </Button>
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">God Room</span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            God Room Tile Visualizer
          </h1>
          <p className="text-lg text-muted-foreground">
            Upload your pooja room image and apply sacred space tile designs
          </p>
        </div>

        {!uploadedImage ? (
          <div className="max-w-2xl mx-auto">
            <ImageUploader id="god-room-uploader" onFileSelect={handleImageUpload} imageUrl={uploadedImage} />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Image Display */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-lg p-6 border">
                <h2 className="text-xl font-semibold mb-4">God Room Visualization</h2>
                {modifiedImage && (
                  <img 
                    src={modifiedImage} 
                    alt="God room visualization" 
                    className="w-full rounded-lg shadow-lg"
                  />
                )}
                {state === 1 && <Spinner />}
              </div>
            </div>

            {/* Tile Selection */}
            <div className="space-y-6">
              <div className="bg-card rounded-lg p-6 border">
                <h3 className="text-lg font-semibold mb-4">Select Sacred Tiles</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {tiles.map((tile) => (
                    <div
                      key={tile.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTiles.some(t => t.id === tile.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleTileSelect(tile)}
                    >
                      <div className="font-medium text-sm">{tile.name}</div>
                      <div className="text-xs text-muted-foreground">{tile.size}</div>
                    </div>
                  ))}
                </div>
                
                {selectedTiles.length > 0 && (
                  <Button 
                    onClick={handleApplySelectedTiles}
                    className="w-full mt-4"
                    disabled={state === 3}
                  >
                    Apply Selected Tiles ({selectedTiles.length})
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
};

export default GodRoom;