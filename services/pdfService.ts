
import { BookPage } from '../types';

export class PDFService {
  static async convertPdfToImages(
    file: File,
    onChunk: (pages: BookPage[], progress: number, isComplete: boolean) => void,
    chunkSize: number = 20
  ): Promise<void> {
    const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let currentChunk: BookPage[] = [];
    const totalPages = pdf.numPages;

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 }); // Balanced for speed and OCR
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        const driveId = `custom-${file.name}-${i}-${file.size}`;
        
        currentChunk.push({
          id: i,
          driveId: driveId,
          title: `Custom PDF - Page ${i}`,
          imageUrl: imageUrl,
          category: "Custom Upload"
        });
      }

      // If we hit the chunk size or the last page, send the update
      if (i % chunkSize === 0 || i === totalPages) {
        const progress = (i / totalPages) * 100;
        const isComplete = i === totalPages;
        onChunk([...currentChunk], progress, isComplete);
        currentChunk = []; // Reset chunk for next batch
      }
    }
  }
}
