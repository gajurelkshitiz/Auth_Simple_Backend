import fs from "fs";
import mongoose from "mongoose";
import path from "path";
import Item from "../models/item.js";
import Category from "../models/category.js";
import { emitToRestaurant } from "../utils/socket.js";

const isAdmin = (role) => role === "admin";
const isManager = (role) => role === "manager";

const ensureRestaurant = (req, res) => {
  const restaurantId = req.user?.restaurantId;
  if (!restaurantId) {
    res.status(400).json({ error: "Restaurant context missing in token" });
    return null;
  }
  return restaurantId;
};

const safeUnlink = (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, (err) => {
    if (err) console.warn("[ITEM] unlink failed:", filePath, err.message);
  });
};

const parseVariants = (raw) => {
  if (!raw) return null;

  let v = raw;
  if (typeof raw === "string") {
    try {
      v = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!Array.isArray(v)) return null;

  const cleaned = v
    .map((x) => {
      const quantity = Number(x?.quantity);
      const price = Number(x?.price);
      const conversionFactor = Number(x?.conversionFactor) || 1;

      return {
        unit: (x?.unit ?? "").toString().trim(),
        quantity: Number.isNaN(quantity) ? null : quantity,
        price: Number.isNaN(price) ? null : price,
        conversionFactor,
      };
    })
    .filter(
      (x) =>
        x.unit &&
        x.quantity !== null &&
        x.quantity >= 0 &&
        x.price !== null &&
        x.price >= 0
    );

  return cleaned.length ? cleaned : null;
};

export const createItem = async (req, res) => {
  try {
    const role = req.user?.role;
    if (!(isAdmin(role) || isManager(role))) {
      return res
        .status(403)
        .json({ error: "Only admin/manager can create items" });
    }

    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { name, description, available, categoryId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Item name is required" });
    }

    const variants = parseVariants(
      req.body.variants ?? req.body["variants[]"] ?? req.body.variant
    );
    if (!variants) {
      return res.status(400).json({
        error:
          "Invalid variants. Send an array of {unit,quantity, price,conversionFactor}. For multipart, send JSON string in 'variants'.",
      });
    }

    let categoryDoc = null;
    if (categoryId) {
      categoryDoc = await Category.findOne({
        _id: categoryId,
        restaurant: restaurantId,
      });
      if (!categoryDoc) {
        return res.status(400).json({ error: "Invalid category ID" });
      }
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : undefined;

    const item = await Item.create({
      name: name.trim(),
      description: (description ?? "").toString(),
      image: imagePath,
      variants,
      category: categoryDoc ? categoryDoc._id : null,
      available:
        typeof available === "string"
          ? available.toLowerCase() === "true"
          : available ?? true,
      restaurant: restaurantId,
      createdBy: req.user.userId,
      createdByRole: req.user.role,
    });

    const itemPopulated = await Item.findById(item._id).populate(
      "category",
      "name"
    );
    emitToRestaurant(req, restaurantId, "itemCreated", { item: itemPopulated });

    res.status(201).json({ message: "Item created", item: itemPopulated });
  } catch (err) {
    console.error("[ITEM create]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getItems = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { q } = req.query;
    const filter = { restaurant: restaurantId };
    if (q && q.toString().trim()) {
      filter.name = { $regex: q.toString().trim(), $options: "i" };
    }

    const items = await Item.find(filter)
      .populate("category", "name")
      .sort({ createdAt: -1 });
    res.status(200).json({ items });
  } catch (err) {
    console.error("[ITEM list]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getItemById = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;
    const item = await Item.findOne({
      _id: id,
      restaurant: restaurantId,
    }).populate("category", "name");
    if (!item) return res.status(404).json({ error: "Item not found" });

    res.status(200).json({ item });
  } catch (err) {
    console.error("[ITEM getById]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateItem = async (req, res) => {
  try {
    const role = req.user?.role;
    if (!(isAdmin(role) || isManager(role))) {
      return res
        .status(403)
        .json({ error: "Only admin/manager can update items" });
    }

    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;
    const existing = await Item.findOne({ _id: id, restaurant: restaurantId });
    if (!existing) return res.status(404).json({ error: "Item not found" });

    const { name, description, available, removeImage, categoryId } = req.body;

    if (categoryId) {
      const categoryDoc = await Category.findOne({
        _id: categoryId,
        restaurant: restaurantId,
      });
      if (!categoryDoc)
        return res.status(400).json({ error: "Invalid category ID" });
      existing.category = categoryDoc._id;
    }

    let newImagePath = existing.image;
    if (req.file) {
      if (existing.image) {
        const abs = path.join(process.cwd(), existing.image.replace(/^\//, ""));
        safeUnlink(abs);
      }
      newImagePath = `/uploads/${req.file.filename}`;
    } else if (removeImage === "true") {
      if (existing.image) {
        const abs = path.join(process.cwd(), existing.image.replace(/^\//, ""));
        safeUnlink(abs);
      }
      newImagePath = undefined;
    }

    const parsedVariants = parseVariants(
      req.body.variants ?? req.body["variants[]"] ?? req.body.variant
    );
    if (parsedVariants) existing.variants = parsedVariants;

    if (name !== undefined) existing.name = name.toString().trim();
    if (description !== undefined)
      existing.description = description.toString();
    if (available !== undefined)
      existing.available =
        typeof available === "string"
          ? available.toLowerCase() === "true"
          : Boolean(available);

    existing.image = newImagePath;

    const updated = await existing.save();

    const updatedPopulated = await Item.findById(updated._id).populate(
      "category",
      "name"
    );

    emitToRestaurant(req, restaurantId, "itemUpdated", {
      item: updatedPopulated,
    });
    res.status(200).json({ message: "Item updated", item: updatedPopulated });
  } catch (err) {
    console.error("[ITEM update]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const role = req.user?.role;
    if (!(isAdmin(role) || isManager(role))) {
      return res
        .status(403)
        .json({ error: "Only admin/manager can delete items" });
    }

    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;
    const deleted = await Item.findOneAndDelete({
      _id: id,
      restaurant: restaurantId,
    });
    if (!deleted) return res.status(404).json({ error: "Item not found" });

    if (deleted.image) {
      const abs = path.join(process.cwd(), deleted.image.replace(/^\//, ""));
      safeUnlink(abs);
    }

    emitToRestaurant(req, restaurantId, "itemDeleted", { itemId: id });

    res.status(200).json({ message: "Item deleted" });
  } catch (err) {
    console.error("[ITEM delete]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getItemsByCategory = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { categoryId } = req.params;

    if (!categoryId.match(/^[a-f\d]{24}$/i)) {
      return res.status(400).json({ error: "Invalid category ID format" });
    }

    const category = await Category.findById(categoryId);
    if (!category) return res.status(404).json({ error: "Category not found" });

    const items = await Item.find({
      category: categoryId,
      restaurant: req.user.restaurantId,
    })
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ items });
  } catch (err) {
    console.error("[GET ITEMS BY CATEGORY ERROR]", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const getDistinctQuantities = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const quantities = await Item.aggregate([
      { $match: { restaurant: new mongoose.Types.ObjectId(restaurantId) } },
      { $unwind: "$variants" },
      { $group: { _id: "$variants.quantity" } },
      { $project: { _id: 0, quantity: "$_id" } },
      { $sort: { quantity: 1 } },
    ]);

    res.status(200).json({ quantities: quantities.map((q) => q.quantity) });
  } catch (err) {
    console.error("[GET DISTINCT QUANTITIES]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const getDistinctUnits = async (req, res) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ error: "Restaurant context missing" });
    }

    const result = await Item.aggregate([
      { $match: { restaurant: new mongoose.Types.ObjectId(restaurantId) } },
      { $unwind: "$variants" },
      {
        $group: {
          _id: null,
          units: { $addToSet: "$variants.unit" },
        },
      },
      {
        $project: {
          _id: 0,
          units: 1,
        },
      },
    ]);

    const data = result[0] || { units: [] };

    res.status(200).json({
      units: data.units.sort(),
    });
  } catch (err) {
    console.error("[GET DISTINCT UNITS]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
