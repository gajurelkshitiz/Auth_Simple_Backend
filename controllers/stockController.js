import mongoose from "mongoose";
import Item from "../models/item.js";
import Stock from "../models/stock.js";
import Restaurant from "../models/restaurant.js";
import StockHistory from "../models/stockHistory.js";

const isAdmin = (role) => role === "admin";
const isManager = (role) => role === "manager";
const isSuper = (role) => role === "super-admin";

const ensureRestaurant = (req, res) => {
  if (isSuper(req.user?.role) && req.body?.restaurantId) {
    return req.body.restaurantId;
  }
  const restaurantId = req.user?.restaurantId;
  if (!restaurantId) {
    res.status(400).json({ error: "Restaurant context missing in token" });
    return null;
  }
  return restaurantId;
};

export const createStock = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;
    const { name, unit, quantity, autoDecrement, alertThreshold, itemName } =
      req.body;

    let linkedItem = null;

    if (itemName) {
      linkedItem = await Item.findOne({
        name: itemName,
        restaurant: restaurantId,
      });
      if (!linkedItem) {
        return res
          .status(400)
          .json({ error: `Item "${itemName}" not found in this restaurant.` });
      }
    }

    const stock = new Stock({
      name,
      unit,
      quantity,
      autoDecrement,
      alertThreshold,
      restaurant: restaurantId,
      item: linkedItem ? linkedItem._id : null,
    });

    await stock.save();
    res.status(201).json({ message: "Stock created successfully", stock });
  } catch (error) {
    console.error("Error creating stock:", error);
    res.status(500).json({ error: "Failed to create stock" });
  }
};

export const listStocks = async (req, res) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (req.user?.role === "super-admin" && req.query?.restaurantId) {
      const r = await Restaurant.findById(req.query.restaurantId);
      if (!r) return res.status(400).json({ error: "Invalid restaurant ID" });
      const stocks = await Stock.find({
        restaurant: req.query.restaurantId,
      }).sort({ createdAt: -1 });
      return res.status(200).json({ stocks });
    }

    if (!restaurantId)
      return res
        .status(400)
        .json({ error: "Restaurant context missing in token" });

    const stocks = await Stock.find({ restaurant: restaurantId }).sort({
      createdAt: -1,
    });
    res.status(200).json({ stocks });
  } catch (err) {
    console.error("[STOCK list]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getStockById = async (req, res) => {
  try {
    const restaurantId = req.user?.restaurantId;
    const { id } = req.params;

    if (!restaurantId)
      return res.status(400).json({ error: "Restaurant context missing" });

    const stock = await Stock.findOne({ _id: id, restaurant: restaurantId });
    if (!stock)
      return res
        .status(404)
        .json({ error: "Stock not found for this restaurant" });

    const history = await StockHistory.find({ stock: id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ stock, history });
  } catch (err) {
    console.error("[STOCK getById]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, unit, quantity, autoDecrement, alertThreshold, itemName } =
      req.body;
    const restaurant = req.user.restaurant;

    let stock = await Stock.findOne({ _id: id, restaurant });
    if (!stock) return res.status(404).json({ error: "Stock not found" });

    let linkedItem = null;
    if (itemName) {
      linkedItem = await Item.findOne({ name: itemName, restaurant });
      if (!linkedItem)
        return res.status(400).json({ error: `Item "${itemName}" not found.` });
    }

    stock.name = name ?? stock.name;
    stock.unit = unit ?? stock.unit;
    stock.quantity = quantity ?? stock.quantity;
    stock.autoDecrement = autoDecrement ?? stock.autoDecrement;
    stock.alertThreshold = alertThreshold ?? stock.alertThreshold;
    stock.item = linkedItem ? linkedItem._id : stock.item;

    await stock.save();
    res.json({ message: "Stock updated", stock });
  } catch (error) {
    console.error("Error updating stock:", error);
    res.status(500).json({ error: "Failed to update stock" });
  }
};

export const deleteStock = async (req, res) => {
  try {
    const role = req.user?.role;
    if (!(isAdmin(role) || isManager(role) || isSuper(role))) {
      return res
        .status(403)
        .json({ error: "Only admin/manager/super can delete stock" });
    }

    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;
    const deleted = await Stock.findOneAndDelete({
      _id: id,
      restaurant: restaurantId,
    });
    if (!deleted) return res.status(404).json({ error: "Stock not found" });

    res.status(200).json({ message: "Stock deleted" });
  } catch (err) {
    console.error("[STOCK delete]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const addStockEntry = async (req, res) => {
  try {
    const { stockId, quantityAdded, pricePerUnit, note } = req.body;
    const restaurantId = req.user?.restaurantId;

    if (!stockId || !mongoose.Types.ObjectId.isValid(stockId)) {
      return res.status(400).json({ error: "Invalid stock ID" });
    }

    const stock = await Stock.findOne({
      _id: stockId,
      restaurant: restaurantId,
    });
    if (!stock)
      return res
        .status(404)
        .json({ error: "Stock not found for this restaurant" });

    const entry = new StockHistory({
      stock: stockId,
      restaurant: restaurantId,
      quantityAdded,
      pricePerUnit,
      note,
    });

    await entry.save();
    stock.quantity += Number(quantityAdded);
    await stock.save();

    res.status(201).json({ message: "Stock updated", entry });
  } catch (err) {
    console.error("[STOCK addEntry]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
