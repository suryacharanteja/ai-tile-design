/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center">
      <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
        Room Painter AI
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
        Transform your living space with AI-powered interior design. Upload a photo of your room and watch as our intelligent system identifies objects and suggests beautiful color schemes.
      </p>
    </header>
  );
};

export default Header;