import imageCompression from 'browser-image-compression';

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 800,
  useWebWorker: true,
  initialQuality: 0.8,
};

// Threshold in bytes above which to show a warning (5MB)
const LARGE_IMAGE_THRESHOLD = 5 * 1024 * 1024;

export type CompressionResult = {
  base64: string;
  wasLargeImage: boolean;
  originalSize: number;
  compressedSize: number;
};

/**
 * Compress an image file and convert to base64 data URL.
 * Uses web worker to avoid blocking the UI thread.
 * Returns base64 string and metadata about compression.
 */
export async function compressImage(file: File): Promise<CompressionResult> {
  const originalSize = file.size;
  const wasLargeImage = originalSize > LARGE_IMAGE_THRESHOLD;

  const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(compressedFile);
  });

  return {
    base64,
    wasLargeImage,
    originalSize,
    compressedSize: compressedFile.size,
  };
}

/**
 * Convert an image URL to base64 by fetching and compressing.
 * Used when user pastes an image URL instead of uploading a file.
 */
export async function compressImageFromUrl(url: string): Promise<CompressionResult> {
  const response = await fetch(url);
  const blob = await response.blob();
  const file = new File([blob], 'pasted-image', { type: blob.type || 'image/jpeg' });
  return compressImage(file);
}
