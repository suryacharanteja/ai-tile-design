/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface KajariaTile {
  id: string;
  name: string;
  series: string;
  code: string;
  size: string;
  roomTypes: string[];
  imageUrl?: string;
  type: 'floor' | 'wall' | 'both';
}

export interface TileSet {
  id: string;
  name: string;
  floorTile: KajariaTile;
  wallTile?: KajariaTile;
  roomTypes: string[];
}

export interface KitchenModularSet {
  id: string;
  name: string;
  backsplashTile: KajariaTile;
  sinkSpecs: {
    material: string;
    size: string;
    type: string;
    description: string;
  };
  graniteRecommendation: {
    color: string;
    pattern: string;
    description: string;
    note: string;
  };
  roomTypes: string[];
}

// Kajaria Tile Library based on the knowledge base
export const kajariaHallBedroomTiles: KajariaTile[] = [
  // SOLITAIRE PLUS Series - 800x1600 mm
  { id: 'solitaire-plus-k16801', name: 'Solitaire Plus', series: 'SOLITAIRE PLUS', code: 'K-16801', size: '800x1600 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  { id: 'solitaire-plus-k16802', name: 'Solitaire Plus', series: 'SOLITAIRE PLUS', code: 'K-16802', size: '800x1600 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  { id: 'solitaire-plus-k16804', name: 'Solitaire Plus', series: 'SOLITAIRE PLUS', code: 'K-16804', size: '800x1600 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  { id: 'solitaire-plus-k16805', name: 'Solitaire Plus', series: 'SOLITAIRE PLUS', code: 'K-16805', size: '800x1600 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  { id: 'solitaire-plus-k16806', name: 'Solitaire Plus', series: 'SOLITAIRE PLUS', code: 'K-16806', size: '800x1600 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  { id: 'solitaire-plus-k16810', name: 'Solitaire Plus', series: 'SOLITAIRE PLUS', code: 'K-16810', size: '800x1600 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  
  // SOLITAIRE PLUS Series - 1000x1000 mm
  { id: 'solitaire-plus-k10102', name: 'Solitaire Plus', series: 'SOLITAIRE PLUS', code: 'K 10102', size: '1000x1000 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  { id: 'solitaire-plus-k10104', name: 'Solitaire Plus', series: 'SOLITAIRE PLUS', code: 'K 10104', size: '1000x1000 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  { id: 'solitaire-plus-k10105', name: 'Solitaire Plus', series: 'SOLITAIRE PLUS', code: 'K 10105', size: '1000x1000 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  { id: 'solitaire-plus-k10106', name: 'Solitaire Plus', series: 'SOLITAIRE PLUS', code: 'K 10106', size: '1000x1000 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  { id: 'solitaire-plus-k10107', name: 'Solitaire Plus', series: 'SOLITAIRE PLUS', code: 'K 10107', size: '1000x1000 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  { id: 'solitaire-plus-k10108', name: 'Solitaire Plus', series: 'SOLITAIRE PLUS', code: 'K 10108', size: '1000x1000 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  
  // SOLITAIRE Series - 800x800 mm
  { id: 'solitaire-k8401', name: 'Solitaire', series: 'SOLITAIRE', code: 'K 8401', size: '800x800 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  { id: 'solitaire-k8402', name: 'Solitaire', series: 'SOLITAIRE', code: 'K 8402', size: '800x800 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  { id: 'solitaire-k8405', name: 'Solitaire', series: 'SOLITAIRE', code: 'K 8405', size: '800x800 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  { id: 'solitaire-k8409', name: 'Solitaire', series: 'SOLITAIRE', code: 'K 8409', size: '800x800 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  { id: 'solitaire-k8501', name: 'Solitaire', series: 'SOLITAIRE', code: 'K 8501', size: '800x800 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  { id: 'solitaire-k8502', name: 'Solitaire', series: 'SOLITAIRE', code: 'K 8502', size: '800x800 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  { id: 'solitaire-k8503', name: 'Solitaire', series: 'SOLITAIRE', code: 'K 8503', size: '800x800 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  { id: 'solitaire-k8504', name: 'Solitaire', series: 'SOLITAIRE', code: 'K 8504', size: '800x800 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  { id: 'solitaire-k8506', name: 'Solitaire', series: 'SOLITAIRE', code: 'K 8506', size: '800x800 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  { id: 'solitaire-k8800', name: 'Solitaire (Special Plain)', series: 'SOLITAIRE', code: 'K 8800', size: '800x800 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  
  // SAPPHIRE Series - 600x1200 mm
  { id: 'sapphire-k12601', name: 'Sapphire', series: 'SAPPHIRE', code: 'K 12601', size: '600x1200 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  { id: 'sapphire-k12602', name: 'Sapphire', series: 'SAPPHIRE', code: 'K 12602', size: '600x1200 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  { id: 'sapphire-k12604', name: 'Sapphire', series: 'SAPPHIRE', code: 'K 12604', size: '600x1200 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
  { id: 'sapphire-k12605', name: 'Sapphire', series: 'SAPPHIRE', code: 'K 12605', size: '600x1200 mm', roomTypes: ['hall-bedroom'], type: 'floor' },
];

export const kajariaBathroomTiles: KajariaTile[] = [
  // TERRAZZO Series - Floor tiles
  { id: 'terrazzo-12671', name: 'Terrazzo', series: 'TERRAZZO', code: '12671', size: '600x1200 mm', roomTypes: ['bathroom'], type: 'floor' },
  { id: 'terrazzo-12672', name: 'Terrazzo', series: 'TERRAZZO', code: '12672', size: '600x1200 mm', roomTypes: ['bathroom'], type: 'floor' },
  { id: 'terrazzo-12681', name: 'Terrazzo', series: 'TERRAZZO', code: '12681', size: '600x1200 mm', roomTypes: ['bathroom'], type: 'floor' },
  { id: 'terrazzo-12684', name: 'Terrazzo', series: 'TERRAZZO', code: '12684', size: '600x1200 mm', roomTypes: ['bathroom'], type: 'floor' },
  
  // STONE ART Series - Wall tiles
  { id: 'stone-art-white', name: 'Stone Art (White)', series: 'STONE ART', code: '12660', size: '600x1200 mm', roomTypes: ['bathroom'], type: 'wall' },
  { id: 'stone-art-crema', name: 'Stone Art (Crema)', series: 'STONE ART', code: '12661', size: '600x1200 mm', roomTypes: ['bathroom'], type: 'wall' },
  { id: 'stone-art-dark-grey', name: 'Stone Art (Dark Grey)', series: 'STONE ART', code: '12662', size: '600x1200 mm', roomTypes: ['bathroom'], type: 'wall' },
  { id: 'stone-art-brown', name: 'Stone Art (Brown)', series: 'STONE ART', code: '12663', size: '600x1200 mm', roomTypes: ['bathroom'], type: 'wall' },
];

export const kajariaKitchenTiles: KajariaTile[] = [
  // STONEGRES PLUS Series
  { id: 'stonegres-plus-k16851', name: 'StoneGres Plus', series: 'STONEGRES PLUS', code: 'K-16851', size: '800x1600 mm', roomTypes: ['kitchen'], type: 'floor' },
  { id: 'stonegres-plus-k16852', name: 'StoneGres Plus', series: 'STONEGRES PLUS', code: 'K-16852', size: '800x1600 mm', roomTypes: ['kitchen'], type: 'floor' },
  { id: 'stonegres-plus-12650', name: 'StoneGres Plus', series: 'STONEGRES PLUS', code: '12650', size: '600x1200 mm', roomTypes: ['kitchen'], type: 'floor' },
  { id: 'stonegres-plus-12651', name: 'StoneGres Plus', series: 'STONEGRES PLUS', code: '12651', size: '600x1200 mm', roomTypes: ['kitchen'], type: 'floor' },
  
  // STONEGRES NEO Series
  { id: 'stonegres-neo-k6700', name: 'StoneGres Neo', series: 'STONEGRES NEO', code: 'K 6700', size: '600x600 mm', roomTypes: ['kitchen'], type: 'both' },
  { id: 'stonegres-neo-k6701', name: 'StoneGres Neo', series: 'STONEGRES NEO', code: 'K 6701', size: '600x600 mm', roomTypes: ['kitchen'], type: 'both' },
];

export const kajariaGodRoomTiles: KajariaTile[] = [
  // Light colored SOLITAIRE tiles suitable for sacred spaces
  { id: 'solitaire-k8501-god', name: 'Solitaire (Light Cream)', series: 'SOLITAIRE', code: 'K 8501', size: '800x800 mm', roomTypes: ['god-room'], type: 'floor' },
  { id: 'solitaire-k8401-god', name: 'Solitaire (White)', series: 'SOLITAIRE', code: 'K 8401', size: '800x800 mm', roomTypes: ['god-room'], type: 'floor' },
  { id: 'solitaire-k8800-god', name: 'Solitaire (Plain)', series: 'SOLITAIRE', code: 'K 8800', size: '800x800 mm', roomTypes: ['god-room'], type: 'floor' },
  
  // AMAZON Series light patterns
  { id: 'amazon-k6401-god', name: 'Amazon (Light)', series: 'AMAZON', code: 'K 6401', size: '600x600 mm', roomTypes: ['god-room'], type: 'floor' },
  { id: 'amazon-k6402-god', name: 'Amazon (Light)', series: 'AMAZON', code: 'K 6402', size: '600x600 mm', roomTypes: ['god-room'], type: 'floor' },
];

// Bathroom design sets
export const bathroomDesignSets: TileSet[] = [
  {
    id: 'terrazzo-white-set',
    name: 'Terrazzo & White Stone Art Set',
    floorTile: kajariaBathroomTiles.find(t => t.code === '12671')!,
    wallTile: kajariaBathroomTiles.find(t => t.code === '12660')!,
    roomTypes: ['bathroom']
  },
  {
    id: 'terrazzo-crema-set',
    name: 'Terrazzo & Crema Stone Art Set',
    floorTile: kajariaBathroomTiles.find(t => t.code === '12672')!,
    wallTile: kajariaBathroomTiles.find(t => t.code === '12661')!,
    roomTypes: ['bathroom']
  },
];

// Kitchen modular sets
export const kitchenModularSets: KitchenModularSet[] = [
  {
    id: 'stonegres-premium-set-1',
    name: 'Premium StoneGres Kitchen Set',
    backsplashTile: kajariaKitchenTiles.find(t => t.code === 'K-16851')!,
    sinkSpecs: {
      material: 'Stainless Steel',
      size: '24" x 18" x 8"',
      type: 'Single Bowl',
      description: 'Premium gauge stainless steel sink with sound dampening'
    },
    graniteRecommendation: {
      color: 'Kashmir White',
      pattern: 'Speckled with cranberry flecks',
      description: 'Light granite that complements the StoneGres tiles',
      note: 'Granite/Marble not sold by us - customer procurement required'
    },
    roomTypes: ['kitchen']
  },
  {
    id: 'stonegres-modern-set-2',
    name: 'Modern StoneGres Kitchen Set',
    backsplashTile: kajariaKitchenTiles.find(t => t.code === 'K-16852')!,
    sinkSpecs: {
      material: 'Stainless Steel',
      size: '30" x 20" x 9"',
      type: 'Double Bowl',
      description: 'Large capacity double bowl with divider for efficient workflow'
    },
    graniteRecommendation: {
      color: 'Absolute Black',
      pattern: 'Solid black with minimal variation',
      description: 'Bold black granite for modern kitchen aesthetics',
      note: 'Granite/Marble not sold by us - customer procurement required'
    },
    roomTypes: ['kitchen']
  },
  {
    id: 'stonegres-neo-compact-set',
    name: 'Compact Neo Kitchen Set',
    backsplashTile: kajariaKitchenTiles.find(t => t.code === 'K 6700')!,
    sinkSpecs: {
      material: 'Stainless Steel',
      size: '22" x 16" x 7"',
      type: 'Single Bowl Compact',
      description: 'Space-efficient design perfect for compact Indian kitchens'
    },
    graniteRecommendation: {
      color: 'Tan Brown',
      pattern: 'Brown and black speckled pattern',
      description: 'Warm granite that pairs beautifully with Neo series tiles',
      note: 'Granite/Marble not sold by us - customer procurement required'
    },
    roomTypes: ['kitchen']
  },
  {
    id: 'stonegres-neo-elegant-set',
    name: 'Elegant Neo Kitchen Set',
    backsplashTile: kajariaKitchenTiles.find(t => t.code === 'K 6701')!,
    sinkSpecs: {
      material: 'Stainless Steel',
      size: '28" x 18" x 8"',
      type: 'Single Bowl with Drainboard',
      description: 'Traditional Indian kitchen sink with integrated drainboard'
    },
    graniteRecommendation: {
      color: 'Baltic Brown',
      pattern: 'Circular brown patterns with gold highlights',
      description: 'Rich brown granite with distinctive circular patterns',
      note: 'Granite/Marble not sold by us - customer procurement required'
    },
    roomTypes: ['kitchen']
  },
];

export const getTilesByRoomType = (roomType: string): KajariaTile[] => {
  switch (roomType) {
    case 'hall-bedroom':
      return kajariaHallBedroomTiles;
    case 'bathroom':
      return kajariaBathroomTiles;
    case 'kitchen':
      return kajariaKitchenTiles;
    case 'god-room':
      return kajariaGodRoomTiles;
    default:
      return [];
  }
};

export const getTileSetsByRoomType = (roomType: string): TileSet[] => {
  switch (roomType) {
    case 'bathroom':
    case 'god-room':
      return bathroomDesignSets;
    default:
      return [];
  }
};

export const getKitchenModularSetsByRoomType = (roomType: string): KitchenModularSet[] => {
  switch (roomType) {
    case 'kitchen':
      return kitchenModularSets;
    default:
      return [];
  }
};