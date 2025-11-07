import FileLoaderService from './fileLoaderService';
import { DicomMetadataStore } from '@ohif/core';
import { storePdfForStudy, extractStudyUidFromPdfFilename } from '../../apexcode/utils/pdfStorage';

const processFile = async (file, onProgress) => {
  try {
    // Check if file is a PDF and extract study UUID from filename
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const studyUid = extractStudyUidFromPdfFilename(file.name);
      if (studyUid) {
        // Store PDF for the study
        storePdfForStudy(studyUid, file);
        console.log(`Stored PDF for study: ${studyUid} (from filename: ${file.name})`);
        // Call progress callback and return (don't process PDF as DICOM)
        if (onProgress) {
          onProgress();
        }
        return;
      } else {
        console.warn(`PDF file found but could not extract study UID from filename: ${file.name}`);
        // Still call progress callback even if we can't extract study UID
        if (onProgress) {
          onProgress();
        }
        return;
      }
    }

    // Process as DICOM file
    const fileLoaderService = new FileLoaderService(file);
    const imageId = fileLoaderService.addFile(file);
    const image = await fileLoaderService.loadFile(file, imageId);
    const dicomJSONDataset = await fileLoaderService.getDataset(image, imageId);

    DicomMetadataStore.addInstance(dicomJSONDataset);

    // Call progress callback if provided
    if (onProgress) {
      onProgress();
    }
  } catch (error) {
    console.log(error.name, ':Error when trying to load and process local files:', error.message);
    // Still call progress callback even on error to maintain count
    if (onProgress) {
      onProgress();
    }
  }
};

export default async function filesToStudies(files, dataSource = null, onProgress = null) {
  const totalFiles = files.length;
  let processedCount = 0;

  // Create progress callback if onProgress is provided
  const progressCallback = onProgress
    ? () => {
        processedCount++;
        onProgress(processedCount, totalFiles);
      }
    : null;

  // Process files sequentially to show progress, or in parallel if no progress callback
  if (progressCallback) {
    // Process sequentially to show accurate progress
    for (const file of files) {
      await processFile(file, progressCallback);
    }
  } else {
    // Process in parallel if no progress tracking needed
    const processFilesPromises = files.map(file => processFile(file, null));
    await Promise.all(processFilesPromises);
  }

  return DicomMetadataStore.getStudyInstanceUIDs();
}
