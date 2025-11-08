import crypto from "crypto";

/**
 * Generate a signature for Cloudinary signed uploads
 * @param {Object} params - Upload parameters to sign
 * @returns {string} - Hex signature
 */
export function generateCloudinarySignature(params) {
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiSecret) {
    throw new Error("CLOUDINARY_API_SECRET is not configured");
  }

  // Sort params alphabetically and build string
  const sortedKeys = Object.keys(params).sort();
  const stringToSign = sortedKeys
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  // Generate SHA-256 signature
  const signature = crypto
    .createHash("sha256")
    .update(stringToSign + apiSecret)
    .digest("hex");

  return signature;
}

/**
 * Generate signed upload parameters for Cloudinary
 * @param {Object} options - Upload options
 * @returns {Object} - Signed upload parameters
 */
export function generateUploadSignature(options = {}) {
  const timestamp = Math.round(Date.now() / 1000);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || "zpb-uploads";

  if (!cloudName || !apiKey) {
    throw new Error("Cloudinary credentials not configured");
  }

  // Build upload parameters
  const params = {
    timestamp,
    upload_preset: uploadPreset,
    folder: options.folder || process.env.CLOUDINARY_BASE_FOLDER || "uploads",
    ...options.extraParams,
  };

  // Generate signature
  const signature = generateCloudinarySignature(params);

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    uploadPreset,
    folder: params.folder,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
  };
}

/**
 * Build Cloudinary URL with transformations
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Transformation options
 * @returns {string} - Transformed URL
 */
export function buildCloudinaryUrl(publicId, options = {}) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error("CLOUDINARY_CLOUD_NAME not configured");
  }

  const { width, height, crop = "fill", quality = "auto", format = "auto" } = options;

  let transformation = [];
  if (width) transformation.push(`w_${width}`);
  if (height) transformation.push(`h_${height}`);
  if (crop) transformation.push(`c_${crop}`);
  if (quality) transformation.push(`q_${quality}`);
  if (format) transformation.push(`f_${format}`);

  const transformStr = transformation.length > 0 ? transformation.join(",") + "/" : "";

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformStr}${publicId}`;
}

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} - Public ID
 */
export function extractPublicId(url) {
  const match = url.match(/\/v\d+\/(.+)$/);
  return match ? match[1].split(".")[0] : null;
}

/**
 * Generate thumbnail URL for file preview
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - image, video, raw
 * @returns {string} - Thumbnail URL
 */
export function generateThumbnail(publicId, resourceType = "image") {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    return null;
  }

  if (resourceType === "video") {
    return `https://res.cloudinary.com/${cloudName}/video/upload/w_300,h_200,c_fill,q_auto/${publicId}.jpg`;
  }

  if (resourceType === "image") {
    return `https://res.cloudinary.com/${cloudName}/image/upload/w_300,h_200,c_fill,q_auto,f_auto/${publicId}`;
  }

  // For raw files (PDFs, docs, etc), return a generic icon or first page preview
  return `https://res.cloudinary.com/${cloudName}/image/upload/w_300,h_200,c_fill,q_auto,pg_1/${publicId}.jpg`;
}
