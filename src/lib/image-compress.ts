// Client-side screenshot-compressie.
//
// Vercel Hobby plan heeft een 4.5 MB limit op request-body. Een PNG-
// screenshot van een lange desktop-pagina kan al 5-10 MB zijn, base64-
// encoded nog groter (≈4/3). Daarom comprimeren we hier in de browser
// vóór upload: resize naar max 1600px breed + JPEG met variabele
// kwaliteit tot we onder de target-grootte zitten.
//
// Voor UX-audits is verlies van wat fotografische detail prima — Claude
// kijkt naar layout, kleuren, typografie, knop-prominentie. Niet naar
// JPEG-artefacten in een gradient.

const MAX_DIMENSION_PX = 1600;
const TARGET_BYTES = 900 * 1024; // 900 KB → 5 screens = ~4.5 MB safe-ish
const MIN_QUALITY = 0.4;

export type CompressedScreenshot = {
  base64: string;
  type: 'image/jpeg';
};

async function fileToImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Kan afbeelding niet laden.'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // data:image/jpeg;base64,XYZ → "XYZ"
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(new Error('Kan blob niet omzetten.'));
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas leeg.'))),
      'image/jpeg',
      quality
    );
  });
}

/**
 * Comprimeert een uploaded screenshot tot onder TARGET_BYTES via resize +
 * JPEG-kwaliteit. Geeft base64-string terug (zonder data-URL prefix).
 */
export async function compressScreenshot(file: File): Promise<CompressedScreenshot> {
  const img = await fileToImage(file);

  // Resize naar max-dim als breder
  let width = img.naturalWidth;
  let height = img.naturalHeight;
  if (width > MAX_DIMENSION_PX) {
    height = Math.round(height * (MAX_DIMENSION_PX / width));
    width = MAX_DIMENSION_PX;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas-context niet beschikbaar.');
  }
  ctx.drawImage(img, 0, 0, width, height);

  // Probeer afnemende kwaliteiten tot onder target
  let quality = 0.92;
  let blob = await canvasToBlob(canvas, quality);

  while (blob.size > TARGET_BYTES && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - 0.1);
    blob = await canvasToBlob(canvas, quality);
  }

  const base64 = await blobToBase64(blob);
  return { base64, type: 'image/jpeg' };
}
