/**
 * PDF Storage Utility
 * Stores PDF files by study UUID for retrieval in the study list
 */

// In-memory storage for PDF files by study UUID
const pdfStorage = new Map<string, File>();

/**
 * Store a PDF file for a study
 * @param studyInstanceUid - The study instance UID
 * @param pdfFile - The PDF file to store
 */
export function storePdfForStudy(studyInstanceUid: string, pdfFile: File): void {
  pdfStorage.set(studyInstanceUid, pdfFile);
}

/**
 * Get the PDF file for a study
 * @param studyInstanceUid - The study instance UID
 * @returns The PDF file if available, null otherwise
 */
export function getPdfForStudy(studyInstanceUid: string): File | null {
  return pdfStorage.get(studyInstanceUid) || null;
}

/**
 * Check if a PDF is available for a study
 * @param studyInstanceUid - The study instance UID
 * @returns True if PDF is available, false otherwise
 */
export function hasPdfForStudy(studyInstanceUid: string): boolean {
  return pdfStorage.has(studyInstanceUid);
}

/**
 * Remove PDF for a study
 * @param studyInstanceUid - The study instance UID
 */
export function removePdfForStudy(studyInstanceUid: string): void {
  pdfStorage.delete(studyInstanceUid);
}

/**
 * Clear all stored PDFs
 */
export function clearAllPdfs(): void {
  pdfStorage.clear();
}

/**
 * Extract study UUID from PDF filename
 * Expected formats: {studyid}.pdf or study-{uuid}.pdf
 * DICOM Study Instance UIDs are typically long strings with dots (e.g., 1.2.840.113619.2.55.3.1234567890.123)
 * @param filename - The PDF filename
 * @returns The study UUID if found, null otherwise
 */
export function extractStudyUidFromPdfFilename(filename: string): string | null {
  // Remove .pdf extension (case insensitive)
  const nameWithoutExt = filename.replace(/\.pdf$/i, '').trim();

  if (!nameWithoutExt || nameWithoutExt.length === 0) {
    return null;
  }

  // Try pattern 1: study-{uuid}.pdf (with prefix)
  const prefixedMatch = nameWithoutExt.match(/^study-(.+)$/i);
  if (prefixedMatch && prefixedMatch[1]) {
    return prefixedMatch[1].trim();
  }

  // Try pattern 2: {studyid}.pdf (direct study ID - most common case)
  // DICOM UIDs typically contain digits and dots (e.g., 1.2.840.113619.2.55.3.1234567890.123)
  // They can be quite long (up to 64 characters)
  const dicomUidPattern = /^[0-9.]+$/; // DICOM UID pattern (digits and dots)
  if (dicomUidPattern.test(nameWithoutExt) && nameWithoutExt.length >= 10) {
    return nameWithoutExt;
  }

  // Fallback: If filename is reasonably long and doesn't contain invalid characters, use it
  // This handles edge cases where the study ID might have a different format
  if (nameWithoutExt.length >= 10 && !nameWithoutExt.includes(' ')) {
    return nameWithoutExt;
  }

  return null;
}
