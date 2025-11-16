import Ingredient from "../models/ingredient.js";

export const createIngredient = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;

    const ingredient = await Ingredient.create({
      ...req.body,
      restaurantId,
    });

    res.status(201).json({ success: true, ingredient });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getIngredients = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;

    const ingredients = await Ingredient.find({ restaurantId }).sort({
      createdAt: -1,
    });

    res.json({ success: true, ingredients });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateIngredient = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.user.restaurantId;

    const ingredient = await Ingredient.findOneAndUpdate(
      { _id: id, restaurantId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!ingredient)
      return res
        .status(404)
        .json({ success: false, message: "Ingredient not found" });

    res.json({ success: true, ingredient });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteIngredient = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.user.restaurantId;

    const deleted = await Ingredient.findOneAndDelete({
      _id: id,
      restaurantId,
    });

    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Ingredient not found" });

    res.json({ success: true, message: "Ingredient removed" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
