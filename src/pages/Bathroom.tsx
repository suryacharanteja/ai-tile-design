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

import { Card, CardContent } from '@/components/ui/card';

const Bathroom = () => {
  const {
    state,
    uploadedImage,
    modifiedImage,
    selectedBathroomSets,
    tileSets,
    
    handleImageUpload,
    handleBathroomSetSelect,
    handleApplySelectedBathroomSet,
  } = useRoomVisualization('bathroom');

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
          <span className="font-medium">Bathroom</span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Bathroom Tile Visualizer
          </h1>
          <p className="text-lg text-muted-foreground">
            Upload your bathroom image and apply coordinated floor & wall tile sets
          </p>
        </div>

        {!uploadedImage ? (
          <div className="max-w-2xl mx-auto">
            <ImageUploader id="bathroom-uploader" onFileSelect={handleImageUpload} imageUrl={uploadedImage} />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Image Display */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-lg p-6 border">
                <h2 className="text-xl font-semibold mb-4">Bathroom Visualization</h2>
                {modifiedImage && (
                  <img 
                    src={modifiedImage} 
                    alt="Bathroom visualization" 
                    className="w-full rounded-lg shadow-lg"
                  />
                )}
                {state === 1 && <Spinner />}
              </div>
            </div>

            {/* Tile Set Selection */}
            <div className="space-y-6">
              <div className="bg-card rounded-lg p-6 border">
                <h3 className="text-lg font-semibold mb-4">Select Tile Sets</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {tileSets.map((set) => (
                    <Card
                      key={set.id}
                      className={`cursor-pointer transition-colors ${
                        selectedBathroomSets.some(s => s.id === set.id)
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => handleBathroomSetSelect(set)}
                    >
                      <CardContent className="p-4">
                        <h4 className="font-medium text-sm mb-2">{set.name}</h4>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div>Floor: {set.floorTile.name}</div>
                          <div>Wall: {set.wallTile.name}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {selectedBathroomSets.length > 0 && (
                  <Button 
                    onClick={handleApplySelectedBathroomSet}
                    className="w-full mt-4"
                    disabled={state === 3}
                  >
                    Apply Selected Sets ({selectedBathroomSets.length})
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

export default Bathroom;