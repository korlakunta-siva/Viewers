import React, { useEffect, useRef, useState } from 'react';
import classnames from 'classnames';
import { useNavigate } from 'react-router-dom';
import { DicomMetadataStore, MODULE_TYPES, useSystem } from '@ohif/core';

import Dropzone from 'react-dropzone';
import filesToStudies from './filesToStudies';
import { loadFilesFromEncryptedZip, extractEncryptedZipForDownload } from './encryptedZipLoader';
import EncryptedZipPasswordDialog from './EncryptedZipPasswordDialog';
import { convertDicomToStaticDicomWeb, saveStaticDicomWebFolder } from './dicomToStaticDicomWeb';

import { extensionManager } from '../../App';

import { Button, Icons, LoadingIndicatorTotalPercent } from '@ohif/ui-next';

const getLoadButton = (onDrop, text, isDir) => {
  return (
    <Dropzone
      onDrop={onDrop}
      noDrag
    >
      {({ getRootProps, getInputProps }) => (
        <div {...getRootProps()}>
          <Button
            variant="default"
            className="w-28"
            disabled={false}
            onClick={() => {}}
          >
            {text}
            {isDir ? (
              <input
                {...getInputProps()}
                webkitdirectory="true"
                mozdirectory="true"
                style={{ display: 'none' }}
              />
            ) : (
              <input
                {...getInputProps()}
                style={{ display: 'none' }}
              />
            )}
          </Button>
        </div>
      )}
    </Dropzone>
  );
};

const getEncryptedZipButton = (onClick) => {
  return (
    <Button
      variant="default"
      className="w-40"
      onClick={onClick}
    >
      Load Encrypted ZIP
    </Button>
  );
};

type LocalProps = {
  modePath: string;
};

function Local({ modePath }: LocalProps) {
  const { servicesManager } = useSystem();
  const { customizationService } = servicesManager.services;
  const navigate = useNavigate();
  const dropzoneRef = useRef();
  const [dropInitiated, setDropInitiated] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pendingZipFile, setPendingZipFile] = useState<File | null>(null);
  const [zipPassword, setZipPassword] = useState<string | null>(null);
  const [isExtractingForDownload, setIsExtractingForDownload] = useState(false);
  const [isConvertingToStaticDicomWeb, setIsConvertingToStaticDicomWeb] = useState(false);
  const [outputDirectoryHandle, setOutputDirectoryHandle] = useState<any>(null);

  const LoadingIndicatorProgress = customizationService.getCustomization(
    'ui.loadingIndicatorProgress'
  );

  // Initializing the dicom local dataSource
  const dataSourceModules = extensionManager.modules[MODULE_TYPES.DATA_SOURCE];
  const localDataSources = dataSourceModules.reduce((acc, curr) => {
    const mods = [];
    curr.module.forEach(mod => {
      if (mod.type === 'localApi') {
        mods.push(mod);
      }
    });
    return acc.concat(mods);
  }, []);

  const firstLocalDataSource = localDataSources[0];
  const dataSource = firstLocalDataSource.createDataSource({});

  const microscopyExtensionLoaded = extensionManager.registeredExtensionIds.includes(
    '@ohif/extension-dicom-microscopy'
  );

  // Check if file is a ZIP file
  const isZipFile = (file: File): boolean => {
    return (
      file.name.toLowerCase().endsWith('.zip') ||
      file.type === 'application/zip' ||
      file.type === 'application/x-zip-compressed'
    );
  };

  // Handle encrypted ZIP file
  const handleEncryptedZip = async (zipFile: File, password: string) => {
    try {
      setDropInitiated(true);
      setLoadingProgress({ loaded: 0, total: 0 });

      const progressCallback = (loaded, total) => {
        setLoadingProgress({ loaded, total });
      };

      // Extract files from encrypted ZIP in memory
      const files = await loadFilesFromEncryptedZip(zipFile, password, progressCallback);

      if (files.length === 0) {
        throw new Error('No DICOM files found in the ZIP archive');
      }

      // Process extracted files
      const studies = await filesToStudies(files, dataSource, progressCallback);

      // Navigate to viewer
      navigateToViewer(studies);
    } catch (error) {
      console.error('Error loading encrypted ZIP:', error);
      alert(`Error: ${error.message || 'Failed to load encrypted ZIP file'}`);
      setDropInitiated(false);
      setLoadingProgress({ loaded: 0, total: 0 });
    }
  };

  // Navigate to viewer after loading studies
  const navigateToViewer = (studies: string[]) => {
    const query = new URLSearchParams();

    if (microscopyExtensionLoaded) {
      const smStudies = studies.filter(id => {
        const study = DicomMetadataStore.getStudy(id);
        return (
          study.series.findIndex(s => s.Modality === 'SM' || s.instances[0].Modality === 'SM') >= 0
        );
      });

      if (smStudies.length > 0) {
        smStudies.forEach(id => query.append('StudyInstanceUIDs', id));
        modePath = 'microscopy';
      }
    }

    studies.forEach(id => query.append('StudyInstanceUIDs', id));
    query.append('datasources', 'dicomlocal');

    if (modePath) {
      navigate(`/${modePath}?${decodeURIComponent(query.toString())}`);
    } else {
      navigate(`/?${decodeURIComponent(query.toString())}`);
    }
  };

  // Handle conversion to static-dicomweb format
  const handleConvertToStaticDicomWeb = async () => {
    // First, let user select input folder with DICOM files
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.mozdirectory = true;
    input.style.display = 'none';

    input.onchange = async (e: any) => {
      const files = Array.from(e.target.files || []) as File[];

      // Filter for DICOM files
      const dicomFiles = files.filter(f =>
        f.type === 'application/dicom' || f.name.toLowerCase().endsWith('.dcm')
      );

      if (dicomFiles.length === 0) {
        alert('No DICOM files found in the selected folder.');
        return;
      }

      try {
        setIsConvertingToStaticDicomWeb(true);
        setLoadingProgress({ loaded: 0, total: dicomFiles.length });

        const progressCallback = (loaded, total) => {
          setLoadingProgress({ loaded, total });
        };

        // Convert DICOM files to static-dicomweb format
        console.log('Starting conversion of', dicomFiles.length, 'DICOM files');
        const outputFiles = await convertDicomToStaticDicomWeb(dicomFiles, progressCallback);

        console.log('Conversion result:', {
          totalFiles: dicomFiles.length,
          outputFilesCount: Object.keys(outputFiles).length,
          outputFiles: Object.keys(outputFiles)
        });

        if (Object.keys(outputFiles).length === 0) {
          const errorMsg = `No files were converted. Found ${dicomFiles.length} DICOM file(s) in the folder. Please check the browser console for details.`;
          console.error(errorMsg);
          alert(errorMsg);
          setIsConvertingToStaticDicomWeb(false);
          return;
        }

        // Save the static-dicomweb folder
        // Pass the output directory handle if we have one, otherwise will use ZIP fallback
        const result = await saveStaticDicomWebFolder(outputFiles, 'dicomweb', outputDirectoryHandle);

        if (result.success) {
          if (result.method === 'folder') {
            alert('Static DICOMweb folder created successfully!');
            // Store the directory handle for future use
            if (result.directoryHandle) {
              setOutputDirectoryHandle(result.directoryHandle);
            }
          } else {
            alert('Static DICOMweb files packaged as ZIP. The ZIP file has been downloaded.');
          }
        } else if (result.cancelled) {
          // User cancelled, no message needed
        } else {
          alert(`Error: ${result.error || 'Failed to save static-dicomweb files'}`);
        }
      } catch (error) {
        console.error('Error converting to static-dicomweb:', error);
        alert(`Error: ${error.message || 'Failed to convert DICOM files to static-dicomweb format'}`);
      } finally {
        setIsConvertingToStaticDicomWeb(false);
        setLoadingProgress({ loaded: 0, total: 0 });
      }
    };

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  };

  // Handle download of unencrypted DICOM files
  const handleDownloadDicom = async () => {
    if (!pendingZipFile || !zipPassword) {
      return;
    }

    try {
      setIsExtractingForDownload(true);
      setLoadingProgress({ loaded: 0, total: 0 });

      const progressCallback = (loaded, total) => {
        setLoadingProgress({ loaded, total });
      };

      // Extract all files from ZIP
      const extractedFiles = await extractEncryptedZipForDownload(
        pendingZipFile,
        zipPassword,
        progressCallback
      );

      // Use File System Access API if available (Chrome/Edge)
      if ('showDirectoryPicker' in window) {
        try {
          const directoryHandle = await (window as any).showDirectoryPicker({
            mode: 'readwrite',
          });

          // Create directory structure and save files
          for (const [filePath, blob] of Object.entries(extractedFiles)) {
            const pathParts = filePath.split('/').filter(p => p);
            let currentHandle = directoryHandle;

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
            const fileHandle = await currentHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
          }

          alert('DICOM files extracted successfully!');
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            throw error;
          }
          // User cancelled
        }
      } else {
        // Fallback: Use File System Access API or download individual files
        // For browsers without directory picker support, we'll create a ZIP
        try {
          const zipJs = await import('@zip.js/zip.js');
          const { ZipWriter, BlobWriter, BlobReader } = zipJs;

          const zipWriter = new ZipWriter(new BlobWriter());

          // Add all files to the new ZIP
          for (const [filePath, blob] of Object.entries(extractedFiles)) {
            await zipWriter.add(filePath, new BlobReader(blob));
          }

          // Generate the ZIP blob
          const zipBlob = await zipWriter.close();

          // Download the ZIP
          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'dicom_extracted.zip';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          alert('DICOM files packaged as ZIP. Please extract the ZIP file to access DICOM files.');
        } catch (error) {
          console.error('Error creating download ZIP:', error);
          alert('Error creating download package. Please try using a modern browser (Chrome/Edge) for folder selection.');
        }
      }
    } catch (error) {
      console.error('Error downloading DICOM files:', error);
      alert(`Error: ${error.message || 'Failed to extract DICOM files'}`);
    } finally {
      setIsExtractingForDownload(false);
      setLoadingProgress({ loaded: 0, total: 0 });
    }
  };

  // Handle encrypted ZIP button click
  const handleEncryptedZipClick = () => {
    // Create a hidden file input for ZIP files only
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,application/zip,application/x-zip-compressed';
    input.onchange = (e: any) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        setPendingZipFile(files[0]);
        setShowPasswordDialog(true);
      }
    };
    input.click();
  };

  const onDrop = async acceptedFiles => {
    // Handle regular files (not ZIP)
    // ZIP files should be loaded via the "Load Encrypted ZIP" button
    const regularFiles = acceptedFiles.filter(f => !isZipFile(f));

    if (regularFiles.length === 0) {
      // If only ZIP files were dropped, prompt user to use the button instead
      const zipFiles = acceptedFiles.filter(isZipFile);
      if (zipFiles.length > 0) {
        alert('Please use the "Load Encrypted ZIP" button to load password-protected ZIP files.');
        return;
      }
      return;
    }

    // Handle regular files
    setDropInitiated(true);
    setLoadingProgress({ loaded: 0, total: regularFiles.length });

    const progressCallback = (loaded, total) => {
      setLoadingProgress({ loaded, total });
    };

    const studies = await filesToStudies(regularFiles, dataSource, progressCallback);
    navigateToViewer(studies);
  };

  const handlePasswordSubmit = async (password: string) => {
    setZipPassword(password);
    setShowPasswordDialog(false);

    if (pendingZipFile) {
      await handleEncryptedZip(pendingZipFile, password);
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordDialog(false);
    setPendingZipFile(null);
    setZipPassword(null);
  };

  // Set body style
  useEffect(() => {
    document.body.classList.add('bg-black');
    return () => {
      document.body.classList.remove('bg-black');
    };
  }, []);

  return (
    <>
      <Dropzone
        ref={dropzoneRef}
        onDrop={onDrop}
        noClick
      >
        {({ getRootProps }) => (
          <div
            {...getRootProps()}
            style={{ width: '100%', height: '100%' }}
          >
            <div className="flex h-screen w-screen items-center justify-center">
              <div className="bg-muted border-primary/60 mx-auto space-y-2 rounded-xl border border-dashed py-12 px-12 drop-shadow-md">
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-3">
                    <img
                      src="/assets/favicon.ico"
                      alt="Apex Viewer"
                      style={{ width: '72px', height: '72px' }}
                    />
                    <span className="text-white text-2xl font-medium">Apex Viewer</span>
                  </div>
                </div>
                <div className="space-y-2 py-6 text-center">
                  {dropInitiated ? (
                    <div className="flex flex-col items-center justify-center pt-12">
                      {loadingProgress.total > 0 ? (
                        <LoadingIndicatorTotalPercent
                          className={'h-full w-full bg-black'}
                          totalNumbers={loadingProgress.total}
                          percentComplete={
                            loadingProgress.total > 0
                              ? Math.round((loadingProgress.loaded / loadingProgress.total) * 100)
                              : 0
                          }
                          loadingText="Loading DICOM files..."
                          targetText="files"
                        />
                      ) : (
                        <LoadingIndicatorProgress className={'h-full w-full bg-black'} />
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-primary pt-0 text-xl">
                        Drag and drop your DICOM files & folders here <br />
                        to load them locally.
                      </p>
                      <p className="text-muted-foreground text-base">
                        Note: Your data remains locally within your browser
                        <br /> and is never uploaded to any server.
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center gap-2 pt-4">
                  <div className="flex justify-center gap-2">
                    {getLoadButton(onDrop, 'Load files', false)}
                    {getLoadButton(onDrop, 'Load folders', true)}
                  </div>
                  <div className="flex justify-center pt-2">
                    {getEncryptedZipButton(handleEncryptedZipClick)}
                  </div>
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="default"
                      className="w-64"
                      onClick={handleConvertToStaticDicomWeb}
                      disabled={isConvertingToStaticDicomWeb}
                    >
                      {isConvertingToStaticDicomWeb ? 'Converting...' : 'Convert Folder to Static DICOMweb'}
                    </Button>
                  </div>
                  {zipPassword && pendingZipFile && (
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="default"
                        onClick={handleDownloadDicom}
                        disabled={isExtractingForDownload}
                      >
                        {isExtractingForDownload ? 'Extracting...' : 'Download Unencrypted DICOM Files'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Dropzone>
      <EncryptedZipPasswordDialog
        isOpen={showPasswordDialog}
        onPasswordEntered={handlePasswordSubmit}
        onCancel={handlePasswordCancel}
        title="Encrypted ZIP File Detected"
        message="This ZIP file is password-protected. Enter the password to access DICOM files:"
      />
    </>
  );
}

export default Local;
