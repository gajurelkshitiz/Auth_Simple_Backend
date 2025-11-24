import mongoose from "mongoose";
import Receipt from "../models/receipt.js";

const buildMatchQuery = (req) => {
  const { startDate, endDate, restaurantId } = req.query;
  const match = {};

  if (restaurantId)
    match.restaurant = new mongoose.Types.ObjectId(restaurantId);

  if (startDate || endDate) {
    match.printedAt = {};
    if (startDate) match.printedAt.$gte = new Date(startDate);
    if (endDate) match.printedAt.$lte = new Date(endDate);
  }

  return match;
};

export const getDailyItemWiseReport = async (req, res) => {
  try {
    const { startDate, endDate, restaurantId } = req.query;

    if (!startDate || !endDate)
      return res
        .status(400)
        .json({ message: "startDate and endDate required" });

    const match = {};

    if (restaurantId)
      match.restaurant = new mongoose.Types.ObjectId(restaurantId);

    match.printedAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };

    const result = await Receipt.aggregate([
      { $match: match },
      { $unwind: "$items" },

      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$printedAt" } },
            item: "$items.name",
          },
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] },
          },
        },
      },

      { $sort: { "_id.date": 1 } },
    ]);

    const formatted = {};

    result.forEach((row) => {
      const date = row._id.date;

      if (!formatted[date]) {
        formatted[date] = [];
      }

      formatted[date].push({
        item: row._id.item,
        quantity: row.totalQuantity,
        revenue: row.totalRevenue,
      });
    });

    res.json(formatted);
  } catch (err) {
    console.error("[getDailyItemWiseReport]", err);
    res.status(500).json({ message: "Failed", error: err.message });
  }
};

export const getSalesSummary = async (req, res) => {
  try {
    const { type = "daily" } = req.query;
    const match = buildMatchQuery(req);

    let dateFormat;
    if (type === "weekly") dateFormat = "%Y-%U";
    else if (type === "monthly") dateFormat = "%Y-%m";
    else dateFormat = "%Y-%m-%d";

    const summary = await Receipt.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            period: {
              $dateToString: { format: dateFormat, date: "$printedAt" },
            },
          },
          totalSales: { $sum: "$finalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { "_id.period": 1 } },
    ]);

    res.json(summary);
  } catch (err) {
    console.error("[getSalesSummary]", err);
    res
      .status(500)
      .json({ message: "Failed to fetch summary", error: err.message });
  }
};

export const getTopItems = async (req, res) => {
  try {
    const match = buildMatchQuery(req);

    const topItems = await Receipt.aggregate([
      { $match: match },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] },
          },
        },
      },
      { $sort: { totalQuantity: -1 } }, // sort by quantity sold
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          name: "$_id",
          totalQuantity: 1,
          totalRevenue: 1,
        },
      },
    ]);

    res.json(topItems);
  } catch (err) {
    console.error("[getTopItems]", err);
    res
      .status(500)
      .json({ message: "Failed to fetch top items", error: err.message });
  }
};

export const getSalesByCategory = async (req, res) => {
  try {
    const match = buildMatchQuery(req);

    const result = await Receipt.aggregate([
      { $match: match },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "items",
          localField: "items.name",
          foreignField: "name",
          as: "item",
        },
      },
      { $unwind: "$item" },
      {
        $lookup: {
          from: "categories",
          localField: "item.category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$category.name",
          totalSales: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] },
          },
          totalQuantity: { $sum: "$items.quantity" },
        },
      },
      { $sort: { totalSales: -1 } },
    ]);

    res.json(result);
  } catch (err) {
    console.error("[getSalesByCategory]", err);
    res
      .status(500)
      .json({ message: "Failed to fetch category report", error: err.message });
  }
};

export const getSalesByArea = async (req, res) => {
  try {
    const match = buildMatchQuery(req);

    const result = await Receipt.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$areaName",
          totalSales: { $sum: "$finalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { totalSales: -1 } },
    ]);

    res.json(result);
  } catch (err) {
    console.error("[getSalesByArea]", err);
    res
      .status(500)
      .json({ message: "Failed to fetch area report", error: err.message });
  }
};

export const getSalesByTable = async (req, res) => {
  try {
    const match = buildMatchQuery(req);

    const result = await Receipt.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$tableName",
          totalSales: { $sum: "$finalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { totalSales: -1 } },
    ]);

    res.json(result);
  } catch (err) {
    console.error("[getSalesByTable]", err);
    res
      .status(500)
      .json({ message: "Failed to fetch table report", error: err.message });
  }
};
