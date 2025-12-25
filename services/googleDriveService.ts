
export class GoogleDriveService {
  /**
   * Extracts the File ID from various Google Drive URL formats.
   */
  static getFileId(urlOrId: string): string {
    const idMatch = urlOrId.match(/(?:id=|\/d\/|folders\/|file\/d\/)([a-zA-Z0-9_-]{25,})/);
    return idMatch ? idMatch[1] : urlOrId;
  }

  /**
   * Fetches a PDF from Google Drive, handling virus scan warnings for large files.
   */
  static async fetchPdf(urlOrId: string): Promise<Blob> {
    const fileId = this.getFileId(urlOrId);
    const proxyBase = "https://api.allorigins.win/raw?url=";
    const driveBase = `https://drive.google.com/uc?export=download&id=${fileId}`;
    
    try {
      // Step 1: Initial fetch attempt
      let response = await fetch(`${proxyBase}${encodeURIComponent(driveBase)}`);
      
      if (!response.ok) {
        throw new Error(`Cloud storage returned ${response.status}`);
      }

      // Check if we hit the "Virus Scan Warning" page
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        const html = await response.text();
        
        // Look for the confirmation token in the HTML (usually in a hidden input or link)
        const confirmTokenMatch = html.match(/confirm=([a-zA-Z0-9_-]+)/);
        if (confirmTokenMatch && confirmTokenMatch[1]) {
          const confirmedUrl = `${driveBase}&confirm=${confirmTokenMatch[1]}`;
          console.log("Large file detected, retrying with confirmation token...");
          
          const retryResponse = await fetch(`${proxyBase}${encodeURIComponent(confirmedUrl)}`);
          if (!retryResponse.ok) throw new Error("Failed to confirm large file download.");
          return await retryResponse.blob();
        }
      }

      return await response.blob();
    } catch (error) {
      console.error("Google Drive Fetch Error:", error);
      throw error;
    }
  }
}
