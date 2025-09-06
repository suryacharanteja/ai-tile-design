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
import { Badge } from '@/components/ui/badge';

const Kitchen = () => {
  const {
    state,
    uploadedImage,
    modifiedImage,
    selectedKitchenSets,
    kitchenModularSets,
    
    handleImageUpload,
    handleKitchenSetSelect,
    handleApplySelectedKitchenSet,
  } = useRoomVisualization('kitchen');

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
          <span className="font-medium">Kitchen</span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Kitchen Modular Visualizer
          </h1>
          <p className="text-lg text-muted-foreground">
            Upload your kitchen image and apply complete modular sets with backsplash, sink, and granite recommendations
          </p>
        </div>

        {!uploadedImage ? (
          <div className="max-w-2xl mx-auto">
            <ImageUploader id="kitchen-uploader" onFileSelect={handleImageUpload} imageUrl={uploadedImage} />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Image Display */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-lg p-6 border">
                <h2 className="text-xl font-semibold mb-4">Kitchen Visualization</h2>
                {modifiedImage && (
                  <img 
                    src={modifiedImage} 
                    alt="Kitchen visualization" 
                    className="w-full rounded-lg shadow-lg"
                  />
                )}
                {state === 1 && <Spinner />}
              </div>
            </div>

            {/* Kitchen Set Selection */}
            <div className="space-y-6">
              <div className="bg-card rounded-lg p-6 border">
                <h3 className="text-lg font-semibold mb-4">Select Kitchen Sets</h3>
                
                {/* Granite Disclaimer */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-amber-800">
                    <strong>Note:</strong> We provide granite/marble color recommendations only. 
                    Granite/marble procurement is handled by specialized vendors.
                  </p>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {kitchenModularSets.map((set) => (
                    <Card
                      key={set.id}
                      className={`cursor-pointer transition-colors ${
                        selectedKitchenSets.some(s => s.id === set.id)
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => handleKitchenSetSelect(set)}
                    >
                      <CardContent className="p-4">
                        <h4 className="font-medium text-sm mb-2">{set.name}</h4>
                        <div className="space-y-2">
                          <div className="text-xs">
                            <Badge variant="secondary" className="mr-1">Backsplash</Badge>
                            {set.backsplashTile.name}
                          </div>
                          <div className="text-xs">
                            <Badge variant="secondary" className="mr-1">Sink</Badge>
                            {set.sinkSpecs.material} {set.sinkSpecs.type}
                          </div>
                          <div className="text-xs">
                            <Badge variant="outline" className="mr-1">Granite</Badge>
                            {set.graniteRecommendation.color} {set.graniteRecommendation.pattern}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {selectedKitchenSets.length > 0 && (
                  <Button 
                    onClick={handleApplySelectedKitchenSet}
                    className="w-full mt-4"
                    disabled={state === 3}
                  >
                    Apply Selected Sets ({selectedKitchenSets.length})
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

export default Kitchen;