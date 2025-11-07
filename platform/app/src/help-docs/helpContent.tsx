import React from 'react';

/**
 * Help Documentation Content
 * This file contains the help documentation content for the Apex Medical Image Viewer
 */

export const HelpContent = () => {
  return (
    <div className="space-y-6 text-white">
      {/* Introduction */}
      <section>
        <h2 className="text-2xl font-semibold mb-3">Welcome to Apex Medical Image Viewer</h2>
        <p className="text-gray-300 leading-relaxed">
          Apex Medical Image Viewer is a web-based DICOM image viewer that allows you to view medical images
          locally in your browser. Your data remains on your device and is never uploaded to any server.
        </p>
      </section>

      {/* Uploading Images */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Loading DICOM Images</h2>
        <p className="text-gray-300 mb-4">
          You can load DICOM images into the viewer in several ways:
        </p>

        <div className="space-y-4">
          {/* Encrypted ZIP */}
          <div className="bg-secondary-dark p-4 rounded-lg">
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
          <div className="bg-secondary-dark p-4 rounded-lg">
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
          <div className="bg-secondary-dark p-4 rounded-lg">
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
          <div className="bg-secondary-dark p-4 rounded-lg">
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

      {/* Extracting DICOM Files */}
      <section>
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

      {/* Viewing Images */}
      <section>
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

      {/* Preferences */}
      <section>
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
      <section>
        <h2 className="text-xl font-semibold mb-3">Tips & Best Practices</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
          <li>For best performance, upload DICOM files in batches rather than one at a time</li>
          <li>Use encrypted ZIP files (AES-256) for secure storage and distribution of medical images</li>
          <li>The viewer works entirely in your browser - no data is sent to external servers</li>
          <li>All loaded images are stored in browser memory and will be cleared when you close the browser</li>
          <li>For large studies, be patient during the initial loading process</li>
          <li>You can load multiple studies and switch between them using the study list</li>
        </ul>
      </section>

      {/* Support */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Need More Help?</h2>
        <p className="text-gray-300">
          For additional assistance or technical support, please contact your system administrator
          or refer to the application documentation.
        </p>
      </section>
    </div>
  );
};

export default HelpContent;
