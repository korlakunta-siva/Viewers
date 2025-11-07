/**
 * Script to generate PDF version of help documentation
 * This script extracts content from helpContent.tsx and creates a PDF file
 */

const fs = require('fs');
const path = require('path');

// Help content extracted from helpContent.tsx
const helpContent = {
  title: 'Apex Medical Image Viewer - User Manual',
  sections: [
    {
      title: 'Introduction',
      content: `Welcome to Apex Medical Image Viewer

Apex Medical Image Viewer is a web-based DICOM image viewer that allows you to view medical images locally in your browser. Your data remains on your device and is never uploaded to any server.

Apex Medical Image Viewer is built using the Open Health Imaging Foundation (OHIF) Viewer, an open-source web-based imaging platform. For more information about OHIF, visit https://ohif.org or the OHIF GitHub repository at https://github.com/OHIF/Viewers.`
    },
    {
      title: 'Loading DICOM Images',
      content: `You can load DICOM images into the viewer in several ways:`,
      subsections: [
        {
          title: '1. Upload Encrypted ZIP File',
          content: `If your DICOM images are in a password-protected ZIP archive:

• Click the lock icon in the app bar or select "Upload Encrypted ZIP" from the settings menu
• Select your encrypted ZIP file
• Enter the password when prompted
• The viewer will extract and load DICOM files automatically
• Your images will appear in the study list

Note: The viewer supports both ZipCrypto and AES-256 encrypted ZIP files. For maximum security, use AES-256 encryption when creating your ZIP archives.`
        },
        {
          title: '2. Upload DICOM Folder',
          content: `To load multiple DICOM files from a folder:

• Click the folder icon in the app bar or select "Upload Folder" from the settings menu
• Select the folder containing your DICOM files
• The viewer will scan the folder and load all DICOM files
• A progress indicator will show the loading status
• Your studies will appear in the study list when loading is complete`
        },
        {
          title: '3. Upload Individual DICOM Files',
          content: `To load specific DICOM files:

• Click the file icon in the app bar or select "Upload File" from the settings menu
• Select one or more DICOM files (hold Ctrl/Cmd to select multiple)
• The viewer will load the selected files
• Your studies will appear in the study list`
        },
        {
          title: '4. Drag and Drop',
          content: `You can also drag and drop files or folders directly onto the viewer:

• Navigate to the /local page
• Drag DICOM files or folders from your file explorer
• Drop them onto the upload area
• The viewer will automatically load the files`
        }
      ]
    },
    {
      title: 'Viewing Images',
      content: `Once your DICOM images are loaded:

• Your studies will appear in the study list
• Click the "View" button next to a study to open it in the viewer
• Use the viewer tools to adjust window/level, zoom, pan, and more
• For multiframe studies (cine loops), the animation will play automatically by default
• You can control playback using the cine player controls at the bottom of the viewport`
    },
    {
      title: 'Viewing Study Reports',
      content: `Some studies may include PDF reports. Here's how to view them:

Accessing Reports:
• In the study list, look for the "Report" column
• Studies with available reports will display a document icon in this column
• Click the document icon to view the report
• The report will appear in the PDF viewer section below the study list
• The report header shows: "Report for [Patient Name] ([ID]), [Study Date]"

Report Viewer Features:
• The PDF report is displayed in a dedicated viewer section
• Use the browser's built-in PDF controls to navigate pages, zoom, and print
• Click the close button (X) in the report header to hide the report viewer
• Click the document icon again to toggle the report viewer on/off

Report File Naming:
PDF reports should be named using one of these formats:
• {studyid}.pdf - Direct study ID (e.g., 1.2.840.113619.2.297.51033.1756108505.0.494.pdf)
• study-{uuid}.pdf - With prefix (e.g., study-1.2.840.113619.2.297.51033.1756108505.0.494.pdf)

Note: The study ID in the PDF filename must exactly match the Study Instance UID from the DICOM files for the report to be associated with the correct study.`
    },
    {
      title: 'Extracting DICOM Files for Other Applications',
      content: `If you need to extract DICOM files from an encrypted ZIP archive for use in other applications (such as PACS systems, EMR systems, or other DICOM viewers):

Using the Extract Tool:
• Click the settings gear icon in the app bar
• Select "Extract DICOM from Encrypted ZIP" from the menu
• In the dialog that appears:
  - Click "Choose ZIP File" and select your encrypted ZIP file
  - Enter the password and click "Validate" to verify the password
  - Click "Choose Folder" and select where you want to save the extracted files
  - Click "Extract" to begin extraction
• Wait for the extraction to complete (a progress bar will show the status)
• Once complete, the extracted DICOM files will be in the folder you selected
• You can now import these files into your PACS, EMR, or other DICOM-compatible application

Note: Folder selection requires Chrome or Edge browser. The extracted files maintain their original directory structure from the ZIP archive.`
    },
    {
      title: 'Preferences',
      content: `Customize your viewing experience:

• Click the settings gear icon in the app bar
• Select "Preferences"
• Adjust settings such as:
  - Auto-play Cine: Automatically play animations for multiframe instances
  - Language: Change the application language
  - Hotkeys: Customize keyboard shortcuts
• Click "Save" to apply your preferences`
    },
    {
      title: 'Tips & Best Practices',
      content: `• For best performance, upload DICOM files in batches rather than one at a time
• Use encrypted ZIP files (AES-256) for secure storage and distribution of medical images
• The viewer works entirely in your browser - no data is sent to external servers
• All loaded images are stored in browser memory and will be cleared when you close the browser
• For large studies, be patient during the initial loading process
• You can load multiple studies and switch between them using the study list
• PDF reports are automatically associated with studies when the filename matches the study ID`
    },
    {
      title: 'Need More Help?',
      content: `For additional assistance or technical support, please contact your system administrator or refer to the application documentation.`
    }
  ]
};

// Generate PDF using pdfkit
const PDFDocument = require('pdfkit');

const publicDir = path.join(__dirname, '../public');
const outputPath = path.join(publicDir, 'readme-help.pdf');

const doc = new PDFDocument({
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  info: {
    Title: helpContent.title,
    Author: 'Apex Medical Image Viewer',
    Subject: 'User Manual',
    Creator: 'Apex Medical Image Viewer'
  }
});

const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Title
doc.fontSize(20).font('Helvetica-Bold').text(helpContent.title, { align: 'center' });
doc.moveDown(2);

// Sections
helpContent.sections.forEach((section, index) => {
  // Section title
  doc.fontSize(16).font('Helvetica-Bold').text(section.title);
  doc.moveDown(0.5);

  // Section content
  doc.fontSize(11).font('Helvetica').text(section.content, {
    align: 'left',
    paragraphGap: 5
  });
  doc.moveDown(1);

  // Subsections
  if (section.subsections) {
    section.subsections.forEach(subsection => {
      doc.fontSize(13).font('Helvetica-Bold').text(subsection.title);
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica').text(subsection.content, {
        align: 'left',
        paragraphGap: 5
      });
      doc.moveDown(1);
    });
  }

  // Page break between major sections (except last)
  if (index < helpContent.sections.length - 1) {
    doc.addPage();
  }
});

doc.end();

stream.on('finish', () => {
  console.log(`✓ PDF generated successfully at: ${outputPath}`);
  console.log('  The PDF will be automatically copied to dist/ during build.');
});

stream.on('error', (err) => {
  console.error('✗ Error generating PDF:', err);
  process.exit(1);
});
