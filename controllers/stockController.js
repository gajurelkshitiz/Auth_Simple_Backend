import Stock from "../models/stock.js";
import Restaurant from "../models/restaurant.js";

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
    console.log("Incoming stock body:", req.body);
    console.log("Item field type:", typeof req.body.item);
    console.log("Type of item :", typeof req.body.item);
    const role = req.user?.role;
    if (!(isAdmin(role) || isManager(role) || isSuper(role))) {
      return res
        .status(403)
        .json({ error: "Only admin/manager/super can create stock" });
    }

    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { name, unit, quantity, autoDecrement, alertThreshold, item } =
      req.body ?? {};
    if (!name || name.toString().trim() === "") {
      return res.status(400).json({ error: "Stock name is required" });
    }
    const q = Number(quantity ?? 0);
    if (!Number.isFinite(q) || q < 0) {
      return res
        .status(400)
        .json({ error: "quantity must be a non-negative number" });
    }
    if (!item) {
      return res.status(400).json({ error: "Item ID is required" });
    }

    if (isSuper(req.user?.role) && req.body?.restaurantId) {
      const r = await Restaurant.findById(req.body.restaurantId);
      if (!r) return res.status(400).json({ error: "Invalid restaurant ID" });
    }

    const stock = await Stock.create({
      name: name.toString().trim(),
      unit: (unit ?? "").toString().trim(),
      quantity: q,
      autoDecrement: Boolean(autoDecrement),
      alertThreshold: Number(alertThreshold ?? 0),
      restaurant: restaurantId,
      item,
      createdBy: req.user.userId,
      createdByRole: req.user.role,
    });

    return res.status(201).json({ message: "Stock created", stock });
  } catch (err) {
    console.error("[STOCK create]", err);
    res.status(500).json({ error: "Internal Server Error" });
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
    if (!stock) return res.status(404).json({ error: "Stock not found" });

    res.status(200).json({ stock });
  } catch (err) {
    console.error("[STOCK getById]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateStock = async (req, res) => {
  try {
    const role = req.user?.role;
    if (!(isAdmin(role) || isManager(role) || isSuper(role))) {
      return res
        .status(403)
        .json({ error: "Only admin/manager/super can update stock" });
    }

    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;
    const existing = await Stock.findOne({ _id: id, restaurant: restaurantId });
    if (!existing) return res.status(404).json({ error: "Stock not found" });

    const { name, unit, quantity, autoDecrement, alertThreshold } =
      req.body ?? {};

    if (name !== undefined) existing.name = name.toString().trim();
    if (unit !== undefined) existing.unit = unit.toString().trim();
    if (quantity !== undefined) {
      const q = Number(quantity);
      if (!Number.isFinite(q) || q < 0)
        return res
          .status(400)
          .json({ error: "quantity must be a non-negative number" });
      existing.quantity = q;
    }
    if (autoDecrement !== undefined)
      existing.autoDecrement = Boolean(autoDecrement);
    if (alertThreshold !== undefined)
      existing.alertThreshold = Number(alertThreshold);

    const updated = await existing.save();
    return res.status(200).json({ message: "Stock updated", stock: updated });
  } catch (err) {
    console.error("[STOCK update]", err);
    res.status(500).json({ error: "Internal Server Error" });
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
