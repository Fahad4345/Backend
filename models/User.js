import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const CartItemSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Item",
  },

  color: { type: String },
  size: { type: String },

  quantity: { type: Number, default: 1 },
});

const UserSchema = new mongoose.Schema({
  Firstname: { type: String, required: true },
  Lastname: { type: String, required: true },
  Addresse: { type: String },
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, trim: true },
  resetPasswordTokenHash: String,
  resetPasswordExpires: Date,
  cart: [CartItemSchema],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Item" }],
});
UserSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});
const user = mongoose.model("User", UserSchema);
export default user;
