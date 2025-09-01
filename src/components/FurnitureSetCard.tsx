/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DetectedFurnitureSet } from '../services/furnitureDetectionService';

interface FurnitureSetCardProps {
    furnitureSet: DetectedFurnitureSet;
    isSelected: boolean;
    onClick?: () => void;
    imageUrl?: string;
}

const FurnitureSetCard: React.FC<FurnitureSetCardProps> = ({ 
    furnitureSet, 
    isSelected, 
    onClick, 
    imageUrl 
}) => {
    const getSetTypeIcon = (setType: string) => {
        switch (setType) {
            case 'furniture_set':
                return (
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                );
            case 'decor_group':
                return (
                    <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                );
        }
    };

    return (
        <div 
            className={`
                group relative bg-card rounded-xl border-2 transition-all duration-300 cursor-pointer overflow-hidden
                ${isSelected 
                    ? 'border-primary shadow-lg shadow-primary/20 scale-[1.02]' 
                    : 'border-border hover:border-primary/50 hover:shadow-md hover:scale-[1.01]'
                }
            `}
            onClick={onClick}
        >
            {/* Background Image Preview */}
            {imageUrl && (
                <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity">
                    <img 
                        src={imageUrl} 
                        alt={furnitureSet.name}
                        className="w-full h-full object-cover"
                    />
                </div>
            )}
            
            {/* Content */}
            <div className="relative p-4">
                <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                        {getSetTypeIcon(furnitureSet.set_type)}
                    </div>
                    
                    {/* Text Content */}
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground text-sm leading-tight mb-1 line-clamp-2">
                            {furnitureSet.name}
                        </h4>
                        <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">
                            {furnitureSet.description}
                        </p>
                        
                        {/* Set Type Badge */}
                        <div className="mt-2">
                            <span className={`
                                inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                                ${furnitureSet.set_type === 'furniture_set' 
                                    ? 'bg-primary/10 text-primary' 
                                    : furnitureSet.set_type === 'decor_group'
                                    ? 'bg-accent/10 text-accent'
                                    : 'bg-secondary/10 text-secondary'
                                }
                            `}>
                                {furnitureSet.set_type === 'furniture_set' ? 'Furniture Set' :
                                 furnitureSet.set_type === 'decor_group' ? 'Decor Collection' : 'Single Piece'}
                            </span>
                        </div>
                    </div>
                    
                    {/* Primary Badge */}
                    {furnitureSet.is_primary && (
                        <div className="flex-shrink-0">
                            <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium">
                                Primary
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Selection Indicator */}
                {isSelected && (
                    <div className="absolute top-2 right-2">
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FurnitureSetCard;