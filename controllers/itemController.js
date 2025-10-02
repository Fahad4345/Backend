import Item from "../models/Item.js";

import express from "express";

const router = express.Router();

export const InsertItem = async (req, res) => {


  try {
    const {
      name,
      category,
      price,
      description,
      color,
      sizes,
      review,
      rating,
      discount,
      e,
    } = req.body;

    console.log("Extracted fields:", {
      name,
      category,
      price,
      description,
      color,
      sizes,
      review,
      rating,
      discount,
    });

    // Handle arrays (they're already arrays from FormData)
    const colorArray = Array.isArray(color) ? color : color ? [color] : [];
    const sizesArray = Array.isArray(sizes) ? sizes : sizes ? [sizes] : [];

    const images =
      req.files && req.files.length > 0
        ? req.files.map((file) => file.path)
        : [];

    console.log("📸 Images:", images);
    console.log("🎨 Colors:", colorArray);
    console.log("📏 Sizes:", sizesArray);

    let discountPrice = null;
    if (discount && price) {
      discountPrice = price - (price * discount) / 100;
    }

    let item = new Item({
      name: name,
      discount: discount,
      category: category,
      price: price,
      discountPrice: discountPrice,
      description: description,
      color: colorArray, // use the array
      sizes: sizesArray, // use the array
      review: review,
      rating: rating,
      image: images,
    });

    await item.save();
    console.log("✅ Item saved successfully");
    res.status(201).json({ message: "Item Added Successfully", item });
  } catch (err) {
    console.error(" Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const DeleteItem = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      console.log("Delete Item Called without ID");
      return res.status(400).json({ message: "Item Id Required" });
    }
    const item = await Item.findByIdAndDelete(id);
    if (!item) {
      console.log("Item not found");
      return res.status(404).json({ message: "Item not found" });
    }
    res.json({ success: true, message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete item" });
  }
};

export const UpdateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const updatedItem = await Item.findByIdAndUpdate(
      id,
      {
        name: body.name.trim(),
        description: body.description || "",
        price: parseFloat(body.price),
        sizes: body.sizes,
        color: body.color,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ error: "Item not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Item updated successfully",
      item: updatedItem,
    });
  } catch (error) {
    console.error("Error updating item:", error);
    return res.status(500).json({
      error: "Failed to update item",
      details: error.message,
    });
  }
};

export const GetItem = async (req, res) => {
  try {
    const { Category } = req.query;
    let item;

    if (Category) {
      item = await Item.find({ category: Category });
    } else {
      item = await Item.find();
    }

    res.status(201).json({ message: "Item Fetched Sucessfully", item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getOneItem = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Item Id Required" });
    }
    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.status(200).json({ message: "Item fetched successfully", item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export default router;
