/**
 * Utility functions for client-side image processing and thumbnails.
 * Compresses uploaded images to lightweight data URLs for local persistence.
 */

/**
 * Resizes and compresses an image File to a base64 JPEG thumbnail.
 * @param {File} file
 * @param {number} maxDimension - maximum width or height in px (default 400)
 * @param {number} quality - JPEG compression quality 0-1 (default 0.82)
 * @returns {Promise<string>}
 */
export function fileToThumbnail(file, maxDimension = 600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Il file selezionato non è un\'immagine valida.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Errore durante la lettura del file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Errore durante il caricamento dell\'immagine.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result);
          return;
        }

        // Draw image smoothed
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Sample SVG thumbnail for mechanical machined part (Flangia / Piastra)
 */
export const SAMPLE_PART_THUMBNAILS = {
  flangia: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="320" height="180" fill="%23f1f5f9"/><circle cx="160" cy="90" r="70" fill="%23cbd5e1" stroke="%23475569" stroke-width="3.5"/><circle cx="160" cy="90" r="32" fill="%23ffffff" stroke="%23475569" stroke-width="3.5"/><circle cx="160" cy="40" r="7" fill="%23475569"/><circle cx="160" cy="140" r="7" fill="%23475569"/><circle cx="110" cy="90" r="7" fill="%23475569"/><circle cx="210" cy="90" r="7" fill="%23475569"/><line x1="80" y1="90" x2="240" y2="90" stroke="%2394a3b8" stroke-dasharray="4,4"/><line x1="160" y1="10" x2="160" y2="170" stroke="%2394a3b8" stroke-dasharray="4,4"/></svg>`,
  piastra: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="320" height="180" fill="%23f1f5f9"/><rect x="70" y="30" width="180" height="120" rx="6" fill="%23cbd5e1" stroke="%23334155" stroke-width="3.5"/><circle cx="95" cy="50" r="6" fill="%23334155"/><circle cx="225" cy="50" r="6" fill="%23334155"/><circle cx="95" cy="130" r="6" fill="%23334155"/><circle cx="225" cy="130" r="6" fill="%23334155"/><rect x="125" y="65" width="70" height="50" rx="4" fill="%23ffffff" stroke="%23334155" stroke-width="2.5"/></svg>`,
};
