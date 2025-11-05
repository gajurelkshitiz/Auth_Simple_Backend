import Category from "../models/category.js";

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
      description: description ?? "",
      restaurant: restaurantId,
      createdBy: req.user.userId,
    });

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

    const categories = await Category.find({ restaurant: restaurantId }).sort({
      name: 1,
    });
    res.status(200).json({ categories });
  } catch (err) {
    console.error("[CATEGORY list]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
