/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Upload, Image } from 'lucide-react';

interface ImageInputModalProps {
  open: boolean;
  onClose: () => void;
  onFileSelect: (file: File) => void;
  roomType: string;
}

const stockImages = {
  'hall-bedroom': [
    { id: 1, url: '/api/placeholder/400/300', name: 'Modern Living Room' },
    { id: 2, url: '/api/placeholder/400/300', name: 'Bedroom Interior' },
    { id: 3, url: '/api/placeholder/400/300', name: 'Hall Space' },
  ],
  'bathroom': [
    { id: 1, url: '/api/placeholder/400/300', name: 'Modern Bathroom' },
    { id: 2, url: '/api/placeholder/400/300', name: 'Luxury Bathroom' },
    { id: 3, url: '/api/placeholder/400/300', name: 'Compact Bathroom' },
  ],
  'kitchen': [
    { id: 1, url: '/api/placeholder/400/300', name: 'Modern Kitchen' },
    { id: 2, url: '/api/placeholder/400/300', name: 'Traditional Kitchen' },
    { id: 3, url: '/api/placeholder/400/300', name: 'Compact Kitchen' },
  ],
  'god-room': [
    { id: 1, url: '/api/placeholder/400/300', name: 'Prayer Room' },
    { id: 2, url: '/api/placeholder/400/300', name: 'Meditation Space' },
    { id: 3, url: '/api/placeholder/400/300', name: 'Sacred Corner' },
  ],
};

const ImageInputModal: React.FC<ImageInputModalProps> = ({ open, onClose, onFileSelect, roomType }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect(file);
      onClose();
    }
  };

  const handleTemplateSelect = async (templateUrl: string) => {
    try {
      const response = await fetch(templateUrl);
      const blob = await response.blob();
      const file = new File([blob], 'template.jpg', { type: 'image/jpeg' });
      onFileSelect(file);
      onClose();
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  const currentStockImages = stockImages[roomType as keyof typeof stockImages] || stockImages['hall-bedroom'];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Choose Your Image - {roomType.replace('-', ' ').toUpperCase()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-6 p-4">
          {/* Upload Customer Photo */}
          <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Upload Customer's Photo</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload your customer's room photo for personalized visualization
                </p>
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Button className="w-full" size="lg">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Photo
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Use Showroom Template */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <Image className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Use Showroom Template</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start with our professional room templates
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {currentStockImages.map((template) => (
                  <Card 
                    key={template.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleTemplateSelect(template.url)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-12 bg-muted rounded-md flex items-center justify-center">
                          <Image className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{template.name}</p>
                          <p className="text-xs text-muted-foreground">Click to use</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageInputModal;