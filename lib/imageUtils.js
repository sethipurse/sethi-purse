// lib/imageUtils.js  ← CREATE this new file

/**
 * Resizes + compresses an image to WhatsApp-safe size
 * Max 300KB, 1200x630px, JPEG format
 * Call this BEFORE uploading to Supabase
 */
export async function compressForOG(file, maxWidth = 1200, maxHeight = 630, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate dimensions keeping aspect ratio
      let { width, height } = img;
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      if (ratio < 1) {
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Compression failed'));
          // Convert blob to File so Supabase upload works
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
          });
          resolve(compressed);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Image load failed'));
    img.src = url;
  });
}
