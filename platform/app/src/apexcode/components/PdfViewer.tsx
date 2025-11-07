import React, { useEffect, useRef } from 'react';
import { Button, Icons } from '@ohif/ui-next';
import moment from 'moment';

interface PdfViewerProps {
  pdfFile: File | null;
  studyInstanceUid: string | null;
  patientName?: string;
  patientId?: string;
  studyDate?: string;
  studyTime?: string;
  onClose: () => void;
}

/**
 * PDF Viewer Component
 * Displays PDF files in an iframe or object tag
 */
function PdfViewer({
  pdfFile,
  studyInstanceUid,
  patientName,
  patientId,
  studyDate,
  studyTime,
  onClose,
}: PdfViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);

  useEffect(() => {
    if (pdfFile) {
      // Create object URL for the PDF file
      const url = URL.createObjectURL(pdfFile);
      setPdfUrl(url);

      // Cleanup function to revoke object URL when component unmounts or PDF changes
      return () => {
        URL.revokeObjectURL(url);
        setPdfUrl(null);
      };
    } else {
      setPdfUrl(null);
    }
  }, [pdfFile]);

  // Format study date for display
  const formatStudyDate = () => {
    if (!studyDate) return '';

    const dateTimeStr = studyTime ? `${studyDate} ${studyTime}` : studyDate;
    const formats = [
      'YYYYMMDD HHmmss.SSS',
      'YYYYMMDD HHmmss',
      'YYYYMMDD HHmm',
      'YYYYMMDD HH',
      'YYYYMMDD',
      'YYYY.MM.DD HHmmss.SSS',
      'YYYY.MM.DD HHmmss',
      'YYYY.MM.DD HHmm',
      'YYYY.MM.DD HH',
      'YYYY.MM.DD',
    ];

    const parsed = moment(dateTimeStr, formats, true);
    if (parsed.isValid()) {
      return parsed.format('YYYY-MM-DD hh:mm A');
    }

    // Fallback: try to format date and time separately
    let formattedDate = '';
    if (moment(studyDate, ['YYYYMMDD', 'YYYY.MM.DD'], true).isValid()) {
      formattedDate = moment(studyDate, ['YYYYMMDD', 'YYYY.MM.DD']).format('YYYY-MM-DD');
    } else {
      formattedDate = studyDate;
    }

    let formattedTime = '';
    if (studyTime && moment(studyTime, ['HH', 'HHmm', 'HHmmss', 'HHmmss.SSS']).isValid()) {
      formattedTime = moment(studyTime, ['HH', 'HHmm', 'HHmmss', 'HHmmss.SSS']).format('hh:mm A');
    }

    return `${formattedDate} ${formattedTime}`.trim();
  };

  // Hide the component if no PDF is selected
  if (!pdfFile || !pdfUrl || !studyInstanceUid) {
    return null;
  }

  const displayPatientName = patientName || '-';
  const displayPatientId = patientId || '-';
  const displayStudyDate = formatStudyDate();

  return (
    <div className="flex h-full w-full flex-col bg-black">
      {/* PDF Viewer Header */}
      <div className="flex items-center justify-between border-b border-secondary-light bg-secondary-dark px-4 py-2">
        <div className="flex items-center gap-3">
          <Icons.ByName name="document" className="h-5 w-5 text-primary-light" />
          <div>
            <h3 className="text-sm font-semibold text-white">
              Report for {displayPatientName} ({displayPatientId}), {displayStudyDate}
            </h3>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-secondary-main"
          title="Close PDF Viewer"
        >
          <Icons.Close className="h-5 w-5" />
        </Button>
      </div>

      {/* PDF Viewer Content */}
      <div className="flex-1 overflow-hidden">
        <iframe
          ref={iframeRef}
          src={pdfUrl}
          className="h-full w-full border-0"
          title="PDF Viewer"
          style={{ minHeight: '100%' }}
        />
      </div>
    </div>
  );
}

export default PdfViewer;
