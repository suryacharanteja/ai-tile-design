/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

interface TileSetCardProps {
  floorTile: {
    name: string;
    code: string;
    series: string;
    size: string;
  };
  wallTile?: {
    name: string;
    code: string;
    series: string;
    size: string;
  };
  onClick: () => void;
  isSelected?: boolean;
}

const TileSetCard: React.FC<TileSetCardProps> = ({ 
  floorTile, 
  wallTile, 
  onClick, 
  isSelected = false 
}) => {
  return (
    <Card 
      className={`cursor-pointer transition-all ${
        isSelected 
          ? 'ring-2 ring-primary shadow-lg' 
          : 'hover:shadow-md'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Floor Tile */}
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-muted-foreground">Floor</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{floorTile.name}</h4>
              <p className="text-xs text-muted-foreground truncate">{floorTile.series}</p>
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {floorTile.code}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {floorTile.size}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Wall Tile (if exists) */}
          {wallTile && (
            <>
              <div className="border-t border-muted" />
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-muted-foreground">Wall</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{wallTile.name}</h4>
                  <p className="text-xs text-muted-foreground truncate">{wallTile.series}</p>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {wallTile.code}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {wallTile.size}
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          )}
          
          <div className="text-center pt-2">
            <Badge variant="default" className="text-xs">
              {wallTile ? 'Complete Set' : 'Floor Only'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TileSetCard;