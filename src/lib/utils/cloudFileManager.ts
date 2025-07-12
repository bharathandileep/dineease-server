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
  input: string 
): Promise<boolean> => {
  try {
    let publicId = input;
    if (input.includes("cloudinary.com")) {
      const parts = input.split("/");
      const filename = parts.pop(); 
      if (!filename) return false;
      const nameOnly = filename.split(".")[0]; 
      const folder = parts.slice(parts.indexOf("upload") + 1).join("/"); 
      publicId = `${folder}/${nameOnly}`;
    }

    const result = await cloudinary.uploader.destroy(publicId);

    return result.result === "ok";
  } catch (error) {
    console.error("Delete error:", error);
    return false;
  }
};

