import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: {
    type: String,
    enum: [
      "Phones",
      "Computers",
      "SmartWatch",
      "Camera",
      "HeadPhones",
      "Gaming",
      "Men Fashion",
      "Women Fashion",
      "Medicine",
    ],
    required: true,
  },
  price: { type: Number, required: true },
  description: { type: String, required: true },
  discount: { type: Number },
  discountPrice: { type: Number },
  color: [{ type: String }],
  sizes: [{ type: String, enum: ["Sm", "Md", "Lg", "Xl"] }],
  review: { type: Number },
  rating: { type: Number },
  image: [{ type: String, required: true }],
});

const Item = mongoose.model("Item", ItemSchema);
export default Item;
