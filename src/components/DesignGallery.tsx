/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CheckCircle, Download, Eye, X } from 'lucide-react';
import { toast } from 'sonner';

interface GeneratedDesign {
  id: string;
  imageUrl: string;
  tileName: string;
  tileCode: string;
  tileSeries: string;
}

interface DesignGalleryProps {
  designs: GeneratedDesign[];
  isVisible: boolean;
  onClose: () => void;
  onImageSelect: (imageUrl: string) => void;
}

const DesignGallery: React.FC<DesignGalleryProps> = ({ 
  designs, 
  isVisible, 
  onClose, 
  onImageSelect 
}) => {
  const [selectedDesigns, setSelectedDesigns] = useState<Set<string>>(new Set());
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');

  if (!isVisible || designs.length === 0) return null;

  const handleDesignSelect = (designId: string) => {
    const newSelected = new Set(selectedDesigns);
    if (newSelected.has(designId)) {
      newSelected.delete(designId);
    } else {
      newSelected.add(designId);
    }
    setSelectedDesigns(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedDesigns.size === designs.length) {
      setSelectedDesigns(new Set());
    } else {
      setSelectedDesigns(new Set(designs.map(d => d.id)));
    }
  };

  const downloadSingle = (design: GeneratedDesign) => {
    const link = document.createElement('a');
    link.href = design.imageUrl;
    link.download = `${design.tileName.replace(/\s+/g, '_')}_${design.tileCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloaded ${design.tileName}`);
  };

  const downloadSelected = async () => {
    if (selectedDesigns.size === 0) {
      toast.error("Please select designs to download");
      return;
    }

    const selectedDesignData = designs.filter(d => selectedDesigns.has(d.id));
    
    for (const design of selectedDesignData) {
      setTimeout(() => downloadSingle(design), 100 * selectedDesignData.indexOf(design));
    }
    
    toast.success(`Downloading ${selectedDesigns.size} designs`);
  };

  const downloadAll = async () => {
    for (const design of designs) {
      setTimeout(() => downloadSingle(design), 100 * designs.indexOf(design));
    }
    toast.success(`Downloading all ${designs.length} designs`);
  };

  const openPreview = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setIsPreviewOpen(true);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl z-40 animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-zinc-800">Generated Designs</h3>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {designs.length} designs
            </Badge>
            {selectedDesigns.size > 0 && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                {selectedDesigns.size} selected
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleSelectAll}
              className="text-xs"
            >
              {selectedDesigns.size === designs.length ? 'Deselect All' : 'Select All'}
            </Button>
            
            {selectedDesigns.size > 0 && (
              <Button 
                size="sm" 
                onClick={downloadSelected}
                className="bg-blue-600 hover:bg-blue-700 text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                Download Selected ({selectedDesigns.size})
              </Button>
            )}
            
            <Button 
              size="sm" 
              onClick={downloadAll}
              className="bg-green-600 hover:bg-green-700 text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Download All
            </Button>
            
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={onClose}
              className="hover:bg-red-100 text-red-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {designs.map((design) => {
              const isSelected = selectedDesigns.has(design.id);
              return (
                <Card 
                  key={design.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    isSelected ? 'ring-2 ring-blue-500 shadow-md' : ''
                  }`}
                >
                  <CardContent className="p-2">
                    <div className="relative group">
                      <img 
                        src={design.imageUrl} 
                        alt={design.tileName}
                        className="w-full aspect-square object-cover rounded-md"
                      />
                      
                      {/* Selection indicator */}
                      <div 
                        className="absolute top-1 left-1 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDesignSelect(design.id);
                        }}
                      >
                        {isSelected ? (
                          <CheckCircle className="w-5 h-5 text-blue-600 bg-white rounded-full" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-white bg-black/20 rounded-full" />
                        )}
                      </div>

                      {/* Hover actions */}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="text-xs bg-white/90 hover:bg-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPreview(design.imageUrl);
                          }}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="text-xs bg-white/90 hover:bg-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            onImageSelect(design.imageUrl);
                            toast.success("Image set as current design");
                          }}
                        >
                          Use
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="text-xs bg-white/90 hover:bg-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadSingle(design);
                          }}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-zinc-800 truncate">{design.tileName}</p>
                      <p className="text-xs text-zinc-600">{design.tileCode}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {design.tileSeries}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setIsPreviewOpen(false)}
        >
          <button 
            onClick={() => setIsPreviewOpen(false)}
            className="absolute top-4 right-4 text-white bg-black/40 rounded-full p-2 hover:bg-black/60 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={previewImage} 
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default DesignGallery;