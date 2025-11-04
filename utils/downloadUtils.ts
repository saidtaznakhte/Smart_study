
/**
 * Triggers the browser's print dialog to save content as a PDF.
 * It creates a hidden iframe, injects styled HTML, and calls the print method.
 * @param htmlContent The HTML string to be printed.
 * @param documentTitle The default filename for the saved PDF.
 */
export const printToPdf = (htmlContent: string, documentTitle: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    console.error("Could not access iframe document.");
    document.body.removeChild(iframe);
    return;
  }

  // Basic styling to make the PDF look good
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    body {
      font-family: 'Inter', sans-serif;
      margin: 2rem;
      line-height: 1.6;
      color: #333;
    }
    h1, h2, h3 {
        color: #1a202c;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 0.3em;
        margin-bottom: 0.5em;
    }
    code {
        background-color: #f7fafc;
        padding: 0.2em 0.4em;
        border-radius: 3px;
    }
    blockquote {
        border-left: 4px solid #cbd5e0;
        padding-left: 1em;
        color: #718096;
        margin-left: 0;
    }
    ul, ol {
        padding-left: 1.5em;
    }
    a {
        color: #4c51bf;
        text-decoration: none;
    }
  `;

  doc.open();
  doc.write(`
    <html>
      <head>
        <title>${documentTitle}</title>
        <style>${styles}</style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `);
  doc.close();

  // Use a timeout to ensure content is fully loaded before printing
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    // Clean up the iframe after a delay
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 500);
};
