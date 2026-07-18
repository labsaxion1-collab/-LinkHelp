const MAX_AVATAR_SIDE = 512;

/** Center-crop square avatar from image file */
export function cropSquareAvatarFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = MAX_AVATAR_SIDE;
        canvas.height = MAX_AVATAR_SIDE;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('CANVAS'));
          return;
        }
        ctx.drawImage(img, sx, sy, size, size, 0, 0, MAX_AVATAR_SIDE, MAX_AVATAR_SIDE);
        const data = canvas.toDataURL('image/jpeg', 0.88);
        URL.revokeObjectURL(url);
        if (data.length > 900_000) {
          reject(new Error('AVATAR_TOO_LARGE'));
          return;
        }
        resolve(data);
      } catch {
        URL.revokeObjectURL(url);
        reject(new Error('CROP'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('LOAD'));
    };
    img.src = url;
  });
}
