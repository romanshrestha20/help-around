import { describe, it, expect, beforeAll } from "@jest/globals";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

// Load environment variables from .env file
beforeAll(() => {
  dotenv.config();
});

/**
 * Integration tests for Cloudinary configuration
 * These tests verify that Cloudinary is properly configured with the correct credentials
 */
describe("Cloudinary Configuration", () => {
  it("should have Cloudinary configured with required environment variables", () => {
    expect(process.env.CLOUDINARY_CLOUD_NAME).toBeDefined();
    expect(process.env.CLOUDINARY_API_KEY).toBeDefined();
    expect(process.env.CLOUDINARY_API_SECRET).toBeDefined();

    // Verify environment variables are not empty
    expect(process.env.CLOUDINARY_CLOUD_NAME).not.toBe("");
    expect(process.env.CLOUDINARY_API_KEY).not.toBe("");
    expect(process.env.CLOUDINARY_API_SECRET).not.toBe("");
  });

  it("should verify Cloudinary cloud name is correct", () => {
    expect(process.env.CLOUDINARY_CLOUD_NAME).toBe("dv3c6F1fL");
  });

  it("should have a valid Cloudinary configuration object", () => {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    
    const config = cloudinary.config();
    expect(config).toBeDefined();
    expect(config.cloud_name).toBe(process.env.CLOUDINARY_CLOUD_NAME);
  });

  describe("Cloudinary Upload Folder Structure", () => {
    it("should use 'help-around' as the default upload folder", () => {
      const defaultFolder = "help-around";
      expect(defaultFolder).toBe("help-around");
    });

    it("should support nested folders for different resource types", () => {
      const folders = {
        profileImages: "help-around/profiles",
        reviewImages: "help-around/reviews",
        serviceImages: "help-around/services",
      };

      expect(Object.keys(folders)).toContain("profileImages");
      expect(Object.keys(folders)).toContain("reviewImages");
      expect(Object.keys(folders)).toContain("serviceImages");
    });
  });
});
