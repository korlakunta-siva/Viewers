import React, { useState, useRef } from 'react';
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  LoadingIndicatorTotalPercent,
} from '@ohif/ui-next';
import { useTranslation } from 'react-i18next';
import { extractEncryptedZipForDownload } from './encryptedZipLoader';

interface ExtractDicomDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

function ExtractDicomDialog({ isOpen, onClose }: ExtractDicomDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'setup' | 'extracting' | 'complete'>('setup');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [passwordValidated, setPasswordValidated] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FileSystemDirectoryHandle | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState({ loaded: 0, total: 0 });
  const [isValidatingPassword, setIsValidatingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      setZipFile(selectedFile);
      // Reset password when new file is selected
      setPassword('');
      setPasswordValidated(false);
      setError('');
    }
  };

  // Validate password by trying to read the ZIP file
  const validatePassword = async () => {
    if (!zipFile || !password.trim()) {
      setError('Please enter a password');
      return;
    }

    setIsValidatingPassword(true);
    setError('');

    try {
      // Try to read the ZIP file with the password to validate it
      const zipJs = await import('@zip.js/zip.js');
      const { ZipReader, BlobReader } = zipJs;

      const zipReader = new ZipReader(new BlobReader(zipFile), {
        password: password,
      });

      // Try to get entries - this will fail if password is wrong
      const entries = await zipReader.getEntries();
      await zipReader.close();

      if (entries.length === 0) {
        setError('ZIP file appears to be empty');
        setPasswordValidated(false);
      } else {
        setPasswordValidated(true);
        setError('');
      }
    } catch (error: any) {
      if (error.message && (error.message.includes('password') || error.message.includes('Wrong password') || error.message.includes('bad password'))) {
        setError('Incorrect password. Please try again.');
        setPasswordValidated(false);
      } else {
        setError(`Error validating password: ${error.message || 'Unknown error'}`);
        setPasswordValidated(false);
      }
    } finally {
      setIsValidatingPassword(false);
    }
  };

  const handleFolderSelect = async () => {
    try {
      // Use File System Access API if available
      if ('showDirectoryPicker' in window) {
        const directoryHandle = await (window as any).showDirectoryPicker({
          mode: 'readwrite',
        });
        setSelectedFolder(directoryHandle);
        setSelectedFolderName(directoryHandle.name);
        setError('');
      } else {
        setError('Folder selection requires Chrome or Edge browser.');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setError('Failed to select folder. Please try again.');
        console.error('Error selecting folder:', error);
      }
    }
  };

  const handleExtract = async () => {
    if (!zipFile || !password || !passwordValidated || !selectedFolder) {
      setError('Please complete all steps: select ZIP file, enter valid password, and select destination folder');
      return;
    }

    setIsExtracting(true);
    setStep('extracting');
    setError('');

    try {
      const progressCallback = (loaded: number, total: number) => {
        setExtractProgress({ loaded, total });
      };

      // Extract all files from ZIP
      const extractedFiles = await extractEncryptedZipForDownload(
        zipFile,
        password,
        progressCallback
      );

      // Save files to selected folder
      if (selectedFolder) {
        // Use File System Access API
        let filesSavedCount = 0;
        for (const [filePath, blob] of Object.entries(extractedFiles)) {
          const pathParts = filePath.split('/').filter(p => p);
          let currentHandle = selectedFolder;

          // Navigate/create directory structure
          for (let i = 0; i < pathParts.length - 1; i++) {
            try {
              currentHandle = await currentHandle.getDirectoryHandle(pathParts[i], {
                create: true,
              });
            } catch (e) {
              console.warn(`Failed to create directory ${pathParts[i]}:`, e);
            }
          }

          // Create file
          const fileName = pathParts[pathParts.length - 1];
          if (fileName) {
            try {
              const fileHandle = await currentHandle.getFileHandle(fileName, { create: true });
              const writable = await fileHandle.createWritable();
              await writable.write(blob);
              await writable.close();
              filesSavedCount++;
            } catch (e) {
              console.warn(`Failed to save file ${fileName}:`, e);
            }
          }
        }

        setStep('complete');
        setExtractProgress({ loaded: filesSavedCount, total: Object.keys(extractedFiles).length });
      } else {
        throw new Error('No destination folder selected');
      }
    } catch (error: any) {
      console.error('Error extracting DICOM files:', error);
      setError(error.message || 'Failed to extract DICOM files');
      setIsExtracting(false);
      setStep('setup');
    }
  };

  const handleClose = () => {
    setStep('setup');
    setZipFile(null);
    setPassword('');
    setPasswordValidated(false);
    setSelectedFolder(null);
    setSelectedFolderName(null);
    setError('');
    setIsExtracting(false);
    setIsValidatingPassword(false);
    setExtractProgress({ loaded: 0, total: 0 });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isExtracting && handleClose()}>
      <DialogContent className={step === 'extracting' ? 'sm:max-w-lg' : 'sm:max-w-md'}>
        <DialogHeader>
          <DialogTitle>Extract DICOM from Encrypted ZIP</DialogTitle>
          <DialogDescription>
            {step === 'setup' && 'Select the encrypted ZIP file, enter password, and choose destination folder'}
            {step === 'extracting' && `Extracting files to ${selectedFolderName || 'destination folder'}...`}
            {step === 'complete' && 'Extraction complete!'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'setup' && (
            <>
              {/* Step 1: File Selection */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Select Encrypted ZIP File:
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="default"
                    onClick={handleFileSelect}
                    className="flex-1"
                  >
                    Choose ZIP File
                  </Button>
                  {zipFile && (
                    <span className="text-sm text-white self-center truncate max-w-[200px]" title={zipFile.name}>
                      {zipFile.name}
                    </span>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>

              {/* Step 2: Password Entry (shown when file is selected) */}
              {zipFile && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Enter Password:
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordValidated(false);
                        setError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && password.trim()) {
                          validatePassword();
                        }
                      }}
                      placeholder="Enter ZIP password"
                      className="flex-1"
                      autoFocus
                      disabled={isValidatingPassword}
                    />
                    <Button
                      type="button"
                      variant="default"
                      onClick={validatePassword}
                      disabled={!password.trim() || isValidatingPassword}
                    >
                      {isValidatingPassword ? 'Validating...' : 'Validate'}
                    </Button>
                  </div>
                  {passwordValidated && (
                    <p className="text-sm text-green-500 mt-1">✓ Password validated</p>
                  )}
                </div>
              )}

              {/* Step 3: Folder Selection (shown when password is validated) */}
              {passwordValidated && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Select Destination Folder:
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="default"
                      onClick={handleFolderSelect}
                      className="flex-1"
                    >
                      Choose Folder
                    </Button>
                    {selectedFolderName && (
                      <span className="text-sm text-white self-center truncate max-w-[200px]" title={selectedFolderName}>
                        {selectedFolderName}
                      </span>
                    )}
                  </div>
                  {!('showDirectoryPicker' in window) && (
                    <p className="text-xs text-yellow-500 mt-2">
                      Folder selection requires Chrome or Edge browser.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Extracting Progress */}
          {step === 'extracting' && (
            <>
              <style dangerouslySetInnerHTML={{__html: `
                .extract-progress-wrapper img[src="/assets/favicon.ico"] {
                  display: none !important;
                }
              `}} />
              <div className="flex flex-col items-center justify-center py-8 min-h-[200px] extract-progress-wrapper">
                <div className="w-full max-w-md relative">
                  <LoadingIndicatorTotalPercent
                    className="w-full relative !top-0 !left-0"
                    totalNumbers={extractProgress.total}
                    percentComplete={
                      extractProgress.total > 0
                        ? Math.round((extractProgress.loaded / extractProgress.total) * 100)
                        : 0
                    }
                    loadingText="Extracting DICOM files..."
                    targetText="files"
                  />
                </div>
                {selectedFolderName && (
                  <p className="text-sm text-gray-400 mt-4 text-center">
                    Saving to: <span className="text-white font-medium">{selectedFolderName}</span>
                  </p>
                )}
              </div>
            </>
          )}

          {/* Complete */}
          {step === 'complete' && (
            <div className="text-center py-8">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                  <svg
                    className="w-8 h-8 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-white text-lg font-medium mb-2">
                Extraction Complete!
              </p>
              <p className="text-gray-400 text-sm mb-1">
                Successfully extracted <span className="text-white font-semibold">{extractProgress.loaded}</span> of{' '}
                <span className="text-white font-semibold">{extractProgress.total}</span> files
              </p>
              {selectedFolderName && (
                <p className="text-gray-400 text-sm">
                  Saved to: <span className="text-white font-medium">{selectedFolderName}</span>
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        <DialogFooter>
          {step === 'setup' && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
              >
                {t('Buttons:Cancel') || 'Cancel'}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleExtract}
                disabled={!zipFile || !passwordValidated || !selectedFolder}
              >
                Extract
              </Button>
            </>
          )}
          {step === 'extracting' && (
            <div className="w-full flex justify-center">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-light"></div>
                <span>Extracting files... Please wait</span>
              </div>
            </div>
          )}
          {step === 'complete' && (
            <Button
              type="button"
              variant="primary"
              onClick={handleClose}
            >
              {t('Buttons:OK') || 'OK'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ExtractDicomDialog;
