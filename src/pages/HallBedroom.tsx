/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const HallBedroom: React.FC = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <Link to="/">
        <Button variant="outline" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </Link>
      
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4">Hall & Bedroom Visualizer</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Transform your hall and bedroom spaces with our AI-powered tile visualization tool.
        </p>
        <p className="text-muted-foreground">
          Feature coming soon - Upload your room image to see how different hall and bedroom tiles will look.
        </p>
      </div>
    </div>
  );
};

export default HallBedroom;