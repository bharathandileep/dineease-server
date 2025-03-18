import cloudinary from "../../config/uploadFile";

export const uploadFileToCloudinary = async (
  fileBuffer: Buffer,
  folder: string = "uploads"
): Promise<string | null> => {
  try {
    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${fileBuffer.toString("base64")}`,
      {
        folder,
        resource_type: "auto",
      }
    );
    return result.secure_url;
  } catch (error) {
    console.error("Upload error:", error);
    return null;
  }
};
 
export const deleteFromCloudinary = async (
  publicId: string
): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Delete error:", error);
    return false;
  }
};
