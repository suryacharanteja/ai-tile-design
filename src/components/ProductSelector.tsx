/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Product } from '../types';
import ObjectCard from './ObjectCard';

interface ProductSelectorProps {
    products: Product[];
    selectedProductId: number | string | null;
    onSelect: (product: Product) => void;
    onAddOwnProductClick: () => void;
}

const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
);

const ArrowRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);

const ProductSelector: React.FC<ProductSelectorProps> = ({ products, selectedProductId, onSelect, onAddOwnProductClick }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkScrollButtons = useCallback(() => {
        const el = scrollContainerRef.current;
        if (el) {
            const atStart = el.scrollLeft < 10;
            const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 10;
            setCanScrollLeft(!atStart);
            setCanScrollRight(!atEnd);
        }
    }, []);
    
    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;

        checkScrollButtons();
        
        if (el.scrollWidth <= el.clientWidth) {
            setCanScrollRight(false);
        }

        const debouncedCheck = () => setTimeout(checkScrollButtons, 100);

        el.addEventListener('scroll', debouncedCheck);
        window.addEventListener('resize', debouncedCheck);
        
        // Also re-check when products change
        debouncedCheck();

        return () => {
            el.removeEventListener('scroll', debouncedCheck);
            window.removeEventListener('resize', debouncedCheck);
        };
    }, [products, checkScrollButtons]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth',
            });
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto text-center animate-fade-in">
            <div className="relative flex items-center">
                <button 
                    onClick={() => scroll('left')}
                    disabled={!canScrollLeft}
                    className="absolute -left-4 z-10 p-2 bg-white rounded-full shadow-md hover:bg-zinc-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Scroll left"
                >
                    <ArrowLeftIcon />
                </button>
                <div
                    ref={scrollContainerRef}
                    className="flex space-x-4 overflow-x-auto snap-x snap-mandatory py-4 px-2 scrollbar-hide"
                >
                    {products.map(product => (
                         <div key={product.id} className="snap-center shrink-0 w-36 md:w-40">
                            <ObjectCard
                                product={product}
                                isSelected={selectedProductId === product.id}
                                onClick={() => onSelect(product)}
                            />
                        </div>
                    ))}
                     <div className="snap-center shrink-0 w-36 md:w-40 flex items-center justify-center">
                        <button
                            onClick={onAddOwnProductClick}
                            className="w-full h-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-bold py-2 px-4 rounded-lg text-sm transition-colors border border-dashed border-zinc-300 shadow-sm flex flex-col items-center justify-center aspect-square"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            Add Your Own
                        </button>
                    </div>
                </div>
                 <button 
                    onClick={() => scroll('right')}
                    disabled={!canScrollRight}
                    className="absolute -right-4 z-10 p-2 bg-white rounded-full shadow-md hover:bg-zinc-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Scroll right"
                >
                    <ArrowRightIcon />
                </button>
            </div>
        </div>
    );
};

export default ProductSelector;