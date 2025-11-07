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

export const createCategory = async (req, res) => {
  try {
    const role = req.user?.role;
    if (!(isAdmin(role) || isManager(role))) {
      return res
        .status(403)
        .json({ error: "Only admin/manager can create categories" });
    }

    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const existing = await Category.findOne({
      name: name.trim(),
      restaurant: restaurantId,
    });
    if (existing) {
      return res.status(400).json({ error: "Category already exists" });
    }

    const category = await Category.create({
      name: name.trim(),
      description: (description ?? "").toString().trim(),
      restaurant: restaurantId,
      createdBy: req.user.userId,
    });

    emitToRestaurant(req, restaurantId, "categoryCreated", { category });

    res.status(201).json({ message: "Category created", category });
  } catch (err) {
    console.error("[CATEGORY create]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getCategories = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const categories = await Category.find({ restaurant: restaurantId })
      .sort({ name: 1 })
      .select("_id name description");

    res.status(200).json({ categories });
  } catch (err) {
    console.error("[CATEGORY list]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const role = req.user?.role;
    if (!(isAdmin(role) || isManager(role))) {
      return res
        .status(403)
        .json({ error: "Only admin/manager can update categories" });
    }

    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;
    const { name, description } = req.body;

    const category = await Category.findOne({
      _id: id,
      restaurant: restaurantId,
    });
    if (!category) return res.status(404).json({ error: "Category not found" });

    if (name && name.trim() !== category.name) {
      const duplicate = await Category.findOne({
        name: name.trim(),
        restaurant: restaurantId,
        _id: { $ne: id },
      });
      if (duplicate) {
        return res.status(400).json({ error: "Category name already exists" });
      }
      category.name = name.trim();
    }

    if (description !== undefined)
      category.description = description.toString().trim();

    const updated = await category.save();
    emitToRestaurant(req, restaurantId, "categoryUpdated", {
      category: updated,
    });

    res.status(200).json({ message: "Category updated", category: updated });
  } catch (err) {
    console.error("[CATEGORY update]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const role = req.user?.role;
    if (!(isAdmin(role) || isManager(role))) {
      return res
        .status(403)
        .json({ error: "Only admin/manager can delete categories" });
    }

    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;

    const deleted = await Category.findOneAndDelete({
      _id: id,
      restaurant: restaurantId,
    });
    if (!deleted) return res.status(404).json({ error: "Category not found" });

    emitToRestaurant(req, restaurantId, "categoryDeleted", { categoryId: id });

    res.status(200).json({ message: "Category deleted" });
  } catch (err) {
    console.error("[CATEGORY delete]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const getCategoryById = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;

    const category = await Category.findOne({
      _id: id,
      restaurant: restaurantId,
    }).select("_id name description");

    if (!category) return res.status(404).json({ error: "Category not found" });

    res.status(200).json({ category });
  } catch (err) {
    console.error("[CATEGORY getById]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
