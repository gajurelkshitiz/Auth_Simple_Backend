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
    const { name, unit, quantity, alertThreshold, autoDecrement, item } =
      req.body;
    const restaurant = req.user.restaurantId || req.body.restaurantId;

    if (!name || !unit || quantity == null) {
      return res
        .status(400)
        .json({ error: "Name, unit, and quantity are required" });
    }

    if (item && !mongoose.Types.ObjectId.isValid(item)) {
      return res.status(400).json({ error: "Invalid item ID" });
    }

    const stock = new Stock({
      name,
      unit,
      quantity,
      alertThreshold,
      autoDecrement: !!autoDecrement,
      restaurant,
      item: item || null,
    });

    await stock.save();
    res.status(201).json(stock);
  } catch (error) {
    console.error("Error creating stock:", error);
    res.status(500).json({ error: "Server error" });
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
