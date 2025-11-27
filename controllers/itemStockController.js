import mongoose from "mongoose";
import ItemStock from "../models/itemStock.js";
import Item from "../models/item.js";

const ensureRestaurant = (req, res) => {
  const restaurantId = req.user?.restaurantId;
  if (!restaurantId) {
    res.status(400).json({ error: "Restaurant context missing in token" });
    return null;
  }
  return restaurantId;
};

export const createItemStock = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { itemId, variantUnit, quantity } = req.body ?? {};

    if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ error: "Valid itemId is required" });
    }
    if (!variantUnit || typeof variantUnit !== "string") {
      return res.status(400).json({ error: "variantUnit is required" });
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      return res.status(400).json({ error: "Quantity must be >= 0" });
    }

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ error: "Item not found" });

    const variantExists = item.variants.some((v) => v.unit === variantUnit);
    if (!variantExists)
      return res
        .status(400)
        .json({ error: "variantUnit does not exist for this item" });

    const stock = await ItemStock.findOneAndUpdate(
      { item: itemId, variantUnit, restaurant: restaurantId },
      { $inc: { quantity: qty }, $set: { updatedBy: req.user.userId } },
      { new: true, upsert: true }
    );

    res.status(201).json({ message: "Stock updated", stock });
  } catch (err) {
    console.error("[ITEM STOCK CREATE]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getItemStocks = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { itemId } = req.query ?? {};

    const filter = { restaurant: restaurantId };
    if (itemId && mongoose.Types.ObjectId.isValid(itemId)) {
      filter.item = itemId;
    }

    const stocks = await ItemStock.find(filter)
      .populate("item", "name variants")
      .sort({ updatedAt: -1 });

    res.status(200).json({ stocks });
  } catch (err) {
    console.error("[ITEM STOCK LIST]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getItemStockById = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid ID" });

    const stock = await ItemStock.findOne({
      _id: id,
      restaurant: restaurantId,
    }).populate("item", "name variants");

    if (!stock) return res.status(404).json({ error: "Stock not found" });

    res.status(200).json({ stock });
  } catch (err) {
    console.error("[ITEM STOCK GET]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateItemStock = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;
    const { variantUnit, quantity } = req.body ?? {};

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid ID" });

    const updateData = {};
    if (variantUnit) updateData.variantUnit = variantUnit;
    if (quantity !== undefined) {
      const qty = Number(quantity);
      if (!Number.isFinite(qty) || qty < 0)
        return res.status(400).json({ error: "Quantity must be >= 0" });
      updateData.quantity = qty;
    }

    updateData.updatedBy = req.user.userId;

    const stock = await ItemStock.findOneAndUpdate(
      { _id: id, restaurant: restaurantId },
      { $set: updateData },
      { new: true }
    ).populate("item", "name variants");

    if (!stock) return res.status(404).json({ error: "Stock not found" });

    res.status(200).json({ message: "Stock updated", stock });
  } catch (err) {
    console.error("[ITEM STOCK UPDATE]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteItemStock = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid ID" });

    const stock = await ItemStock.findOneAndDelete({
      _id: id,
      restaurant: restaurantId,
    });

    if (!stock) return res.status(404).json({ error: "Stock not found" });

    res.status(200).json({ message: "Stock deleted" });
  } catch (err) {
    console.error("[ITEM STOCK DELETE]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
