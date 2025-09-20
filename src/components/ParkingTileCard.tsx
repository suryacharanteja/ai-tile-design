/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ParkingTile } from '../types/parkingTiles';

interface ParkingTileCardProps {
  tile: ParkingTile;
  isSelected: boolean;
  onSelect: (tile: ParkingTile) => void;
  onApply: (tile: ParkingTile) => void;
  isApplying: boolean;
}

const ParkingTileCard: React.FC<ParkingTileCardProps> = ({
  tile,
  isSelected,
  onSelect,
  onApply,
  isApplying
}) => {
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={() => onSelect(tile)}
    >
      <CardContent className="p-3">
        <div className="space-y-3">
          <div className="aspect-square w-full bg-muted rounded-lg overflow-hidden">
            <img 
              src={tile.url} 
              alt={tile.name}
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-semibold truncate">{tile.name}</h4>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>{tile.productCode}</span>
              <Badge variant="outline" className="text-xs">
                {tile.size}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>
                <span className="text-muted-foreground">Material: </span>
                <span className="font-medium">{tile.material}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Slip: </span>
                <span className="font-medium">{tile.slipRating}</span>
              </div>
            </div>
            
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onApply(tile);
              }}
              disabled={isApplying}
            >
              {isApplying ? 'Applying...' : 'Apply Tile'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ParkingTileCard;