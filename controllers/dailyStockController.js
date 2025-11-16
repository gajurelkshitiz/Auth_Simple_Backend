import DailyItemStock from "../models/dailyItemStock.js";
import Item from "../models/item.js";
import { emitToRestaurant } from "../utils/socket.js";

const todayString = (d = new Date()) => d.toISOString().slice(0, 10);

export const setDailyStock = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { itemId, date, totalStock } = req.body;

    if (!itemId || totalStock === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "itemId and totalStock required" });
    }

    const dateStr = (date && date.toString().trim()) || todayString();
    const totalNum = Number(totalStock);
    if (Number.isNaN(totalNum) || totalNum < 0) {
      return res.status(400).json({
        success: false,
        message: "totalStock must be a non-negative number",
      });
    }

    const item = await Item.findOne({ _id: itemId, restaurant: restaurantId });
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found for this restaurant",
      });
    }

    const existing = await DailyItemStock.findOne({
      item: itemId,
      date: dateStr,
      restaurant: restaurantId,
    });

    if (existing) {
      const used = existing.totalStock - existing.remainingStock;
      const newRemaining = Math.max(totalNum - used, 0);

      existing.totalStock = totalNum;
      existing.remainingStock = newRemaining;
      await existing.save();

      const populated = await existing.populate("item", "name");
      emitToRestaurant(req, restaurantId, "dailyStockUpdated", {
        stock: populated,
      });
      return res.status(200).json({ success: true, stock: populated });
    } else {
      const created = await DailyItemStock.create({
        item: itemId,
        date: dateStr,
        totalStock: totalNum,
        remainingStock: totalNum,
        restaurant: restaurantId,
      });

      const populated = await DailyItemStock.findById(created._id).populate(
        "item",
        "name"
      );
      emitToRestaurant(req, restaurantId, "dailyStockCreated", {
        stock: populated,
      });
      return res.status(201).json({ success: true, stock: populated });
    }
  } catch (err) {
    console.error("[DAILYSTOCK set]", err);
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Daily stock already exists" });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getDailyStocks = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const dateStr =
      (req.query.date && req.query.date.toString()) || todayString();

    const stocks = await DailyItemStock.find({
      restaurant: restaurantId,
      date: dateStr,
    })
      .populate("item", "name available")
      .sort({ createdAt: -1 });

    return res.json({ success: true, stocks });
  } catch (err) {
    console.error("[DAILYSTOCK list]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const decrementStock = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { itemId, date, quantity } = req.body;
    const qty = Number(quantity) || 0;
    if (!itemId || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "itemId and positive quantity required",
      });
    }
    const dateStr = (date && date.toString()) || todayString();

    const updated = await DailyItemStock.findOneAndUpdate(
      {
        item: itemId,
        date: dateStr,
        restaurant: restaurantId,
        remainingStock: { $gte: qty },
      },
      { $inc: { remainingStock: -qty } },
      { new: true }
    ).populate("item", "name");

    if (!updated) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock or record not found",
      });
    }

    emitToRestaurant(req, restaurantId, "dailyStockUpdated", {
      stock: updated,
    });
    return res.json({ success: true, stock: updated });
  } catch (err) {
    console.error("[DAILYSTOCK decrement]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const incrementStock = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { itemId, date, quantity } = req.body;
    const qty = Number(quantity) || 0;
    if (!itemId || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "itemId and positive quantity required",
      });
    }
    const dateStr = (date && date.toString()) || todayString();

    const stockDoc = await DailyItemStock.findOne({
      item: itemId,
      date: dateStr,
      restaurant: restaurantId,
    });
    if (!stockDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Daily stock record not found" });
    }

    const newRemaining = Math.min(
      stockDoc.remainingStock + qty,
      stockDoc.totalStock
    );
    stockDoc.remainingStock = newRemaining;
    await stockDoc.save();

    const populated = await stockDoc.populate("item", "name");
    emitToRestaurant(req, restaurantId, "dailyStockUpdated", {
      stock: populated,
    });
    return res.json({ success: true, stock: populated });
  } catch (err) {
    console.error("[DAILYSTOCK increment]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteDailyStock = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { id } = req.params;

    const deleted = await DailyItemStock.findOneAndDelete({
      _id: id,
      restaurant: restaurantId,
    });
    if (!deleted)
      return res.status(404).json({ success: false, message: "Not found" });

    emitToRestaurant(req, restaurantId, "dailyStockDeleted", { stockId: id });
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("[DAILYSTOCK delete]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
export const updateDailyStock = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { id } = req.params;
    const { totalStock } = req.body;

    if (totalStock === undefined) {
      return res.status(400).json({
        success: false,
        message: "totalStock is required",
      });
    }

    const newTotal = Number(totalStock);
    if (isNaN(newTotal) || newTotal < 0) {
      return res.status(400).json({
        success: false,
        message: "totalStock must be a non-negative number",
      });
    }

    const stockDoc = await DailyItemStock.findOne({
      _id: id,
      restaurant: restaurantId,
    });

    if (!stockDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Daily stock record not found" });
    }

    const used = stockDoc.totalStock - stockDoc.remainingStock;

    const newRemaining = Math.max(newTotal - used, 0);

    stockDoc.totalStock = newTotal;
    stockDoc.remainingStock = newRemaining;

    await stockDoc.save();

    const populated = await stockDoc.populate("item", "name");

    return res.json({ success: true, stock: populated });
  } catch (err) {
    console.error("[DAILYSTOCK update]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
