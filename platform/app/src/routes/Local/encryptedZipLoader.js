/**
 * Encrypted ZIP Loader
 * Reads password-protected ZIP files and extracts DICOM files and PDF study reports
 * in memory without storing them to disk
 *
 * Uses @zip.js/zip.js library which supports:
 * - ZipCrypto (traditional ZIP encryption - weaker but widely compatible)
 * - AES-128 and AES-256 (stronger encryption - recommended for sensitive data)
 *
 * RECOMMENDATION: Use AES-256 encryption when creating ZIP files with 7-Zip
 * for better security. The zip.js library will automatically detect and decrypt
 * both ZipCrypto and AES-256 encrypted archives.
 */

/**
 * Convert a ZIP entry to a File object that can be used by the file loader
 * @param {object} entry - The zip.js entry object
 * @param {string} password - The password for decryption
 * @returns {Promise<File>} A File object ready for processing
 */
async function zipEntryToFile(entry, password) {
  let zipJs;
  try {
    zipJs = await import('@zip.js/zip.js');
  } catch (error) {
    throw new Error(
      'zip.js library not found. Please install it: npm install @zip.js/zip.js'
    );
  }
  const { BlobWriter } = zipJs;

  try {
    // Get the file data as Blob using zip.js API
    const blob = await entry.getData(new BlobWriter(), { password: password });

    // Convert Blob to File object
    // Extract just the filename from the path
    const pathParts = entry.filename.split('/');
    const simpleFilename = pathParts[pathParts.length - 1];

    // Determine MIME type based on file extension
    const filenameLower = simpleFilename.toLowerCase();
    let mimeType = 'application/dicom'; // Default to DICOM
    if (filenameLower.endsWith('.pdf')) {
      mimeType = 'application/pdf';
    }

    const file = new File([blob], simpleFilename, {
      type: mimeType,
      lastModified: entry.lastModDate ? entry.lastModDate.getTime() : Date.now(),
    });

    return file;
  } catch (error) {
    console.error(`Error extracting ${entry.filename} from ZIP:`, error);
    throw error;
  }
}

/**
 * Load files from an encrypted ZIP archive
 * @param {File} zipFile - The ZIP file
 * @param {string} password - The password for decryption
 * @param {Function} onProgress - Progress callback (loaded, total)
 * @returns {Promise<File[]>} Array of File objects ready for processing
 */
export async function loadFilesFromEncryptedZip(zipFile, password, onProgress = null) {
  // Dynamic import of zip.js
  let zipJs;
  try {
    zipJs = await import('@zip.js/zip.js');
  } catch (error) {
    throw new Error(
      'zip.js library not found. Please install it: npm install @zip.js/zip.js'
    );
  }

  try {
    const { ZipReader, BlobReader } = zipJs;

    // Create a ZipReader with password
    const zipReader = new ZipReader(new BlobReader(zipFile), {
      password: password,
    });

    // Get all entries
    const entries = await zipReader.getEntries();

    // Debug: Log all entries to help diagnose issues
    console.log(`Total entries in ZIP: ${entries.length}`);
    entries.forEach((entry, index) => {
      console.log(`Entry ${index}: ${entry.filename} (directory: ${entry.directory})`);
    });

    // Filter for DICOM files and PDF files
    // DICOM files can have .dcm, .dicom extensions, or no extension
    // PDF files are study reports that should be associated with studies
    // We'll check file extensions first, and if no matches, we'll try to process all non-directory files
    const dicomEntries = entries.filter(entry => {
      if (entry.directory) return false;
      const filename = entry.filename.toLowerCase();
      // Check for common DICOM extensions
      const isDicom = filename.endsWith('.dcm') ||
                      filename.endsWith('.dicom') ||
                      filename.endsWith('.dc3') ||
                      // If no extension, we'll include it (DICOM files sometimes have no extension)
                      (!filename.includes('.') && entry.filename.length > 0);
      // Check for PDF files (study reports)
      const isPdf = filename.endsWith('.pdf');
      return isDicom || isPdf;
    });

    console.log(`Files matching DICOM/PDF extensions: ${dicomEntries.length}`);
    dicomEntries.forEach((entry, index) => {
      console.log(`Entry ${index}: ${entry.filename}`);
    });

    // If no files match the extension filter, try including all non-directory files
    // (DICOM files might not have extensions)
    let filesToProcess = dicomEntries;
    if (dicomEntries.length === 0) {
      console.warn('No files with DICOM/PDF extensions found. Processing all non-directory files...');
      filesToProcess = entries.filter(entry => !entry.directory);
      console.log(`Processing ${filesToProcess.length} non-directory files`);
    }

    const totalFiles = filesToProcess.length;
    const files = [];
    let loadedCount = 0;

    // Extract each file and convert to File object
    for (const entry of filesToProcess) {
      try {
        const file = await zipEntryToFile(entry, password);
        files.push(file);

        loadedCount++;
        if (onProgress) {
          onProgress(loadedCount, totalFiles);
        }
      } catch (error) {
        // If it's a password error, close reader and throw
        if (error.message && error.message.includes('password')) {
          await zipReader.close();
          throw error;
        }
        console.warn(`Failed to extract ${entry.filename}:`, error);
        // Continue with other files even if one fails (non-password errors)
      }
    }

    // Close the ZIP reader
    await zipReader.close();

    return files;
  } catch (error) {
    if (error.message && error.message.includes('password')) {
      throw new Error('Incorrect password. Please try again.');
    }
    throw new Error(`Failed to load ZIP file: ${error.message}`);
  }
}

/**
 * Extract all files from encrypted ZIP to a downloadable format
 * @param {File} zipFile - The ZIP file
 * @param {string} password - The password for decryption
 * @param {Function} onProgress - Progress callback (loaded, total)
 * @returns {Promise<Object>} Object with files ready for download (filename -> Blob)
 */
export async function extractEncryptedZipForDownload(zipFile, password, onProgress = null) {
  let zipJs;
  try {
    zipJs = await import('@zip.js/zip.js');
  } catch (error) {
    throw new Error(
      'zip.js library not found. Please install it: npm install @zip.js/zip.js'
    );
  }

  try {
    const { ZipReader, BlobReader, BlobWriter } = zipJs;

    // Create a ZipReader with password
    const zipReader = new ZipReader(new BlobReader(zipFile), {
      password: password,
    });

    // Get all entries
    const entries = await zipReader.getEntries();

    // Filter out directories
    const fileEntries = entries.filter(entry => !entry.directory);

    const totalFiles = fileEntries.length;
    const files = {};
    let loadedCount = 0;

    // Extract all files
    for (const entry of fileEntries) {
      try {
        const blob = await entry.getData(new BlobWriter(), { password: password });
        files[entry.filename] = blob;

        loadedCount++;
        if (onProgress) {
          onProgress(loadedCount, totalFiles);
        }
      } catch (error) {
        if (error.message && (error.message.includes('password') || error.message.includes('Wrong password'))) {
          await zipReader.close();
          throw new Error('Incorrect password. Please try again.');
        }
        console.warn(`Failed to extract ${entry.filename}:`, error);
      }
    }

    // Close the ZIP reader
    await zipReader.close();

    return files;
  } catch (error) {
    if (error.message && error.message.includes('password')) {
      throw new Error('Incorrect password. Please try again.');
    }
    throw new Error(`Failed to extract ZIP file: ${error.message}`);
  }
}
