/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface Product {
  id: string | number;
  name: string;
  imageUrl: string;
  file?: File;
}

export interface FloorTexture {
  name: string;
  prompt: string;
}

export interface FloorCategory {
  category: string;
  textures: FloorTexture[];
}

export const floorTextures: FloorCategory[] = [
  {
    category: "Wood Flooring",
    textures: [
      { name: "Light Oak Planks", prompt: "light oak hardwood planks with natural wood grain" },
      { name: "Dark Walnut", prompt: "dark walnut hardwood flooring with rich brown tones" },
      { name: "Rustic Pine", prompt: "rustic pine wood flooring with visible knots and texture" },
      { name: "Bamboo", prompt: "natural bamboo flooring with vertical grain pattern" },
      { name: "Reclaimed Wood", prompt: "reclaimed barn wood flooring with weathered patina" },
      { name: "Cherry Wood", prompt: "cherry wood flooring with warm reddish-brown color" }
    ]
  },
  {
    category: "Stone & Tile",
    textures: [
      { name: "Marble Tiles", prompt: "white marble tiles with grey veining" },
      { name: "Slate Stone", prompt: "dark slate stone flooring with natural texture" },
      { name: "Travertine", prompt: "beige travertine stone tiles with natural holes" },
      { name: "Ceramic Subway", prompt: "white ceramic subway tiles in herringbone pattern" },
      { name: "Granite", prompt: "polished granite flooring with speckled pattern" },
      { name: "Limestone", prompt: "cream limestone tiles with subtle texture" }
    ]
  },
  {
    category: "Modern Materials",
    textures: [
      { name: "Polished Concrete", prompt: "smooth polished concrete flooring in grey" },
      { name: "Luxury Vinyl Plank", prompt: "luxury vinyl plank flooring mimicking oak wood" },
      { name: "Epoxy Resin", prompt: "seamless epoxy resin flooring in light grey" },
      { name: "Industrial Steel", prompt: "brushed steel plate flooring with diamond pattern" },
      { name: "Terrazzo", prompt: "terrazzo flooring with colorful aggregate chips" },
      { name: "Cork", prompt: "natural cork flooring with warm honey color" }
    ]
  },
  {
    category: "Carpet & Soft",
    textures: [
      { name: "Plush Carpet", prompt: "plush wall-to-wall carpet in neutral beige" },
      { name: "Area Rug", prompt: "large Persian-style area rug with intricate patterns" },
      { name: "Sisal Natural", prompt: "natural sisal fiber carpet in light brown" },
      { name: "Shag Carpet", prompt: "thick shag carpet in cream color" },
      { name: "Berber Carpet", prompt: "berber loop carpet in multi-tone grey" },
      { name: "Jute Rug", prompt: "woven jute area rug with natural texture" }
    ]
  }
];

export const standardPalettes = [
  {
    name: "Neutrals",
    colors: ["#FFFFFF", "#F5F5F5", "#E5E5E5", "#D4D4D8", "#A1A1AA", "#71717A", "#52525B", "#27272A"]
  },
  {
    name: "Earth Tones", 
    colors: ["#FEF7ED", "#FDBA74", "#FB923C", "#EA580C", "#9A3412", "#7C2D12", "#451A03", "#292524"]
  },
  {
    name: "Blues",
    colors: ["#EFF6FF", "#DBEAFE", "#93C5FD", "#60A5FA", "#3B82F6", "#2563EB", "#1D4ED8", "#1E3A8A"]
  },
  {
    name: "Greens", 
    colors: ["#F0FDF4", "#DCFCE7", "#86EFAC", "#4ADE80", "#22C55E", "#16A34A", "#15803D", "#14532D"]
  }
];