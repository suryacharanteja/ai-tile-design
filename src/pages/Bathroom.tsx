/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowLeft, Bath } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ImageUploader from '../components/ImageUploader';

const Bathroom: React.FC = () => {
  const navigate = useNavigate();

  const handleBackHome = () => {
    navigate('/');
  };

  const handleFileSelect = (file: File) => {
    // TODO: Implement the same logic as Index.tsx but for bathroom
    console.log('File selected for bathroom:', file);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex items-center gap-4">
        <Button 
          onClick={handleBackHome}
          variant="ghost" 
          size="sm"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>
        <div className="flex items-center gap-2">
          <Bath className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-semibold">Bathroom Visualizer</h1>
        </div>
      </div>
      
      <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: '70vh' }}>
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-800 mb-4">
          Bathroom
        </h2>
        <p className="mt-4 text-lg text-zinc-600 max-w-3xl mx-auto mb-8">
          Water-resistant floor & wall sets. Upload your bathroom image to see how our durable tiles will enhance your space.
        </p>
        <p>This page will contain the full bathroom visualizer functionality.</p>
      </div>
      <Footer />
    </div>
  );
};

export default Bathroom;