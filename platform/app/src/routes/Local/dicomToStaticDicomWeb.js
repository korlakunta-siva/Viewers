import dcmjs from 'dcmjs';
import dicomImageLoader from '@cornerstonejs/dicom-image-loader';

/**
 * Converts DICOM files to static-dicomweb format
 * Creates the folder structure: studies/<StudyInstanceUID>/series/<SeriesInstanceUID>/instances/<SOPInstanceUID>/
 *
 * @param {File[]} files - Array of DICOM files
 * @param {Function} onProgress - Progress callback (processed, total)
 * @returns {Promise<Object>} - Object mapping file paths to Blobs
 */
export async function convertDicomToStaticDicomWeb(files, onProgress = null) {
  const outputFiles = {};
  const processedFiles = new Set();
  let processedCount = 0;

  // Process files sequentially to show progress
  for (const file of files) {
    try {
      // More lenient DICOM file detection
      const fileName = file.name.toLowerCase();
      const isDicomFile =
        file.type === 'application/dicom' ||
        fileName.endsWith('.dcm') ||
        fileName.endsWith('.dicom') ||
        fileName.endsWith('.dc3') ||
        (!fileName.includes('.') && file.size > 0); // Files without extension might be DICOM

      if (!isDicomFile) {
        if (onProgress) {
          processedCount++;
          onProgress(processedCount, files.length);
        }
        continue;
      }

      console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);

      // Load DICOM file
      const imageId = dicomImageLoader.wadouri.fileManager.add(file);
      const image = await dicomImageLoader.wadouri.loadFileRequest(imageId);

      if (!image || image.byteLength === 0) {
        console.warn('Empty or invalid image data for file:', file.name);
        if (onProgress) {
          processedCount++;
          onProgress(processedCount, files.length);
        }
        continue;
      }

      // Parse DICOM
      let dicomData;
      try {
        dicomData = dcmjs.data.DicomMessage.readFile(image);
      } catch (parseError) {
        console.warn('Failed to parse DICOM file:', file.name, parseError);
        if (onProgress) {
          processedCount++;
          onProgress(processedCount, files.length);
        }
        continue;
      }

      if (!dicomData || !dicomData.dict) {
        console.warn('Invalid DICOM data structure for file:', file.name);
        if (onProgress) {
          processedCount++;
          onProgress(processedCount, files.length);
        }
        continue;
      }

      const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomData.dict);
      const meta = dcmjs.data.DicomMetaDictionary.namifyDataset(dicomData.meta);

      // Get required UIDs from naturalized dataset
      const StudyInstanceUID = dataset.StudyInstanceUID;
      const SeriesInstanceUID = dataset.SeriesInstanceUID;
      const SOPInstanceUID = dataset.SOPInstanceUID;

      console.log('File:', file.name, 'StudyUID:', StudyInstanceUID, 'SeriesUID:', SeriesInstanceUID, 'SOPUID:', SOPInstanceUID);
      console.log('Raw dict keys sample:', Object.keys(dicomData.dict).slice(0, 10));
      console.log('Raw meta keys sample:', Object.keys(dicomData.meta || {}).slice(0, 10));

      if (!StudyInstanceUID || !SeriesInstanceUID || !SOPInstanceUID) {
        console.warn('Missing required UIDs in file:', file.name, {
          StudyInstanceUID,
          SeriesInstanceUID,
          SOPInstanceUID
        });
        if (onProgress) {
          processedCount++;
          onProgress(processedCount, files.length);
        }
        continue;
      }

      // Skip if already processed (same SOPInstanceUID)
      if (processedFiles.has(SOPInstanceUID)) {
        if (onProgress) {
          processedCount++;
          onProgress(processedCount, files.length);
        }
        continue;
      }
      processedFiles.add(SOPInstanceUID);

      // Convert to DICOM JSON format
      // Use raw dict which already has tags as keys
      const dicomJson = convertDatasetToDicomJson(dataset, meta, dicomData.dict, dicomData.meta);

      // Compress metadata JSON using browser CompressionStream API
      const metadataJson = JSON.stringify(dicomJson);
      const metadataCompressed = await compressGzip(metadataJson);
      const metadataBlob = new Blob([metadataCompressed], { type: 'application/gzip' });

      // Create metadata file path
      const metadataPath = `studies/${StudyInstanceUID}/series/${SeriesInstanceUID}/instances/${SOPInstanceUID}/metadata.gz`;
      outputFiles[metadataPath] = metadataBlob;

      // Extract pixel data if present
      // Try to get pixel data from raw dict first (more reliable)
      const pixelDataTag = '7FE00010'; // Pixel Data tag
      const pixelDataElement = dicomData.dict[pixelDataTag] || dicomData.dict['(7FE0,0010)'];

      let pixelData = null;
      if (pixelDataElement && pixelDataElement.Value) {
        pixelData = pixelDataElement.Value;
        console.log('Found pixel data in raw dict, type:', Array.isArray(pixelData) ? 'array' : typeof pixelData, 'length:', Array.isArray(pixelData) ? pixelData.length : 'N/A');
      } else {
        // Fallback to naturalized dataset
        pixelData = dataset.PixelData;
        console.log('Using pixel data from dataset, type:', Array.isArray(pixelData) ? 'array' : typeof pixelData);
      }

      if (pixelData) {
        // Pixel data can be:
        // 1. Single ArrayBuffer (single frame)
        // 2. Array of ArrayBuffers (multiframe)
        // 3. Uint8Array

        let frames = [];
        if (Array.isArray(pixelData)) {
          // Multiframe or array of frames
          frames = pixelData.filter(frame => frame !== null && frame !== undefined);
          console.log(`Found ${frames.length} frames in pixel data array`);
        } else if (pixelData instanceof ArrayBuffer) {
          // Single frame as ArrayBuffer
          frames = [pixelData];
          console.log('Single frame as ArrayBuffer, size:', pixelData.byteLength);
        } else if (pixelData instanceof Uint8Array) {
          // Single frame as Uint8Array
          frames = [pixelData.buffer];
          console.log('Single frame as Uint8Array, size:', pixelData.byteLength);
        } else {
          console.warn('Unexpected pixel data format for file:', file.name, 'Type:', typeof pixelData, 'Constructor:', pixelData?.constructor?.name);
        }

        // Store each frame separately
        frames.forEach((frameData, frameIndex) => {
          if (!frameData) {
            console.warn(`Empty frame data at index ${frameIndex} for file:`, file.name);
            return;
          }

          // Ensure we have a proper ArrayBuffer
          let frameBuffer;
          if (frameData instanceof ArrayBuffer) {
            frameBuffer = frameData;
          } else if (frameData instanceof Uint8Array) {
            frameBuffer = frameData.buffer;
          } else if (Array.isArray(frameData) && frameData.length > 0 && frameData[0] instanceof ArrayBuffer) {
            // Handle case where frame is wrapped in an array
            frameBuffer = frameData[0];
          } else {
            console.warn(`Invalid frame data type at index ${frameIndex} for file:`, file.name,
              'Type:', typeof frameData,
              'Is ArrayBuffer:', frameData instanceof ArrayBuffer,
              'Is Uint8Array:', frameData instanceof Uint8Array,
              'Value:', frameData);
            return;
          }

          if (!frameBuffer || frameBuffer.byteLength === 0) {
            console.warn(`Empty frame buffer at index ${frameIndex} for file:`, file.name);
            return;
          }

          const frameNumber = frameIndex + 1; // Frames are 1-indexed
          const frameBlob = new Blob([frameBuffer], { type: 'application/octet-stream' });
          const framePath = `studies/${StudyInstanceUID}/series/${SeriesInstanceUID}/instances/${SOPInstanceUID}/frames/${frameNumber}`;
          outputFiles[framePath] = frameBlob;

          console.log(`Stored frame ${frameNumber}, size: ${frameBuffer.byteLength} bytes`);
        });
      } else {
        console.log('No pixel data found for file:', file.name);
      }

      // Update progress
      if (onProgress) {
        processedCount++;
        onProgress(processedCount, files.length);
      }

      console.log('Successfully converted file:', file.name);
    } catch (error) {
      console.error('Error converting file:', file.name, error);
      console.error('Error stack:', error.stack);
      if (onProgress) {
        processedCount++;
        onProgress(processedCount, files.length);
      }
    }
  }

  console.log('Conversion complete. Total files processed:', processedCount, 'Output files created:', Object.keys(outputFiles).length);

  // Create index files for studies and series
  const studyMap = new Map();
  const seriesMap = new Map();

  // Group by study and series
  processedFiles.forEach(sopUID => {
    // We need to reconstruct this from the files we processed
    // For now, we'll create a simple index structure
  });

  // Create studies index
  const studies = Array.from(new Set(
    Object.keys(outputFiles)
      .filter(path => path.startsWith('studies/'))
      .map(path => path.split('/')[1])
  ));

  if (studies.length > 0) {
    const studiesIndex = studies.map(studyUID => {
      // Create a basic study query entry
      // In a real implementation, we'd need to aggregate metadata from all instances
      return {
        '0020000D': {
          'vr': 'UI',
          'Value': [studyUID]
        }
      };
    });

    const studiesIndexJson = JSON.stringify(studiesIndex);
    const studiesIndexCompressed = await compressGzip(studiesIndexJson);
    outputFiles['studies/index.json.gz'] = new Blob([studiesIndexCompressed], { type: 'application/gzip' });
  }

  return outputFiles;
}

/**
 * Compress string to gzip using browser CompressionStream API
 * Falls back to uncompressed if CompressionStream is not available
 */
async function compressGzip(data) {
  if (typeof CompressionStream !== 'undefined') {
    try {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      writer.write(new TextEncoder().encode(data));
      writer.close();

      const chunks = [];
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          chunks.push(value);
        }
      }

      // Combine chunks into single Uint8Array
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result;
    } catch (error) {
      console.warn('CompressionStream failed, using uncompressed:', error);
      // Fall through to uncompressed
    }
  }

  // Fallback: return uncompressed (browser will handle it)
  // Or we could add pako as a dependency
  return new TextEncoder().encode(data);
}

/**
 * Converts dcmjs dataset to DICOM JSON format
 * DICOM JSON format uses tag numbers as keys with {vr, Value} structure
 * Works directly with raw dict which already has tags as keys
 */
function convertDatasetToDicomJson(dataset, meta, rawDict = {}, rawMeta = {}) {
  const dicomJson = {};

  // Add metadata elements (file meta information) from raw meta dict
  // The meta dict should already have tags as keys
  if (rawMeta) {
    Object.keys(rawMeta).forEach(tag => {
      const element = rawMeta[tag];
      if (element && element.Value !== undefined) {
        dicomJson[tag] = {
          vr: element.vr || element.VR || 'UN',
          Value: Array.isArray(element.Value) ? element.Value : [element.Value]
        };
      }
    });
  }

  // Add dataset elements from raw dict
  // The raw dict already has tags as keys (format may vary: "00080018" or "(0008,0018)")
  Object.keys(rawDict).forEach(tag => {
    // Skip metadata tags (they're in the 0002xxxx group)
    // Tag format might be "00020000" or "(0002,0000)"
    if (tag.startsWith('0002') || tag.startsWith('(0002')) {
      return;
    }

    const element = rawDict[tag];
    if (!element) {
      return;
    }

    const vr = element.vr || element.VR || 'UN';
    let value = element.Value;

    // Skip pixel data - it's handled separately in frames/
    // Pixel data tag is (7FE0,0010) - check both formats
    if (tag === '7FE00010' || tag === '(7FE0,0010)' || tag.includes('7FE0') && tag.includes('0010')) {
      return;
    }

    // Handle different VR types
    if (vr === 'SQ') {
      // Sequence - recursively convert nested items
      if (Array.isArray(value) && value.length > 0) {
        dicomJson[tag] = {
          vr: vr,
          Value: value.map(item => {
            if (typeof item === 'object' && item !== null && item.dict) {
              // Nested sequence item with its own dict
              return convertDatasetToDicomJson({}, {}, item.dict, {});
            }
            return item;
          })
        };
      }
    } else if (vr === 'OB' || vr === 'OW' || vr === 'OF' || vr === 'OD' || vr === 'OL' || vr === 'OV' || vr === 'UN') {
      // Binary data - skip for now (could be stored as bulkdata)
      // Pixel data is already handled separately
      return;
    } else {
      // Simple value types
      if (value === null || value === undefined) {
        return;
      }

      const valueArray = Array.isArray(value) ? value : [value];

      // Convert values to appropriate types for DICOM JSON
      const convertedValues = valueArray.map(v => {
        if (v === null || v === undefined) {
          return '';
        }
        return v;
      });

      dicomJson[tag] = {
        vr: vr,
        Value: convertedValues
      };
    }
  });

  return dicomJson;
}

/**
 * Get VR (Value Representation) for a tag
 * This is a simplified version - in production, use dcmjs dictionary
 */
function getVRForTag(tag, name) {
  // Common VRs based on tag name patterns
  if (name.includes('UID') || name.includes('InstanceUID')) return 'UI';
  if (name.includes('Date')) return 'DA';
  if (name.includes('Time')) return 'TM';
  if (name.includes('Number')) return 'IS';
  if (name.includes('Sequence')) return 'SQ';
  if (name.includes('Name')) return 'PN';
  if (name.includes('Description') || name.includes('Comment')) return 'LO';
  if (name.includes('Data') && name.includes('Pixel')) return 'OB';
  return 'UN';
}

/**
 * Saves the static-dicomweb structure to a folder using File System Access API
 * Falls back to creating a ZIP file if File System Access API is not available
 * @param {Object} outputFiles - Object mapping file paths to Blobs
 * @param {string} folderName - Name for the folder/ZIP
 * @param {DirectoryHandle} existingDirectoryHandle - Optional existing directory handle (for user gesture requirement)
 */
export async function saveStaticDicomWebFolder(outputFiles, folderName = 'dicomweb', existingDirectoryHandle = null) {
  // Try File System Access API first (Chrome/Edge)
  // If we have an existing directory handle, use it (avoids user gesture requirement)
  if (existingDirectoryHandle) {
    try {
      // Create the folder structure and save files
      for (const [filePath, blob] of Object.entries(outputFiles)) {
        const pathParts = filePath.split('/').filter(p => p);
        let currentHandle = existingDirectoryHandle;

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

      return { success: true, method: 'folder', directoryHandle: existingDirectoryHandle };
    } catch (error) {
      console.error('Error saving to existing folder:', error);
      // Fall through to ZIP method
    }
  }

  // Note: showDirectoryPicker requires a user gesture, so we can't call it from async callbacks
  // For now, always use ZIP download which is more reliable
  // Create ZIP file
  try {
    const zipJs = await import('@zip.js/zip.js');
    const { ZipWriter, BlobWriter, BlobReader } = zipJs;

    const zipWriter = new ZipWriter(new BlobWriter());

    // Add all files to ZIP
    for (const [filePath, blob] of Object.entries(outputFiles)) {
      await zipWriter.add(filePath, new BlobReader(blob));
    }

    // Generate the ZIP blob
    const zipBlob = await zipWriter.close();

    // Download the ZIP
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folderName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true, method: 'zip' };
  } catch (error) {
    console.error('Error creating ZIP:', error);
    return { success: false, error: error.message };
  }
}
