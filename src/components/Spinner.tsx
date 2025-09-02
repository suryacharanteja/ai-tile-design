/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface SpinnerProps {
  message?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse font-medium">
          {message}
        </p>
      )}
    </div>
  );
};

export default Spinner;