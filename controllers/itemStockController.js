import mongoose from "mongoose";
import ItemStock from "../models/itemStock.js";
import Item from "../models/item.js";
import { io } from "../index.js";

const ensureRestaurant = (req, res) => {
  const restaurantId = req.user?.restaurantId;
  if (!restaurantId) {
    res.status(400).json({ error: "Restaurant context missing in token" });
    return null;
  }
  return restaurantId;
};

const emitStockEvent = (req, restaurantId, event, payload) => {
  try {
    const io = req.app.get("io");
    if (io && restaurantId) {
      io.to(restaurantId.toString()).emit(event, payload);
      console.log(`[STOCK EVENT] ${event}:`, payload.itemId || payload.stockId);
    }
  } catch (err) {
    console.warn(`[STOCK EMIT FAILED] ${event}:`, err.message);
  }
};

const emitStockEventDirect = (restaurantId, event, payload) => {
  try {
    if (io && restaurantId) {
      io.to(restaurantId.toString()).emit(event, payload);
      console.log(`[STOCK DIRECT EVENT] ${event}:`, payload.itemId);
    }
  } catch (err) {
    console.warn(`[STOCK DIRECT EMIT FAILED] ${event}:`, err.message);
  }
};

export const createItemStock = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { itemId, quantity } = req.body ?? {};

    if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ error: "Valid itemId is required" });
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      return res.status(400).json({ error: "Quantity must be >= 0" });
    }

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ error: "Item not found" });

    // const standardVariant =
    //   item.variants.find((v) => v.conversionFactor === 1) || item.variants[0];
    // if (!standardVariant)
    //   return res.status(400).json({ error: "Item has no valid variants" });

    const stock = await ItemStock.findOneAndUpdate(
      {
        item: itemId,
        // variantUnit: standardVariant.unit,
        restaurant: restaurantId,
      },
      { $inc: { quantity: qty }, $set: { updatedBy: req.user.userId } },
      { new: true, upsert: true }
    ).populate("item", "name variants");

    emitStockEvent(req, restaurantId, "itemStock:created", {
      stockId: stock._id,
      itemId: stock.item._id,
      itemName: stock.item.name,
      quantity: qty,
      newQuantity: stock.quantity,
      action: qty > 0 ? "added" : "removed",
      updatedBy: req.user.userId,
      timestamp: new Date(),
    });

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
    const { quantity } = req.body ?? {};

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid ID" });

    if (quantity === undefined)
      return res.status(400).json({ error: "Quantity is required" });

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 0)
      return res.status(400).json({ error: "Quantity must be >= 0" });

    const oldStock = await ItemStock.findOne({
      _id: id,
      restaurant: restaurantId,
    });

    const stock = await ItemStock.findOneAndUpdate(
      { _id: id, restaurant: restaurantId },
      { $set: { quantity: qty, updatedBy: req.user.userId } },
      { new: true }
    ).populate("item", "name variants");

    if (!stock) return res.status(404).json({ error: "Stock not found" });

    emitStockEvent(req, restaurantId, "itemStock:updated", {
      stockId: stock._id,
      itemId: stock.item._id,
      itemName: stock.item.name,
      oldQuantity: oldStock ? oldStock.quantity : 0,
      newQuantity: stock.quantity,
      change: oldStock ? qty - oldStock.quantity : qty,
      updatedBy: req.user.userId,
      timestamp: new Date(),
    });

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
    }).populate("item", "name variants");

    if (!stock) return res.status(404).json({ error: "Stock not found" });

    emitStockEvent(req, restaurantId, "itemStock:deleted", {
      stockId: stock._id,
      itemId: stock.item._id,
      itemName: stock.item.name,
      deletedQuantity: stock.quantity,
      deletedBy: req.user.userId,
      timestamp: new Date(),
    });

    res.status(200).json({ message: "Stock deleted" });
  } catch (err) {
    console.error("[ITEM STOCK DELETE]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const decreaseItemStockWithConversion = async (
  orderItems,
  restaurantId
) => {
  for (const orderItem of orderItems) {
    const itemId = orderItem.item?._id || orderItem.item;
    const variantUnit = orderItem.unitName;
    const quantity = orderItem.quantity;

    if (!itemId || !variantUnit || !quantity) continue;

    const item = await Item.findById(itemId);
    if (!item || !item.variants.length) continue;

    const variant = item.variants.find((v) => v.unit === variantUnit);
    if (!variant) continue;

    const decrementQty = quantity * (variant.conversionFactor || 1);

    const updatedStock = await ItemStock.findOneAndUpdate(
      { item: itemId, restaurant: restaurantId },
      { $inc: { quantity: -decrementQty } },
      { new: true }
    ).populate("item", "name variants");

    if (updatedStock) {
      emitStockEventDirect(restaurantId, "itemStock:decreased", {
        itemId: updatedStock.item._id,
        itemName: updatedStock.item.name,
        decrementQty: decrementQty,
        newQuantity: updatedStock.quantity,
        reason: "order_checkout",
        timestamp: new Date(),
      });
    }
  }
};

export const restoreItemStockWithConversion = async (
  orderItems,
  restaurantId
) => {
  for (const orderItem of orderItems) {
    const itemId = orderItem.item?._id || orderItem.item;
    const variantUnit = orderItem.unitName;
    const quantity = orderItem.quantity;

    if (!itemId || !variantUnit || !quantity) continue;

    const item = await Item.findById(itemId);
    if (!item || !item.variants.length) continue;

    const variant = item.variants.find((v) => v.unit === variantUnit);
    if (!variant) continue;

    const restoreQty = quantity * (variant.conversionFactor || 1);

    const updatedStock = await ItemStock.findOneAndUpdate(
      { item: itemId, restaurant: restaurantId },
      { $inc: { quantity: restoreQty } },
      { new: true }
    ).populate("item", "name variants");

    if (updatedStock) {
      emitStockEventDirect(restaurantId, "itemStock:restored", {
        itemId: updatedStock.item._id,
        itemName: updatedStock.item.name,
        restoreQty: restoreQty,
        newQuantity: updatedStock.quantity,
        reason: "order_cancellation",
        timestamp: new Date(),
      });
    }
  }
};
