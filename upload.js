import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";

console.log("Before");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "items",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});
console.log("after");
const upload = multer({ storage });
console.log("After!");

export default upload;
