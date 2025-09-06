/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import Header from '../components/Header';
import RoomTypeSelector from '../components/RoomTypeSelector';
import Footer from '../components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            TileVision AI
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your space with AI-powered tile visualization. Upload your room image and see how different Kajaria tiles will look in your home.
          </p>
        </div>
        <RoomTypeSelector />
      </main>

      <Footer />
    </div>
  );
};

export default Index;