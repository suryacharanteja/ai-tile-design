/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Star, Download, X } from 'lucide-react';

interface DesignResult {
  id: string;
  imageUrl: string;
  tileName: string;
  tileCode: string;
  series: string;
}

interface ShowcaseGalleryProps {
  open: boolean;
  onClose: () => void;
  designs: DesignResult[];
  onDownloadFavorites: (favoriteIds: string[]) => void;
}

const ShowcaseGallery: React.FC<ShowcaseGalleryProps> = ({ 
  open, 
  onClose, 
  designs, 
  onDownloadFavorites 
}) => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const toggleFavorite = (designId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(designId)) {
      newFavorites.delete(designId);
    } else {
      newFavorites.add(designId);
    }
    setFavorites(newFavorites);
  };

  const handleDownloadFavorites = () => {
    if (favorites.size > 0) {
      onDownloadFavorites(Array.from(favorites));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Design Showcase Gallery
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {designs.length} designs generated • {favorites.size} favorites selected
            </p>
            <Button 
              onClick={handleDownloadFavorites}
              disabled={favorites.size === 0}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Favorites ({favorites.size})
            </Button>
          </div>
        </DialogHeader>
        
        <ScrollArea className="h-[600px] w-full">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {designs.map((design) => (
              <Card 
                key={design.id} 
                className={`relative cursor-pointer transition-all ${
                  favorites.has(design.id) ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
                }`}
                onClick={() => toggleFavorite(design.id)}
              >
                <CardContent className="p-3">
                  <div className="aspect-square bg-muted rounded-lg mb-2 relative overflow-hidden">
                    <img 
                      src={design.imageUrl} 
                      alt={`${design.tileName} visualization`}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`absolute top-2 right-2 p-1 h-auto ${
                        favorites.has(design.id) 
                          ? 'text-yellow-500' 
                          : 'text-muted-foreground hover:text-yellow-500'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(design.id);
                      }}
                    >
                      <Star 
                        className={`w-4 h-4 ${
                          favorites.has(design.id) ? 'fill-current' : ''
                        }`} 
                      />
                    </Button>
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="font-medium text-xs">{design.tileName}</h4>
                    <p className="text-xs text-muted-foreground">{design.series}</p>
                    <Badge variant="outline" className="text-xs">
                      {design.tileCode}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
        
        {favorites.size > 0 && (
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Selected {favorites.size} design{favorites.size !== 1 ? 's' : ''} for download
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setFavorites(new Set())}
                >
                  Clear Favorites
                </Button>
                <Button onClick={handleDownloadFavorites}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Selected
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShowcaseGallery;