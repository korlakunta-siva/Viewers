import React from 'react';
import { HelpModal, ScrollArea } from '@ohif/ui-next';
import HelpContent from '../help-docs/helpContent';

function HelpModalDefault() {
  return (
    <HelpModal className="w-full max-w-4xl">
      <HelpModal.Title>User Manual</HelpModal.Title>
      <HelpModal.Body>
        <ScrollArea className="max-h-[70vh] pr-4">
          <HelpContent />
        </ScrollArea>
      </HelpModal.Body>
    </HelpModal>
  );
}

export default {
  'ohif.helpModal': HelpModalDefault,
};
