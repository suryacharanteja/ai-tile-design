/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface ParkingTile {
  id: string;
  name: string;
  productCode: string;
  url: string;
  category: string;
  material: string;
  finish: string;
  size: string;
  slipRating: string;
}

// Default parking tiles hosted for easy access
export const defaultParkingTiles: ParkingTile[] = [
  {
    id: 'grey-concrete-interlocking',
    name: 'Grey Concrete Interlocking',
    productCode: 'PCT-001',
    url: 'https://githubyourcontent/gh/yourusername/ParkingTiles@main/tiles/grey-concrete-interlocking.jpg',
    category: 'Concrete',
    material: 'Concrete',
    finish: 'Textured',
    size: '400x400',
    slipRating: 'R11',
  },
  {
    id: 'charcoal-paver-stones',
    name: 'Charcoal Paver Stones',
    productCode: 'PCT-002',
    url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=300&h=300&fit=crop',
    category: 'Stone',
    material: 'Natural Stone',
    finish: 'Honed',
    size: '300x300',
    slipRating: 'R12',
  },
  {
    id: 'red-brick-pavers',
    name: 'Red Brick Pavers',
    productCode: 'PCT-003',
    url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&fit=crop',
    category: 'Brick',
    material: 'Clay Brick',
    finish: 'Natural',
    size: '200x100',
    slipRating: 'R10',
  },
  {
    id: 'granite-cobblestone',
    name: 'Granite Cobblestone',
    productCode: 'PCT-004',
    url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop',
    category: 'Granite',
    material: 'Granite',
    finish: 'Textured',
    size: '100x100',
    slipRating: 'R13',
  },
  {
    id: 'permeable-grass-pavers',
    name: 'Permeable Grass Pavers',
    productCode: 'PCT-005',
    url: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=300&h=300&fit=crop',
    category: 'Eco-Friendly',
    material: 'Concrete Grid',
    finish: 'Open Grid',
    size: '500x500',
    slipRating: 'R11',
  },
  {
    id: 'sandstone-pavers',
    name: 'Sandstone Pavers',
    productCode: 'PCT-006',
    url: 'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?w=300&h=300&fit=crop',
    category: 'Stone',
    material: 'Sandstone',
    finish: 'Natural Cleft',
    size: '600x400',
    slipRating: 'R11',
  },
  {
    id: 'dark-slate-tiles',
    name: 'Dark Slate Tiles',
    productCode: 'PCT-007',
    url: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=300&h=300&fit=crop',
    category: 'Slate',
    material: 'Natural Slate',
    finish: 'Split Face',
    size: '400x400',
    slipRating: 'R12',
  },
  {
    id: 'beige-travertine-pavers',
    name: 'Beige Travertine Pavers',
    productCode: 'PCT-008',
    url: 'https://images.unsplash.com/photo-1600486913747-55e5470d6f40?w=300&h=300&fit=crop',
    category: 'Travertine',
    material: 'Travertine',
    finish: 'Tumbled',
    size: '400x600',
    slipRating: 'R10',
  },
  {
    id: 'hexagonal-concrete-pavers',
    name: 'Hexagonal Concrete Pavers',
    productCode: 'PCT-009',
    url: 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=300&h=300&fit=crop',
    category: 'Concrete',
    material: 'Concrete',
    finish: 'Smooth',
    size: '250x290',
    slipRating: 'R11',
  },
  {
    id: 'brown-clay-bricks',
    name: 'Brown Clay Bricks',
    productCode: 'PCT-010',
    url: 'https://images.unsplash.com/photo-1600298881974-6be191ceeda1?w=300&h=300&fit=crop',
    category: 'Brick',
    material: 'Clay Brick',
    finish: 'Wire Cut',
    size: '230x110',
    slipRating: 'R10',
  },
  {
    id: 'limestone-pavers',
    name: 'Limestone Pavers',
    productCode: 'PCT-011',
    url: 'https://images.unsplash.com/photo-1600573472829-17c7e2e2c816?w=300&h=300&fit=crop',
    category: 'Limestone',
    material: 'Limestone',
    finish: 'Honed',
    size: '600x300',
    slipRating: 'R11',
  },
  {
    id: 'decorative-stamped-concrete',
    name: 'Decorative Stamped Concrete',
    productCode: 'PCT-012',
    url: 'https://images.unsplash.com/photo-1600087626014-e652e18bbff2?w=300&h=300&fit=crop',
    category: 'Concrete',
    material: 'Stamped Concrete',
    finish: 'Stamped Pattern',
    size: 'Custom',
    slipRating: 'R11',
  },
];