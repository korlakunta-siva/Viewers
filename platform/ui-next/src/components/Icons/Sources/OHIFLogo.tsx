import React from 'react';
import type { IconProps } from '../types';

export const OHIFLogo = (props: IconProps) => {
  // Use absolute path from root - this ensures it works regardless of current route
  const faviconPath = '/assets/favicon.ico';

  return (
    <div
      className="flex items-center gap-2"
      style={{ height: props.height || '28px', ...props.style }}
    >
      <img
        src={faviconPath}
        alt="Apex Viewer"
        style={{ width: '28px', height: '28px', display: 'block' }}
      />
      <span
        className="text-white font-medium"
        style={{ fontSize: '16px', lineHeight: '28px', whiteSpace: 'nowrap' }}
      >
        Apex Viewer
      </span>
    </div>
  );
};

export default OHIFLogo;
