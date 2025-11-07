import React from 'react';
import { HelpModal } from '@ohif/ui-next';
import HelpContent from '../help-docs/helpContent';

function HelpModalDefault() {
  return (
    <HelpModal className="w-full max-w-6xl">
      <HelpModal.Title>User Manual</HelpModal.Title>
      <HelpModal.Body className="items-stretch">
        <HelpContent />
      </HelpModal.Body>
    </HelpModal>
  );
}

export default {
  'ohif.helpModal': HelpModalDefault,
};
