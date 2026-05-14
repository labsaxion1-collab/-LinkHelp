/** Client-side compression, thumbnails, avatar crop — replace with worker/CDN in production. */

const MAX_VIDEO_SEC = 30;
const MAX_AVATAR_SIDE = 512;
const MAX_THUMB_WIDTH = 240;
const JPEG_QUALITY = 0.82;

export function assertVideoDuration(file: File, maxSec = MAX_VIDEO_SEC): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const d = v.duration;
      if (!Number.isFinite(d) || d <= 0) {
        reject(new Error('INVALID_VIDEO'));
        return;
      }
      if (d > maxSec + 0.5) {
        reject(new Error('VIDEO_TOO_LONG'));
        return;
      }
      resolve(d);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('VIDEO_LOAD'));
    };
    v.src = url;
  });
}

export function captureVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    v.playsInline = true;
    v.onloadeddata = () => {
      try {
        v.currentTime = Math.min(0.3, (v.duration || 1) * 0.1);
      } catch {
        URL.revokeObjectURL(url);
        reject(new Error('VIDEO_SEEK'));
      }
    };
    v.onseeked = () => {
      try {
        const w = v.videoWidth;
        const h = v.videoHeight;
        const canvas = document.createElement('canvas');
        const scale = MAX_THUMB_WIDTH / w;
        canvas.width = MAX_THUMB_WIDTH;
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('CANVAS'));
          return;
        }
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/jpeg', 0.72);
        URL.revokeObjectURL(url);
        resolve(data);
      } catch {
        URL.revokeObjectURL(url);
        reject(new Error('THUMB'));
      }
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('VIDEO'));
    };
    v.src = url;
    v.load();
  });
}

export function compressImageFileToDataUrl(file: File, maxSide = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        let { width, height } = img;
        const scale = Math.min(1, maxSide / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('CANVAS'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const data = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        URL.revokeObjectURL(url);
        resolve(data);
      } catch {
        URL.revokeObjectURL(url);
        reject(new Error('IMAGE'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('IMAGE_LOAD'));
    };
    img.src = url;
  });
}

export function imageToThumbDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.width;
        const h = img.height;
        const scale = MAX_THUMB_WIDTH / w;
        const canvas = document.createElement('canvas');
        canvas.width = MAX_THUMB_WIDTH;
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('CANVAS'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      } catch {
        reject(new Error('THUMB'));
      }
    };
    img.onerror = () => reject(new Error('IMG'));
    img.src = dataUrl;
  });
}

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

export { MAX_VIDEO_SEC };
