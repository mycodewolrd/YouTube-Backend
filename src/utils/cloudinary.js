import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";
// Configure cloudinary

dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadCloudinary = async (localFilePath) => {
  try {
    console.log("Cloudinary Config: ", {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log(`File uploaded on Cloudinary , File src : ${response.url}`);
    // once the file is uploaded , we would like to delete from the server
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    console.error("Error On Cloudinary", error);

    fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteFormCloudinary = async (PublicId) => {
  try {
   const result =  cloudinary.uploader.destroy(PublicId);
    console.log("Deleted From cloudinary,Public ID" , result,PublicId);
    return result;
  } catch (error) {
    console.warn("Error Deleting From Cloudinary", error);
    return null;
  }
};

export { uploadCloudinary,deleteFormCloudinary };
