/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center mb-8">
      <div className="flex items-center justify-center gap-4 mb-4">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground">
          TileVision AI
        </h1>
        <span className="text-2xl md:text-3xl font-semibold text-primary opacity-80">
          by Kajaria
        </span>
      </div>
      <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
        Premium AI visualization tool for Kajaria showrooms. Show customers exactly how our tiles will transform their spaces.
      </p>
    </header>
  );
};

export default Header;