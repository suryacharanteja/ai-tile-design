/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FurnitureSet } from '../services/furnitureDetectionService';

interface FurnitureSetCardProps {
  furnitureSet: FurnitureSet;
  isSelected: boolean;
  onClick?: () => void;
}

const FurnitureSetCard: React.FC<FurnitureSetCardProps> = ({ 
  furnitureSet, 
  isSelected, 
  onClick 
}) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'living_room':
        return '🛋️';
      case 'bedroom':
        return '🛏️';
      case 'dining_room':
        return '🍽️';
      case 'office':
        return '💼';
      case 'decor':
        return '🖼️';
      case 'lighting':
        return '💡';
      default:
        return '🪑';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div
      className={`
        relative bg-white rounded-xl shadow-sm border-2 transition-all duration-300 cursor-pointer
        hover:shadow-lg hover:scale-[1.02]
        ${isSelected 
          ? 'border-blue-500 shadow-lg ring-2 ring-blue-200 scale-[1.02]' 
          : 'border-gray-200 hover:border-blue-300'
        }
      `}
      onClick={onClick}
    >
      {/* Confidence Badge */}
      <div className="absolute top-2 right-2 z-10">
        <span className={`
          px-2 py-1 text-xs font-medium rounded-full bg-white shadow-sm
          ${getConfidenceColor(furnitureSet.confidence)}
        `}>
          {Math.round(furnitureSet.confidence * 100)}%
        </span>
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-2 left-2 z-10">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}

      {/* Product Image */}
      <div className="aspect-square w-full bg-gray-50 rounded-t-xl overflow-hidden">
        <img 
          src={furnitureSet.imageUrl} 
          alt={furnitureSet.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Product Info */}
      <div className="p-4">
        <div className="flex items-start gap-2 mb-2">
          <span className="text-lg" title={furnitureSet.category}>
            {getCategoryIcon(furnitureSet.category)}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">
              {furnitureSet.name}
            </h3>
          </div>
        </div>
        
        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
          {furnitureSet.description}
        </p>
        
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span className="capitalize font-medium">
            {furnitureSet.category.replace('_', ' ')}
          </span>
          <span>
            ID: {furnitureSet.id.slice(-4)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FurnitureSetCard;