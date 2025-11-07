import React, { useRef, useEffect, useState } from 'react';
import { ScrollArea } from '@ohif/ui-next';

/**
 * Help Documentation Content
 * This file contains the help documentation content for the Apex Medical Image Viewer
 */

interface Topic {
  id: string;
  title: string;
  parentId?: string;
}

const topics: Topic[] = [
  { id: 'introduction', title: 'Introduction' },
  { id: 'loading-images', title: 'Loading DICOM Images' },
  { id: 'loading-encrypted-zip', title: 'Upload Encrypted ZIP', parentId: 'loading-images' },
  { id: 'loading-folder', title: 'Upload Folder', parentId: 'loading-images' },
  { id: 'loading-files', title: 'Upload Files', parentId: 'loading-images' },
  { id: 'loading-drag-drop', title: 'Drag and Drop', parentId: 'loading-images' },
  { id: 'viewing-images', title: 'Viewing Images' },
  { id: 'viewing-reports', title: 'Viewing Reports' },
  { id: 'extracting-dicom', title: 'Extracting DICOM Files' },
  { id: 'preferences', title: 'Preferences' },
  { id: 'tips', title: 'Tips & Best Practices' },
  { id: 'support', title: 'Need More Help?' },
];

export const HelpContent = () => {
  const [activeTopic, setActiveTopic] = useState<string>(topics[0].id);
  const contentRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (topicId: string) => {
    setActiveTopic(topicId);
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      const element = document.getElementById(topicId);
      if (element) {
        // Find the scrollable container (ScrollArea uses Radix UI which creates a viewport)
        const scrollContainer = element.closest('[data-radix-scroll-area-viewport]') ||
                               document.querySelector('[data-radix-scroll-area-viewport]');

        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();
          const scrollTop = scrollContainer.scrollTop + elementRect.top - containerRect.top - 20; // 20px offset
          scrollContainer.scrollTo({ top: scrollTop, behavior: 'smooth' });
        } else {
          // Fallback: use standard scrollIntoView
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }, 100);
  };

  // Update active topic based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = document.querySelector('[data-radix-scroll-area-viewport]');

      if (!scrollContainer) return;

      const scrollTop = scrollContainer.scrollTop;
      const containerHeight = scrollContainer.clientHeight;
      const viewportTop = scrollTop;
      const viewportBottom = scrollTop + containerHeight;

      // Find which section is currently most visible in the viewport
      let activeSection = topics[0].id;
      let maxVisibility = 0;

      for (const topic of topics) {
        const element = document.getElementById(topic.id);
        if (element) {
          const elementTop = element.offsetTop;
          const elementBottom = elementTop + element.offsetHeight;

          // Calculate how much of the section is visible
          const visibleTop = Math.max(viewportTop, elementTop);
          const visibleBottom = Math.min(viewportBottom, elementBottom);
          const visibleHeight = Math.max(0, visibleBottom - visibleTop);
          const visibility = visibleHeight / element.offsetHeight;

          if (visibility > maxVisibility && visibleHeight > 0) {
            maxVisibility = visibility;
            activeSection = topic.id;
          }
        }
      }

      if (maxVisibility > 0.1) { // Only update if at least 10% visible
        setActiveTopic(activeSection);
      }
    };

    let scrollContainer: Element | null = null;
    let cleanup: (() => void) | null = null;

    // Wait for ScrollArea to render
    const timer = setTimeout(() => {
      scrollContainer = document.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        // Initial check
        handleScroll();
        cleanup = () => {
          if (scrollContainer) {
            scrollContainer.removeEventListener('scroll', handleScroll);
          }
        };
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  return (
    <div className="flex h-full w-full">
      {/* Left Sidebar - Topic List */}
      <div className="flex-shrink-0 w-64 border-r border-secondary-light pr-4">
        <div className="sticky top-0">
          <h3 className="text-lg font-semibold text-white mb-4">Topics</h3>
          <nav className="space-y-1">
            {topics.map((topic) => {
              const isSubTopic = topic.parentId !== undefined;
              return (
                <button
                  key={topic.id}
                  onClick={() => scrollToSection(topic.id)}
                  className={`
                    w-full text-left px-3 py-2 rounded transition-colors
                    ${
                      activeTopic === topic.id
                        ? 'bg-primary-main text-white'
                        : 'text-gray-300 hover:bg-secondary-dark hover:text-white'
                    }
                    ${isSubTopic ? 'ml-6 text-sm' : ''}
                  `}
                >
                  {topic.title}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Right Content - Scrollable */}
      <div className="flex-1 pl-4">
        <ScrollArea className="h-full max-h-[70vh] scrollable-content">
          <div ref={contentRef} className="space-y-6 text-white">
            {/* Introduction */}
            <section id="introduction">
              <h2 className="text-2xl font-semibold mb-3">Welcome to Apex Medical Image Viewer</h2>
              <p className="text-gray-300 leading-relaxed mb-3">
                Apex Medical Image Viewer is a web-based DICOM image viewer that allows you to view medical images
                locally in your browser. Your data remains on your device and is never uploaded to any server.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Apex Medical Image Viewer is built using the{' '}
                <a
                  href="https://ohif.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-light hover:text-primary-active underline"
                >
                  Open Health Imaging Foundation (OHIF) Viewer
                </a>
                , an open-source web-based imaging platform. For more information about OHIF, visit{' '}
                <a
                  href="https://ohif.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-light hover:text-primary-active underline"
                >
                  https://ohif.org
                </a>
                {' '}or the{' '}
                <a
                  href="https://github.com/OHIF/Viewers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-light hover:text-primary-active underline"
                >
                  OHIF GitHub repository
                </a>
                .
              </p>
            </section>

            {/* Uploading Images */}
            <section id="loading-images">
              <h2 className="text-xl font-semibold mb-3">Loading DICOM Images</h2>
              <p className="text-gray-300 mb-4">
                You can load DICOM images into the viewer in several ways:
              </p>

              <div className="space-y-4">
                {/* Encrypted ZIP */}
                <div id="loading-encrypted-zip" className="bg-secondary-dark p-4 rounded-lg scroll-mt-4">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <span className="text-primary-light">1.</span> Upload Encrypted ZIP File
                  </h3>
                  <p className="text-gray-300 mb-3">
                    If your DICOM images are in a password-protected ZIP archive:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-gray-300 ml-4">
                    <li>Click the <strong className="text-white">lock icon</strong> in the app bar or select "Upload Encrypted ZIP" from the settings menu</li>
                    <li>Select your encrypted ZIP file</li>
                    <li>Enter the password when prompted</li>
                    <li>The viewer will extract and load DICOM files automatically</li>
                    <li>Your images will appear in the study list</li>
                  </ol>
                  <p className="text-gray-400 text-sm mt-3">
                    <strong>Note:</strong> The viewer supports both ZipCrypto and AES-256 encrypted ZIP files.
                    For maximum security, use AES-256 encryption when creating your ZIP archives.
                  </p>
                </div>

                {/* DICOM Folder */}
                <div id="loading-folder" className="bg-secondary-dark p-4 rounded-lg scroll-mt-4">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <span className="text-primary-light">2.</span> Upload DICOM Folder
                  </h3>
                  <p className="text-gray-300 mb-3">
                    To load multiple DICOM files from a folder:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-gray-300 ml-4">
                    <li>Click the <strong className="text-white">folder icon</strong> in the app bar or select "Upload Folder" from the settings menu</li>
                    <li>Select the folder containing your DICOM files</li>
                    <li>The viewer will scan the folder and load all DICOM files</li>
                    <li>A progress indicator will show the loading status</li>
                    <li>Your studies will appear in the study list when loading is complete</li>
                  </ol>
                </div>

                {/* Individual Files */}
                <div id="loading-files" className="bg-secondary-dark p-4 rounded-lg scroll-mt-4">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <span className="text-primary-light">3.</span> Upload Individual DICOM Files
                  </h3>
                  <p className="text-gray-300 mb-3">
                    To load specific DICOM files:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-gray-300 ml-4">
                    <li>Click the <strong className="text-white">file icon</strong> in the app bar or select "Upload File" from the settings menu</li>
                    <li>Select one or more DICOM files (hold Ctrl/Cmd to select multiple)</li>
                    <li>The viewer will load the selected files</li>
                    <li>Your studies will appear in the study list</li>
                  </ol>
                </div>

                {/* Drag and Drop */}
                <div id="loading-drag-drop" className="bg-secondary-dark p-4 rounded-lg scroll-mt-4">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <span className="text-primary-light">4.</span> Drag and Drop
                  </h3>
                  <p className="text-gray-300 mb-3">
                    You can also drag and drop files or folders directly onto the viewer:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-gray-300 ml-4">
                    <li>Navigate to the <strong className="text-white">/local</strong> page</li>
                    <li>Drag DICOM files or folders from your file explorer</li>
                    <li>Drop them onto the upload area</li>
                    <li>The viewer will automatically load the files</li>
                  </ol>
                </div>
              </div>
            </section>

            {/* Viewing Images */}
            <section id="viewing-images">
              <h2 className="text-xl font-semibold mb-3">Viewing Images</h2>
              <p className="text-gray-300 mb-4">
                Once your DICOM images are loaded:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-300 ml-4">
                <li>Your studies will appear in the study list</li>
                <li>Click the <strong className="text-white">"View"</strong> button next to a study to open it in the viewer</li>
                <li>Use the viewer tools to adjust window/level, zoom, pan, and more</li>
                <li>For multiframe studies (cine loops), the animation will play automatically by default</li>
                <li>You can control playback using the cine player controls at the bottom of the viewport</li>
              </ol>
            </section>

            {/* Viewing Reports */}
            <section id="viewing-reports">
              <h2 className="text-xl font-semibold mb-3">Viewing Study Reports</h2>
              <p className="text-gray-300 mb-4">
                Some studies may include PDF reports. Here's how to view them:
              </p>

              <div className="bg-secondary-dark p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Accessing Reports</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-300 ml-4">
                  <li>In the study list, look for the <strong className="text-white">"Report"</strong> column</li>
                  <li>Studies with available reports will display a <strong className="text-white">document icon</strong> in this column</li>
                  <li>Click the document icon to view the report</li>
                  <li>The report will appear in the PDF viewer section below the study list</li>
                  <li>The report header shows: <strong className="text-white">"Report for [Patient Name] ([ID]), [Study Date]"</strong></li>
                </ol>

                <h3 className="text-lg font-semibold mb-2 mt-4">Report Viewer Features</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
                  <li>The PDF report is displayed in a dedicated viewer section</li>
                  <li>Use the browser's built-in PDF controls to navigate pages, zoom, and print</li>
                  <li>Click the <strong className="text-white">close button (X)</strong> in the report header to hide the report viewer</li>
                  <li>Click the document icon again to toggle the report viewer on/off</li>
                </ul>

                <h3 className="text-lg font-semibold mb-2 mt-4">Report File Naming</h3>
                <p className="text-gray-300 mb-2">
                  PDF reports should be named using one of these formats:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-300 ml-4">
                  <li><strong className="text-white">{'{studyid}'}.pdf</strong> - Direct study ID (e.g., <code className="text-primary-light">1.2.840.113619.2.297.51033.1756108505.0.494.pdf</code>)</li>
                  <li><strong className="text-white">study-{'{uuid}'}.pdf</strong> - With prefix (e.g., <code className="text-primary-light">study-1.2.840.113619.2.297.51033.1756108505.0.494.pdf</code>)</li>
                </ul>
                <p className="text-gray-400 text-sm mt-3">
                  <strong>Note:</strong> The study ID in the PDF filename must exactly match the Study Instance UID from the DICOM files for the report to be associated with the correct study.
                </p>
              </div>
            </section>

            {/* Extracting DICOM Files */}
            <section id="extracting-dicom">
              <h2 className="text-xl font-semibold mb-3">Extracting DICOM Files for Other Applications</h2>
              <p className="text-gray-300 mb-4">
                If you need to extract DICOM files from an encrypted ZIP archive for use in other applications
                (such as PACS systems, EMR systems, or other DICOM viewers):
              </p>

              <div className="bg-secondary-dark p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Using the Extract Tool</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-300 ml-4">
                  <li>Click the <strong className="text-white">settings gear icon</strong> in the app bar</li>
                  <li>Select <strong className="text-white">"Extract DICOM from Encrypted ZIP"</strong> from the menu</li>
                  <li>In the dialog that appears:
                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                      <li>Click <strong className="text-white">"Choose ZIP File"</strong> and select your encrypted ZIP file</li>
                      <li>Enter the password and click <strong className="text-white">"Validate"</strong> to verify the password</li>
                      <li>Click <strong className="text-white">"Choose Folder"</strong> and select where you want to save the extracted files</li>
                      <li>Click <strong className="text-white">"Extract"</strong> to begin extraction</li>
                    </ul>
                  </li>
                  <li>Wait for the extraction to complete (a progress bar will show the status)</li>
                  <li>Once complete, the extracted DICOM files will be in the folder you selected</li>
                  <li>You can now import these files into your PACS, EMR, or other DICOM-compatible application</li>
                </ol>
                <p className="text-gray-400 text-sm mt-3">
                  <strong>Note:</strong> Folder selection requires Chrome or Edge browser. The extracted files maintain
                  their original directory structure from the ZIP archive.
                </p>
              </div>
            </section>

            {/* Preferences */}
            <section id="preferences">
              <h2 className="text-xl font-semibold mb-3">Preferences</h2>
              <p className="text-gray-300 mb-4">
                Customize your viewing experience:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-300 ml-4">
                <li>Click the <strong className="text-white">settings gear icon</strong> in the app bar</li>
                <li>Select <strong className="text-white">"Preferences"</strong></li>
                <li>Adjust settings such as:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li><strong className="text-white">Auto-play Cine:</strong> Automatically play animations for multiframe instances</li>
                    <li><strong className="text-white">Language:</strong> Change the application language</li>
                    <li><strong className="text-white">Hotkeys:</strong> Customize keyboard shortcuts</li>
                  </ul>
                </li>
                <li>Click <strong className="text-white">"Save"</strong> to apply your preferences</li>
              </ol>
            </section>

            {/* Tips */}
            <section id="tips">
              <h2 className="text-xl font-semibold mb-3">Tips & Best Practices</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
                <li>For best performance, upload DICOM files in batches rather than one at a time</li>
                <li>Use encrypted ZIP files (AES-256) for secure storage and distribution of medical images</li>
                <li>The viewer works entirely in your browser - no data is sent to external servers</li>
                <li>All loaded images are stored in browser memory and will be cleared when you close the browser</li>
                <li>For large studies, be patient during the initial loading process</li>
                <li>You can load multiple studies and switch between them using the study list</li>
                <li>PDF reports are automatically associated with studies when the filename matches the study ID</li>
              </ul>
            </section>

            {/* Support */}
            <section id="support">
              <h2 className="text-xl font-semibold mb-3">Need More Help?</h2>
              <p className="text-gray-300">
                For additional assistance or technical support, please contact your system administrator
                or refer to the application documentation.
              </p>
            </section>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default HelpContent;
