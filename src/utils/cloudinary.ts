import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  bytes: number;
}

/**
 * Upload file to Cloudinary
 * @param filePath - Path to the file to upload
 * @param folder - Optional folder name in Cloudinary
 * @returns Upload result with public_id and secure_url
 */
export const uploadToCloudinary = async (
  filePath: string,
  folder: string = "help-around"
): Promise<CloudinaryUploadResult> => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "auto",
    });

    // Delete local file after successful upload
    fs.unlinkSync(filePath);

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    // Delete local file if upload fails
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
};

/**
 * Delete file from Cloudinary
 * @param publicId - Public ID of the file to delete
 * @returns Deletion result
 */
export const deleteFromCloudinary = async (
  publicId: string
): Promise<{ result: string }> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Get file from Cloudinary
 * @param publicId - Public ID of the file
 * @returns Cloudinary resource details
 */
export const getCloudinaryResource = async (publicId: string) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    throw error;
  }
};
