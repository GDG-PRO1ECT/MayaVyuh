import imageCompression from "browser-image-compression";

const COMPRESSION_OPTIONS = {
  maxSizeMB: Infinity,
  maxWidthOrHeight: 1920,
  fileType: "image/jpeg",
  initialQuality: 0.8,
  useWebWorker: true,
};

export async function compressImage(file) {
  try {
    return await imageCompression(file, COMPRESSION_OPTIONS);
  } catch (err) {
    console.error("Client-side image compression failed, uploading original file:", err);
    return file;
  }
}
