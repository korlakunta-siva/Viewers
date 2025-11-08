import React from 'react';
import type { IconProps } from '../types';

/**
 * Combo icon: Folder + Upload symbol
 */
export const UploadFolder = (props: IconProps) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {/* Folder icon base */}
    <path
      d="M3 5a1 1 0 0 1 1 -1h4l2 2h6a1 1 0 0 1 1v9a1 1 0 0 1 -1 1H4a1 1 0 0 1 -1 -1V5z"
      stroke="currentColor"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Upload arrow overlay */}
    <path
      d="M8 10v4M6 12l2-2 2 2"
      stroke="currentColor"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default UploadFolder;
