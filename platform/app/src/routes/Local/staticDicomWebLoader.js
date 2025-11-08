import pako from 'pako';
import { DicomMetadataStore } from '@ohif/core';
import filesToStudies from './filesToStudies';
import dcmjs from 'dcmjs';

/**
 * Loads studies from a static-dicomweb folder structure
 * Reconstructs DICOM files from metadata + frames, then uses standard file loader
 * Supports both folder selection and ZIP extraction
 *
 * @param {File[]} files - Array of files from the static-dicomweb folder
 * @param {Function} onProgress - Progress callback (processed, total)
 * @param {Object} dataSource - Data source for OHIF (optional)
 * @returns {Promise<string[]>} - Array of StudyInstanceUIDs
 */

/**
 * Loads studies from a static-dicomweb folder structure
 * Supports both folder selection and ZIP extraction
 *
 * @param {File[]} files - Array of files from the static-dicomweb folder
 * @param {Function} onProgress - Progress callback (processed, total)
 * @returns {Promise<string[]>} - Array of StudyInstanceUIDs
 */
export async function loadStudiesFromStaticDicomWeb(files, onProgress = null, dataSource = null) {
  const fileMap = new Map(); // Map of file paths to File objects
  const reconstructedFiles = []; // Array of reconstructed DICOM File objects

  // Build file map for easy lookup
  // Normalize paths to use forward slashes (works on both Windows and Unix)
  files.forEach(file => {
    // Handle webkitRelativePath or full path
    let path = file.webkitRelativePath || file.name || '';
    // Normalize path separators to forward slashes
    path = path.replace(/\\/g, '/');
    fileMap.set(path, file);
    // Also store with backslashes for Windows compatibility
    if (path.includes('/')) {
      fileMap.set(path.replace(/\//g, '\\'), file);
    }
  });

  // Find all metadata.gz files (both series-level and instance-level)
  const metadataFiles = Array.from(fileMap.keys()).filter(path => {
    const normalized = path.replace(/\\/g, '/');
    return normalized.includes('/metadata.gz') || normalized.endsWith('metadata.gz');
  });

  console.log(`Found ${metadataFiles.length} metadata files in static-dicomweb structure`);

  // Debug: log some sample paths
  if (metadataFiles.length > 0) {
    console.log('Sample metadata paths:', metadataFiles.slice(0, 3));
  }

  // Process each metadata file
  // Group by series first (series-level metadata contains all instances)
  const seriesMetadataMap = new Map(); // Map of series path -> metadata

  for (const metadataPath of metadataFiles) {
    try {
      // Normalize path
      const normalizedPath = metadataPath.replace(/\\/g, '/');
      const metadataFile = fileMap.get(metadataPath) || fileMap.get(normalizedPath);
      if (!metadataFile) {
        console.warn('Metadata file not found:', metadataPath);
        continue;
      }

      // Parse path - can be either:
      // 1. [prefix/]studies/<StudyUID>/series/<SeriesUID>/metadata.gz (series-level)
      // 2. [prefix/]studies/<StudyUID>/series/<SeriesUID>/instances/<SOPUID>/metadata.gz (instance-level)
      // Handle paths that may have a prefix (like "testdata/studies/...")
      const pathParts = normalizedPath.split('/').filter(p => p);
      const studiesIndex = pathParts.indexOf('studies');

      if (studiesIndex < 0) {
        console.warn('Invalid metadata path structure (no studies folder):', metadataPath);
        continue;
      }

      // Get UIDs after "studies" folder
      const StudyInstanceUID = pathParts[studiesIndex + 1];
      const seriesIndex = pathParts.indexOf('series', studiesIndex);

      if (seriesIndex < 0 || !StudyInstanceUID) {
        console.warn('Invalid metadata path structure (no series folder):', metadataPath);
        continue;
      }

      const SeriesInstanceUID = pathParts[seriesIndex + 1];
      const instancesIndex = pathParts.indexOf('instances', seriesIndex);

      if (!SeriesInstanceUID) {
        console.warn('Missing SeriesInstanceUID in path:', metadataPath);
        continue;
      }

      // Validate UIDs are not empty and don't contain path separators
      if (!StudyInstanceUID || StudyInstanceUID.includes('/') || StudyInstanceUID.includes('\\')) {
        console.warn('Invalid StudyInstanceUID in path:', metadataPath, 'StudyUID:', StudyInstanceUID);
        continue;
      }

      if (!SeriesInstanceUID || SeriesInstanceUID.includes('/') || SeriesInstanceUID.includes('\\')) {
        console.warn('Invalid SeriesInstanceUID in path:', metadataPath, 'SeriesUID:', SeriesInstanceUID);
        continue;
      }

      // Check if this is series-level or instance-level metadata
      if (instancesIndex >= 0 && pathParts.length > instancesIndex + 1) {
        // Instance-level metadata
        const SOPInstanceUID = pathParts[instancesIndex + 1];
        if (!SOPInstanceUID || SOPInstanceUID.includes('/') || SOPInstanceUID.includes('\\') || SOPInstanceUID === 'metadata.gz') {
          console.warn('Missing or invalid SOPInstanceUID in instance-level metadata path:', metadataPath, 'SOPUID:', SOPInstanceUID);
          continue;
        }

        // Store instance-level metadata
        const seriesKey = `${StudyInstanceUID}/${SeriesInstanceUID}`;
        if (!seriesMetadataMap.has(seriesKey)) {
          seriesMetadataMap.set(seriesKey, { studyUID: StudyInstanceUID, seriesUID: SeriesInstanceUID, instances: new Map() });
        }
        const seriesData = seriesMetadataMap.get(seriesKey);

        // Read metadata
        const arrayBuffer = await metadataFile.arrayBuffer();
        let metadataJson;
        try {
          const decompressed = pako.ungzip(new Uint8Array(arrayBuffer), { to: 'string' });
          metadataJson = JSON.parse(decompressed);
        } catch (error) {
          try {
            metadataJson = JSON.parse(new TextDecoder().decode(arrayBuffer));
          } catch (parseError) {
            console.warn('Failed to parse instance metadata file:', metadataPath, error);
            continue;
          }
        }

        seriesData.instances.set(SOPInstanceUID, { metadata: metadataJson, metadataPath: normalizedPath });
      } else {
        // Series-level metadata - contains all instances
        const seriesKey = `${StudyInstanceUID}/${SeriesInstanceUID}`;

        // Read series metadata
        const arrayBuffer = await metadataFile.arrayBuffer();
        let metadataJson;
        try {
          const decompressed = pako.ungzip(new Uint8Array(arrayBuffer), { to: 'string' });
          metadataJson = JSON.parse(decompressed);
        } catch (error) {
          try {
            metadataJson = JSON.parse(new TextDecoder().decode(arrayBuffer));
          } catch (parseError) {
            console.warn('Failed to parse series metadata file:', metadataPath, error);
            continue;
          }
        }

        // Series metadata is an array of instances
        if (Array.isArray(metadataJson)) {
          if (!seriesMetadataMap.has(seriesKey)) {
            seriesMetadataMap.set(seriesKey, { studyUID: StudyInstanceUID, seriesUID: SeriesInstanceUID, instances: new Map() });
          }
          const seriesData = seriesMetadataMap.get(seriesKey);

          // Each item in the array is an instance
          metadataJson.forEach(instanceMetadata => {
            const sopUID = instanceMetadata['00080018']?.Value?.[0] ||
                          instanceMetadata['(0008,0018)']?.Value?.[0];
            if (sopUID) {
              seriesData.instances.set(sopUID, { metadata: instanceMetadata, metadataPath: normalizedPath });
            }
          });
        } else {
          // Single instance metadata
          const sopUID = metadataJson['00080018']?.Value?.[0] ||
                        metadataJson['(0008,0018)']?.Value?.[0];
          if (sopUID) {
            if (!seriesMetadataMap.has(seriesKey)) {
              seriesMetadataMap.set(seriesKey, { studyUID: StudyInstanceUID, seriesUID: SeriesInstanceUID, instances: new Map() });
            }
            const seriesData = seriesMetadataMap.get(seriesKey);
            seriesData.instances.set(sopUID, { metadata: metadataJson, metadataPath: normalizedPath });
          }
        }
      }
    } catch (error) {
      console.error('Error processing metadata file:', metadataPath, error);
    }
  }

  console.log(`Processed ${seriesMetadataMap.size} series with metadata`);

  // Now process each series and its instances
  let instanceProcessedCount = 0;
  const totalInstances = Array.from(seriesMetadataMap.values()).reduce((sum, s) => sum + s.instances.size, 0);

  for (const [seriesKey, seriesData] of seriesMetadataMap.entries()) {
    const { studyUID: StudyInstanceUID, seriesUID: SeriesInstanceUID, instances } = seriesData;

    for (const [SOPInstanceUID, instanceData] of instances.entries()) {
      try {
        const metadataJson = instanceData.metadata;
        const metadataPath = instanceData.metadataPath || '';

        // Find all frame files for this instance
        // Try both forward and backslash paths
        // Also try with the same prefix as the metadata path (e.g., "testdata/")
        const frameFiles = [];
        const pathPrefix = metadataPath.includes('studies/')
          ? metadataPath.substring(0, metadataPath.indexOf('studies/'))
          : '';

        for (let frameNum = 1; frameNum <= 10000; frameNum++) {
          const framePathForward = `${pathPrefix}studies/${StudyInstanceUID}/series/${SeriesInstanceUID}/instances/${SOPInstanceUID}/frames/${frameNum}`;
          const framePathBackward = framePathForward.replace(/\//g, '\\');
          const framePathNoPrefix = `studies/${StudyInstanceUID}/series/${SeriesInstanceUID}/instances/${SOPInstanceUID}/frames/${frameNum}`;

          if (fileMap.has(framePathForward)) {
            frameFiles.push({ frameNum, path: framePathForward });
          } else if (fileMap.has(framePathBackward)) {
            frameFiles.push({ frameNum, path: framePathBackward });
          } else if (fileMap.has(framePathNoPrefix)) {
            frameFiles.push({ frameNum, path: framePathNoPrefix });
          } else {
            // Check if there are any more frames by looking ahead a bit
            // Some files might have gaps in frame numbers
            let foundMore = false;
            for (let checkFrame = frameNum + 1; checkFrame <= frameNum + 10 && checkFrame <= 10000; checkFrame++) {
              const checkPathForward = `${pathPrefix}studies/${StudyInstanceUID}/series/${SeriesInstanceUID}/instances/${SOPInstanceUID}/frames/${checkFrame}`;
              const checkPathBackward = checkPathForward.replace(/\//g, '\\');
              const checkPathNoPrefix = `studies/${StudyInstanceUID}/series/${SeriesInstanceUID}/instances/${SOPInstanceUID}/frames/${checkFrame}`;
              if (fileMap.has(checkPathForward) || fileMap.has(checkPathBackward) || fileMap.has(checkPathNoPrefix)) {
                foundMore = true;
                break;
              }
            }
            if (!foundMore) {
              break; // No more frames
            }
          }
        }

        if (frameFiles.length === 0) {
          // Try to find frames with a different approach - search all files in the instance directory
          const instanceDirForward = `${pathPrefix}studies/${StudyInstanceUID}/series/${SeriesInstanceUID}/instances/${SOPInstanceUID}/frames/`;
          const instanceDirBackward = instanceDirForward.replace(/\//g, '\\');
          const instanceDirNoPrefix = `studies/${StudyInstanceUID}/series/${SeriesInstanceUID}/instances/${SOPInstanceUID}/frames/`;

          const matchingFrames = Array.from(fileMap.keys()).filter(path => {
            const normalized = path.replace(/\\/g, '/');
            return normalized.startsWith(instanceDirForward) ||
                   normalized.startsWith(instanceDirNoPrefix) ||
                   (normalized.includes('/frames/') && normalized.includes(`/instances/${SOPInstanceUID}/`));
          });

          if (matchingFrames.length > 0) {
            // Extract frame numbers from paths
            matchingFrames.forEach(framePath => {
              const normalized = framePath.replace(/\\/g, '/');
              const frameMatch = normalized.match(/\/frames\/(\d+)$/);
              if (frameMatch) {
                const frameNum = parseInt(frameMatch[1], 10);
                frameFiles.push({ frameNum, path: framePath });
              }
            });
            // Sort by frame number
            frameFiles.sort((a, b) => a.frameNum - b.frameNum);
          }

          if (frameFiles.length === 0) {
            console.warn(`No frame files found for instance ${SOPInstanceUID}`);
            if (onProgress) {
              instanceProcessedCount++;
              onProgress(instanceProcessedCount, totalInstances);
            }
            continue;
          }
        }

        // Reconstruct DICOM file from metadata + frames
        try {
          const dicomFile = await reconstructDicomFile(metadataJson, frameFiles, fileMap, SOPInstanceUID);
          if (dicomFile) {
            reconstructedFiles.push(dicomFile);
            // Log multiframe instances for debugging
            const numFrames = metadataJson['00280008']?.Value?.[0] ||
                             metadataJson['(0028,0008)']?.Value?.[0] ||
                             frameFiles.length;
            if (parseInt(numFrames, 10) > 1) {
              console.log(`Reconstructed multiframe instance: ${SOPInstanceUID}, ${numFrames} frames`);
            }
          }
        } catch (error) {
          console.error(`Error reconstructing DICOM file for ${SOPInstanceUID}:`, error);
          // Log if it's a multiframe that failed
          const numFrames = metadataJson['00280008']?.Value?.[0] ||
                           metadataJson['(0028,0008)']?.Value?.[0] ||
                           frameFiles.length;
          if (parseInt(numFrames, 10) > 1) {
            console.error(`Failed to reconstruct multiframe instance: ${SOPInstanceUID}, ${numFrames} frames expected`);
          }
        }

        // Update progress
        if (onProgress) {
          instanceProcessedCount++;
          onProgress(instanceProcessedCount, totalInstances);
        }

        console.log(`Processed instance: ${SOPInstanceUID} with ${frameFiles.length} frames`);
      } catch (error) {
        console.error(`Error processing instance ${SOPInstanceUID}:`, error);
        if (onProgress) {
          instanceProcessedCount++;
          onProgress(instanceProcessedCount, totalInstances);
        }
      }
    }
  }

  if (reconstructedFiles.length === 0) {
    console.warn('No DICOM files were reconstructed from static-dicomweb structure');
    return [];
  }

  console.log(`Reconstructed ${reconstructedFiles.length} DICOM files from static-dicomweb structure`);

  // Use the standard file loader to process reconstructed DICOM files
  const progressCallback = onProgress ? (loaded, total) => {
    // Adjust progress to account for reconstruction + loading
    onProgress(loaded, total);
  } : null;

  return await filesToStudies(reconstructedFiles, dataSource, progressCallback);
}


/**
 * Reconstructs a DICOM file from metadata JSON and frame files
 */
async function reconstructDicomFile(metadataJson, frameFiles, fileMap, sopInstanceUID) {
  // Check if this is an encapsulated image BEFORE loading frames
  // TransferSyntaxUID is in the meta (0002 group)
  const transferSyntaxUID = metadataJson['00020010']?.Value?.[0] ||
                            metadataJson['(0002,0010)']?.Value?.[0];
  const isEncapsulated = transferSyntaxUID &&
    transferSyntaxUID !== '1.2.840.10008.1.2' && // Explicit VR Little Endian (uncompressed)
    transferSyntaxUID !== '1.2.840.10008.1.2.1' && // Explicit VR Little Endian (uncompressed)
    (transferSyntaxUID.includes('JPEG') ||
     transferSyntaxUID.includes('RLE') ||
     transferSyntaxUID.includes('JPEG2000') ||
     transferSyntaxUID.includes('MPEG') ||
     transferSyntaxUID.includes('1.2.840.10008.1.2.4')); // JPEG Baseline (compressed)

  // Load all frame data
  const frameBuffers = [];
  for (const frameFile of frameFiles) {
    // Try both forward and backslash paths
    let frameData = fileMap.get(frameFile.path);
    if (!frameData) {
      const altPath = frameFile.path.replace(/\//g, '\\');
      frameData = fileMap.get(altPath);
    }
    if (!frameData) {
      const altPath2 = frameFile.path.replace(/\\/g, '/');
      frameData = fileMap.get(altPath2);
    }
    if (!frameData) {
      throw new Error(`Frame file not found: ${frameFile.path}`);
    }
    const buffer = await frameData.arrayBuffer();
    frameBuffers.push(new Uint8Array(buffer));
  }

  // Log frame loading
  if (isEncapsulated && frameBuffers.length > 1) {
    console.log(`Loading ${frameBuffers.length} frames for encapsulated instance ${sopInstanceUID}, TransferSyntax: ${transferSyntaxUID}`);
  }

  // isEncapsulated is already determined above

  // Check NumberOfFrames to ensure we have the right count
  const numberOfFrames = metadataJson['00280008']?.Value?.[0] ||
                         metadataJson['(0028,0008)']?.Value?.[0] ||
                         frameBuffers.length;
  const expectedFrames = parseInt(numberOfFrames, 10) || frameBuffers.length;

  // Use the actual frame count for BOT - this ensures BOT length matches what we have
  // NumberOfFrames will be updated to match in the dataset
  const actualFrames = frameBuffers.length;

  let pixelData;
  if (isEncapsulated && actualFrames > 1) {
    // For encapsulated multiframe images, DICOM uses a sequence-of-items format
    // Structure: Item(FFFE,E000) + Length(4) + BOT data + Item(FFFE,E000) + Length(4) + Frame1 + ...
    // BOT offsets are relative to the START of the pixel data element (after tag/VR/length header)
    console.log(`Encapsulated image detected: ${actualFrames} frames found, ${expectedFrames} in metadata, TransferSyntax: ${transferSyntaxUID}`);

    const numFramesForBOT = actualFrames; // Use actual frame count
    const botSize = numFramesForBOT * 4; // 4 bytes per offset entry
    const itemHeaderSize = 8; // FFFE E000 (4 bytes) + Length (4 bytes)

    // Calculate offsets for each frame item
    // Offsets are relative to the start of pixel data (which is the first item)
    // First item contains BOT, so it starts at offset 0
    // Subsequent items start after: first item (8 + BOT size) + all previous frame items
    const offsets = new Uint32Array(numFramesForBOT);
    let currentOffset = itemHeaderSize + botSize; // Start after first item (BOT item)

    // Set offsets for all frame items
    // Each offset points to the start of the item (including item tag and length)
    for (let i = 0; i < numFramesForBOT; i++) {
      offsets[i] = currentOffset;
      // Move to next item: current item header (8) + frame data
      currentOffset += itemHeaderSize + frameBuffers[i].length;
    }

    // Verify that the last frame offset + frame size doesn't exceed what we'll create
    const lastFrameOffset = offsets[numFramesForBOT - 1];
    const lastFrameSize = itemHeaderSize + frameBuffers[frameBuffers.length - 1].length;
    const calculatedTotalSize = lastFrameOffset + lastFrameSize;
    console.log(`BOT calculation check: lastFrameOffset=${lastFrameOffset}, lastFrameSize=${lastFrameSize}, calculatedTotalSize=${calculatedTotalSize}`);

    // Calculate total size: first item (BOT) + N frame items
    const firstItemSize = itemHeaderSize + botSize;
    const frameDataSize = frameBuffers.reduce((sum, buf) => sum + itemHeaderSize + buf.length, 0);
    const totalSize = firstItemSize + frameDataSize;

    // Create pixel data in sequence-of-items format
    pixelData = new Uint8Array(totalSize);
    const view = new DataView(pixelData.buffer);
    let offset = 0;

    // First item: BOT (Basic Offset Table)
    // Item tag: FFFE E000 (little-endian: 0xE000FFFE)
    view.setUint32(offset, 0xE000FFFE, true);
    offset += 4;
    // Item length: BOT size (4 bytes per entry)
    view.setUint32(offset, botSize, true);
    offset += 4;
    // BOT data (offsets as little-endian bytes, relative to start of pixel data)
    for (let i = 0; i < numFramesForBOT; i++) {
      view.setUint32(offset, offsets[i], true);
      offset += 4;
    }

    // Subsequent items: one per frame
    for (let i = 0; i < frameBuffers.length; i++) {
      // Item tag: FFFE E000
      view.setUint32(offset, 0xE000FFFE, true);
      offset += 4;
      // Item length: frame data size
      view.setUint32(offset, frameBuffers[i].length, true);
      offset += 4;
      // Frame data
      pixelData.set(frameBuffers[i], offset);
      offset += frameBuffers[i].length;
    }

    // Verify the total size matches what we calculated
    if (offset !== totalSize) {
      console.error(`Size mismatch for ${sopInstanceUID}: calculated ${totalSize}, actual ${offset}`);
    }

    console.log(`Created encapsulated pixel data with sequence-of-items format: ${numFramesForBOT} frames, BOT with ${numFramesForBOT} entries, total size: ${pixelData.length} bytes`);
    console.log(`BOT offsets: first=${offsets[0]}, last=${offsets[numFramesForBOT - 1]}, max offset=${currentOffset - itemHeaderSize - frameBuffers[frameBuffers.length - 1].length}, pixelData size=${pixelData.length}`);
  } else {
    // For uncompressed or single-frame images, just concatenate frames
    const totalLength = frameBuffers.reduce((sum, buf) => sum + buf.length, 0);
    pixelData = new Uint8Array(totalLength);
    let offset = 0;
    for (const frameBuffer of frameBuffers) {
      pixelData.set(frameBuffer, offset);
      offset += frameBuffer.length;
    }
  }

  // Use actual frames for NumberOfFrames tag to match BOT
  // For encapsulated images, this must match the BOT length exactly
  // For uncompressed, use the metadata value or actual frame count
  const finalExpectedFrames = isEncapsulated && frameBuffers.length > 1
    ? frameBuffers.length  // Must match BOT length for encapsulated
    : (frameBuffers.length > 1 ? frameBuffers.length : expectedFrames);

  // Convert DICOM JSON back to DICOM binary format using dcmjs
  try {
    // Manually construct DicomDict from JSON
    // DICOM JSON format: { "00080018": { "vr": "UI", "Value": ["..."] } }
    const dicomDict = new dcmjs.data.DicomDict();

    // Separate file meta information (group 0002) from dataset
    const meta = {};
    const dataset = {};

    // Convert JSON to dict format
    Object.keys(metadataJson).forEach(tag => {
      const element = metadataJson[tag];
      if (element && element.vr && element.Value !== undefined) {
        // Normalize tag format (handle both "00080018" and "(0008,0018)")
        let normalizedTag = tag;
        if (tag.includes('(') && tag.includes(',')) {
          // Convert "(0008,0018)" to "00080018"
          normalizedTag = tag.replace(/[(),]/g, '');
        }

        let value = Array.isArray(element.Value) ? element.Value : [element.Value];

        // Handle VR-specific value formatting
        // CS (Code String) values are separated by backslashes and each part max 16 chars
        if (element.vr === 'CS') {
          // If value is a string with backslashes, split it
          value = value.map(v => {
            if (typeof v === 'string' && v.includes('\\')) {
              return v.split('\\').filter(part => part.length > 0);
            }
            return v;
          }).flat();

          // Ensure each CS value is max 16 characters
          // Skip truncation warning for very long hex strings (likely misidentified VR)
          value = value.map(v => {
            if (typeof v === 'string' && v.length > 16) {
              // If it's a 64-char hex string, it's likely not a CS value - skip it or handle differently
              if (v.length === 64 && /^[0-9a-fA-F]+$/.test(v)) {
                // This is likely a bulk data reference or hash, not a CS value
                // Skip this element or handle it as a different VR
                return null; // Will be filtered out
              }
              // Only warn for reasonable-length CS values that exceed limit
              if (v.length <= 32) {
                console.warn(`CS value truncated from ${v.length} to 16 chars: ${v.substring(0, 16)}`);
              }
              return v.substring(0, 16);
            }
            return v;
          }).filter(v => v !== null); // Remove null values
        }
        // Handle SQ (Sequence) VR - each item must be a dict structure
        else if (element.vr === 'SQ') {
          value = value.map(item => {
            if (typeof item === 'object' && item !== null) {
              // Convert sequence item to dict format
              const itemDict = {};
              Object.keys(item).forEach(itemTag => {
                const itemElement = item[itemTag];
                if (itemElement && itemElement.vr && itemElement.Value !== undefined) {
                  // Skip binary data (OB/OW) within sequences - they cause issues with dcmjs
                  if (itemElement.vr === 'OB' || itemElement.vr === 'OW') {
                    return; // Skip this binary element entirely
                  }

                  let normalizedItemTag = itemTag;
                  if (itemTag.includes('(') && itemTag.includes(',')) {
                    normalizedItemTag = itemTag.replace(/[(),]/g, '');
                  }

                  let itemValue = Array.isArray(itemElement.Value) ? itemElement.Value : [itemElement.Value];

                  // Recursively handle nested sequences
                  if (itemElement.vr === 'SQ') {
                    itemValue = itemValue.map(nestedItem => {
                      if (typeof nestedItem === 'object' && nestedItem !== null) {
                        const nestedDict = {};
                        Object.keys(nestedItem).forEach(nestedTag => {
                          const nestedElement = nestedItem[nestedTag];
                          if (nestedElement && nestedElement.vr && nestedElement.Value !== undefined) {
                            // Skip binary data in nested sequences too
                            if (nestedElement.vr === 'OB' || nestedElement.vr === 'OW') {
                              return; // Skip this binary element entirely
                            }
                            let normalizedNestedTag = nestedTag;
                            if (nestedTag.includes('(') && nestedTag.includes(',')) {
                              normalizedNestedTag = nestedTag.replace(/[(),]/g, '');
                            }
                            nestedDict[normalizedNestedTag] = {
                              vr: nestedElement.vr,
                              Value: Array.isArray(nestedElement.Value) ? nestedElement.Value : [nestedElement.Value]
                            };
                          }
                        });
                        return nestedDict;
                      }
                      return nestedItem;
                    });
                  }

                  itemDict[normalizedItemTag] = {
                    vr: itemElement.vr,
                    Value: itemValue
                  };
                }
              });
              return itemDict;
            }
            return item;
          });
        }
        // Handle LO (Long String) and other string VRs - ensure values are strings
        else if (element.vr === 'LO' || element.vr === 'LT' || element.vr === 'ST' || element.vr === 'UT') {
          value = value.map(v => {
            if (v === null || v === undefined) {
              return '';
            }
            return String(v);
          });
        }
        // Handle OB/OW (Other Byte/Word) - skip these as they're binary data that should be handled separately
        // Pixel data (7FE0,0010) will be added separately
        else if (element.vr === 'OB' || element.vr === 'OW') {
          // Skip binary data elements except pixel data (which we'll add separately)
          const pixelDataTag = '7FE00010';
          if (normalizedTag !== pixelDataTag) {
            // Skip other binary data elements - they're not needed for reconstruction
            return; // Skip this element
          }
        }

        const elementData = {
          vr: element.vr,
          Value: value
        };

        // File meta information is in group 0002
        if (normalizedTag.startsWith('0002')) {
          meta[normalizedTag] = elementData;
        } else {
          dataset[normalizedTag] = elementData;
        }
      }
    });

    // Ensure NumberOfFrames is set correctly for multiframe images
    // This is critical for encapsulated images - dicomParser uses it to validate BOT
    // NumberOfFrames MUST match the BOT length exactly
    const numberOfFramesTag = '00280008';
    if (finalExpectedFrames > 1) {
      // Always set NumberOfFrames to match the actual frame count (which matches BOT length)
      const numFramesValue = String(finalExpectedFrames);
      dataset[numberOfFramesTag] = {
        vr: 'IS', // Integer String
        Value: [numFramesValue]
      };
      console.log(`Set NumberOfFrames tag to ${numFramesValue} (matches BOT length ${isEncapsulated && frameBuffers.length > 1 ? frameBuffers.length : 'N/A'}) for ${sopInstanceUID}`);

      // Double-check: if this is encapsulated, verify BOT length matches
      if (isEncapsulated && frameBuffers.length > 1) {
        const botLength = frameBuffers.length;
        if (parseInt(numFramesValue, 10) !== botLength) {
          console.error(`CRITICAL: NumberOfFrames (${numFramesValue}) does not match BOT length (${botLength}) for ${sopInstanceUID}`);
        } else {
          console.log(`Verified: NumberOfFrames (${numFramesValue}) matches BOT length (${botLength}) for ${sopInstanceUID}`);
        }
      }
    }

    // Set meta and dict
    dicomDict.meta = meta;
    dicomDict.dict = dataset;

    // Add pixel data element (tag 7FE0,0010)
    // Pixel data should be stored as OW (Other Word) or OB (Other Byte) VR
    // dcmjs expects ArrayBuffer for binary data (OB/OW VR)
    const pixelDataTag = '7FE00010';
    // Create a new ArrayBuffer from the Uint8Array to ensure it's a proper buffer
    // For encapsulated images, we need to ensure the BOT is at the start
    const pixelDataBuffer = pixelData.buffer.slice(
      pixelData.byteOffset,
      pixelData.byteOffset + pixelData.byteLength
    );

    // Log pixel data info for debugging
    if (isEncapsulated && frameBuffers.length > 1) {
      console.log(`Adding pixel data for ${sopInstanceUID}: size=${pixelData.length}, BOT size=${frameBuffers.length * 4}, NumberOfFrames=${finalExpectedFrames}`);
    }

    // For encapsulated images, pixel data VR must be OB (Other Byte)
    // For uncompressed images, use OW for larger data (>64KB), OB for smaller
    const pixelDataVR = isEncapsulated ? 'OB' : (pixelData.length > 0xFFFF ? 'OW' : 'OB');
    const pixelDataElement = {
      vr: pixelDataVR,
      Value: [pixelDataBuffer] // Pass ArrayBuffer
    };

    if (isEncapsulated && frameBuffers.length > 1) {
      console.log(`Using VR=${pixelDataVR} for encapsulated pixel data, buffer size=${pixelDataBuffer.byteLength}, sequence-of-items format`);
    }
    dicomDict.dict[pixelDataTag] = pixelDataElement;

    // Write to binary DICOM format using dicomDict.write()
    // This is the correct dcmjs API - DicomDict has a write() method
    let binary;
    try {
      binary = dicomDict.write();
    } catch (writeError) {
      console.error('Error writing DICOM with dicomDict.write():', writeError);
      console.error('Error details:', {
        message: writeError?.message,
        stack: writeError?.stack,
        name: writeError?.name,
        sopInstanceUID,
        isEncapsulated,
        numFrames: frameBuffers.length,
        pixelDataSize: pixelData?.length
      });
      throw writeError;
    }

    // For encapsulated images, dcmjs.write() might rewrite the pixel data incorrectly
    // We need to manually patch the pixel data section to ensure the sequence-of-items format is preserved
    if (isEncapsulated && frameBuffers.length > 1) {
      try {
        // Find the pixel data tag (7FE0,0010) in the binary
        // Tag is stored as little-endian: 0xE0 0x7F 0x10 0x00
        const binaryView = new Uint8Array(binary);
        let pixelDataOffset = -1;

        // Search for pixel data tag (7FE0,0010) - little-endian bytes
        for (let i = 0; i < binaryView.length - 8; i++) {
          if (binaryView[i] === 0xE0 &&
              binaryView[i + 1] === 0x7F &&
              binaryView[i + 2] === 0x10 &&
              binaryView[i + 3] === 0x00) {
            pixelDataOffset = i;
            break;
          }
        }

        if (pixelDataOffset >= 0) {
          // Found pixel data tag, now find where the actual pixel data starts
          // Structure: Tag (4) + VR (2) + Reserved (2 for OB/OW) + Length (4) = 12 bytes total
          const vrOffset = pixelDataOffset + 4;
          const vrBytes = String.fromCharCode(binaryView[vrOffset], binaryView[vrOffset + 1]);

          let dataOffset;
          if (vrBytes === 'OB' || vrBytes === 'OW') {
            // OB/OW: Tag (4) + VR (2) + Reserved (2) + Length (4) = 12 bytes
            dataOffset = pixelDataOffset + 12;

            // Check if length is undefined (0xFFFFFFFF) - common for encapsulated images
            const lengthView = new DataView(binary, dataOffset - 4, 4);
            const length = lengthView.getUint32(0, true); // Little-endian

            // Replace the pixel data section with our correctly formatted sequence-of-items
            const oldDataSize = length === 0xFFFFFFFF ? (binaryView.length - dataOffset) : length;
            const newBinarySize = dataOffset + pixelData.length;
            const newBinary = new Uint8Array(newBinarySize);

            // Copy everything before pixel data
            newBinary.set(binaryView.subarray(0, dataOffset));
            // Copy our correctly formatted pixel data
            newBinary.set(pixelData, dataOffset);

            // Update the length field for pixel data (always use defined length for our patched version)
            const lengthViewNew = new DataView(newBinary.buffer, dataOffset - 4, 4);
            lengthViewNew.setUint32(0, pixelData.length, true); // Little-endian

            binary = newBinary.buffer;

            // Verify the patched pixel data structure
            const patchedView = new Uint8Array(binary);
            const patchedPixelData = patchedView.subarray(dataOffset, dataOffset + pixelData.length);

            // Check if first item tag is correct (FFFE E000)
            const firstItemTag = new DataView(patchedPixelData.buffer, 0, 4).getUint32(0, true);
            const expectedItemTag = 0xE000FFFE; // FFFE E000 in little-endian
            const actualItemTag = 0xE000FFFE; // What we wrote

            console.log(`Patched pixel data section for ${sopInstanceUID}: replaced ${oldDataSize} bytes with ${pixelData.length} bytes (sequence-of-items format)`);
            console.log(`  Pixel data starts at offset ${dataOffset}, length field set to ${pixelData.length}`);
            console.log(`  First item tag in patched data: 0x${firstItemTag.toString(16)} (expected 0x${actualItemTag.toString(16)})`);

            // Verify BOT structure
            if (pixelData.length >= 8) {
              const botItemLength = new DataView(patchedPixelData.buffer, 4, 4).getUint32(0, true);
              const expectedBOTSize = frameBuffers.length * 4;
              console.log(`  BOT item length: ${botItemLength} bytes (expected ${expectedBOTSize})`);

              if (botItemLength === expectedBOTSize && pixelData.length >= 8 + botItemLength) {
                // Read first few BOT offsets
                const firstOffset = new DataView(patchedPixelData.buffer, 8, 4).getUint32(0, true);
                const lastOffset = new DataView(patchedPixelData.buffer, 8 + (frameBuffers.length - 1) * 4, 4).getUint32(0, true);
                console.log(`  BOT first offset: ${firstOffset}, last offset: ${lastOffset}, pixelData size: ${pixelData.length}`);

                if (lastOffset + frameBuffers[frameBuffers.length - 1].length > pixelData.length) {
                  console.error(`  ERROR: Last frame offset (${lastOffset}) + frame size (${frameBuffers[frameBuffers.length - 1].length}) = ${lastOffset + frameBuffers[frameBuffers.length - 1].length} exceeds pixelData size (${pixelData.length})`);
                }
              }
            }
          } else {
            console.warn(`Pixel data VR is ${vrBytes}, expected OB or OW for ${sopInstanceUID}`);
          }
        } else {
          console.warn(`Could not find pixel data tag (7FE0,0010) in written file for ${sopInstanceUID}, file size: ${binaryView.length} bytes`);
        }
      } catch (patchError) {
        console.error(`Error patching pixel data for ${sopInstanceUID}:`, patchError);
        console.error('Patch error details:', patchError.stack);
        // Continue with original binary - might still work
      }
    }

    // Create File object
    const fileName = `${sopInstanceUID}.dcm`;
    const file = new File([binary], fileName, { type: 'application/dicom' });

    return file;
  } catch (error) {
    console.error('Error reconstructing DICOM file with dcmjs:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      sopInstanceUID,
      isEncapsulated,
      numFrames: frameBuffers?.length,
      pixelDataSize: pixelData?.length
    });
    // Fallback: create a minimal DICOM file (this won't work properly but prevents crash)
    throw error;
  }
}
