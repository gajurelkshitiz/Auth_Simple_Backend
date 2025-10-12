import mongoose from "mongoose";
import Order from "../models/order.js";
import Table from "../models/table.js";
import Area from "../models/area.js";
import OrderCounter from "../models/orderCounter.js";
import KOT from "../models/kot.js";
import { printKOT } from "../utils/printKOT.js";
import { io } from "../index.js";
import Item from "../models/item.js";
import Stock from "../models/stock.js";

const ensureRestaurant = (req, res) => {
  const restaurantId = req.user?.restaurantId;
  if (!restaurantId) {
    res.status(400).json({ error: "Restaurant context missing in token" });
    return null;
  }
  return restaurantId;
};

async function nextOrderIdForRestaurant(restaurantId) {
  const doc = await OrderCounter.findOneAndUpdate(
    { restaurant: restaurantId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}

function computeTotals(items = []) {
  const totalAmount = items.reduce(
    (sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 0),
    0
  );
  return { totalAmount };
}

function applyPayment(order, paymentStatus, customerName) {
  order.paymentStatus = paymentStatus;
  if (paymentStatus === "Paid") {
    order.paidAmount = order.totalAmount;
    order.dueAmount = 0;
    order.customerName = null;
  } else if (paymentStatus === "Due") {
    order.paidAmount = 0;
    order.dueAmount = order.totalAmount;
    order.customerName = null;
  } else if (paymentStatus === "Credit") {
    order.paidAmount = 0;
    order.dueAmount = order.totalAmount;
    order.customerName = customerName || null;
  }
}

async function freeTable(tableIdOrDoc) {
  if (!tableIdOrDoc) return;
  if (tableIdOrDoc._id) {
    tableIdOrDoc.status = "available";
    if ("currentOrderId" in tableIdOrDoc) tableIdOrDoc.currentOrderId = null;
    await tableIdOrDoc.save();
  } else {
    await Table.findByIdAndUpdate(tableIdOrDoc, {
      $set: { status: "available", currentOrderId: null },
    });
  }
}

async function occupyTable(tableId, orderId) {
  await Table.findByIdAndUpdate(tableId, {
    $set: { status: "occupied", currentOrderId: orderId ?? null },
  });
}

function validateItems(items, res) {
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "Items are required (non-empty array)" });
    return false;
  }
  for (let i = 0; i < items.length; i++) {
    const it = items[i] ?? {};
    if (!it.item || !mongoose.Types.ObjectId.isValid(it.item)) {
      res
        .status(400)
        .json({ error: `items[${i}].item must be a valid ObjectId` });
      return false;
    }
    if (!it.unitName || typeof it.unitName !== "string") {
      res.status(400).json({ error: `items[${i}].unitName is required` });
      return false;
    }
    const price = Number(it.price);
    const qty = Number(it.quantity);
    if (!Number.isFinite(price) || price < 0) {
      res
        .status(400)
        .json({ error: `items[${i}].price must be a non-negative number` });
      return false;
    }
    if (!Number.isInteger(qty) || qty < 1) {
      res
        .status(400)
        .json({ error: `items[${i}].quantity must be an integer >= 1` });
      return false;
    }
  }
  return true;
}

async function adjustStock(items, increase = false, restaurantId) {
  if (!Array.isArray(items) || items.length === 0) return;

  const populatedItems = await Promise.all(
    items.map(async (it) => {
      if (it.item && typeof it.item === "object" && it.item._id) return it;
      const fullItem = await Item.findById(it.item).select("name");
      return { ...it, item: fullItem };
    })
  );

  for (const it of populatedItems) {
    if (!it.item?._id) continue;

    const stockDoc = await Stock.findOne({
      item: it.item._id,
      restaurant: restaurantId,
    });

    if (!stockDoc) continue; // no stock tracking for this item

    if (stockDoc.autoDecrement) {
      const oldQty = stockDoc.quantity;
      stockDoc.quantity = increase
        ? stockDoc.quantity + it.quantity
        : stockDoc.quantity - it.quantity;

      if (stockDoc.quantity < 0) stockDoc.quantity = 0;

      await stockDoc.save();

      console.log(
        `[STOCK] ${stockDoc.name} ${
          increase ? "restocked" : "decremented"
        }: ${oldQty} → ${stockDoc.quantity}`
      );

      if (stockDoc.quantity <= stockDoc.alertThreshold) {
        console.warn(
          `[ALERT] Low stock: ${stockDoc.name} (${stockDoc.quantity} ${stockDoc.unit} left)`
        );
      }
    }
  }
}

export const createOrder = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const {
      tableId,
      items,
      paymentStatus = "Paid",
      customerName,
      note,
    } = req.body ?? {};

    if (!tableId || !mongoose.Types.ObjectId.isValid(tableId)) {
      return res.status(400).json({ error: "Invalid or missing tableId" });
    }
    if (!validateItems(items, res)) return;

    const table = await Table.findById(tableId).populate("area", "name");
    if (!table || table.restaurant.toString() !== restaurantId.toString()) {
      return res
        .status(404)
        .json({ error: "Table not found in your restaurant" });
    }

    const areaId = table.area?._id ?? table.area;
    if (!areaId) {
      return res
        .status(400)
        .json({ error: "Table has no valid area reference" });
    }

    const orderId = await nextOrderIdForRestaurant(restaurantId);
    const { totalAmount } = computeTotals(items);

    const order = await Order.create({
      orderId,
      table: table._id,
      area: areaId,
      restaurant: restaurantId,
      items,
      totalAmount,
      paidAmount: 0,
      dueAmount: 0,
      paymentStatus,
      customerName: paymentStatus === "Credit" ? customerName || null : null,
      note,
      checkedOut: false,
      createdBy: req.user.userId,
      adminId: req.user.userId,
    });

    applyPayment(order, paymentStatus, customerName);
    await order.save();
    await occupyTable(table._id, order._id);

    await adjustStock(items, false, restaurantId);

    io.to(restaurantId.toString()).emit("order:created", {
      orderId: order._id,
      tableId: table._id,
      totalAmount: order.totalAmount,
      status: "active",
      createdAt: new Date(),
    });

    const kot = await KOT.create({
      restaurant: restaurantId,
      table: table._id,
      order: order._id,
      type: "NEW",
      items: order.items.map((it) => ({
        item: it.item,
        name: it.item?.name || undefined,
        unitName: it.unitName,
        quantity: it.quantity,
      })),
      createdBy: req.user.userId,
      createdByRole: req.user.role,
    });

    try {
      printKOT(await kot.populate(["table", "order"]));

      io.to(restaurantId.toString()).emit("kot:new", {
        type: "NEW",
        table: table.name,
        tableId: table._id,
        orderId: order._id,
        items: order.items,
        createdAt: new Date(),
      });
    } catch (err) {
      console.warn("[KOT print error]", err.message);
    }

    return res.status(201).json({ message: "Order created", order });
  } catch (err) {
    console.error("[ORDER create]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getOrders = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const orders = await Order.find({ restaurant: restaurantId })
      .populate("table", "name")
      .populate("area", "name")
      .populate("items.item", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ orders });
  } catch (err) {
    console.error("[ORDER list]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;
    const order = await Order.findOne({ _id: id, restaurant: restaurantId })
      .populate("table", "name")
      .populate("area", "name")
      .populate("items.item", "name");

    if (!order) return res.status(404).json({ error: "Order not found" });

    res.status(200).json({ order });
  } catch (err) {
    console.error("[ORDER getById]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;
    const { items, paymentStatus, customerName, note } = req.body ?? {};

    const order = await Order.findOne({
      _id: id,
      restaurant: restaurantId,
    }).populate("table");
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (items && Array.isArray(items)) {
      if (!validateItems(items, res)) return;

      await adjustStock(order.items, true, restaurantId);

      order.items = items;
      order.totalAmount = computeTotals(items).totalAmount;

      await adjustStock(items, false, restaurantId);
    }

    if (paymentStatus) {
      applyPayment(order, paymentStatus, customerName);
    }

    if (note !== undefined) order.note = note;

    await order.save();

    io.to(restaurantId.toString()).emit("order:updated", {
      orderId: order._id,
      tableId: order.table._id,
      totalAmount: order.totalAmount,
      items: order.items,
      updatedAt: new Date(),
    });

    const kot = await KOT.create({
      restaurant: restaurantId,
      table: order.table,
      order: order._id,
      type: "UPDATE",
      items: order.items.map((it) => ({
        item: it.item,
        name: it.item?.name || undefined,
        unitName: it.unitName,
        quantity: it.quantity,
      })),
      createdBy: req.user.userId,
      createdByRole: req.user.role,
    });

    try {
      printKOT(await kot.populate(["table", "order"]));

      io.to(restaurantId.toString()).emit("kot:update", {
        type: "UPDATE",
        table: order.table.name,
        tableId: order.table._id,
        orderId: order._id,
        items: order.items,
        updatedAt: new Date(),
      });
    } catch (err) {
      console.warn("[KOT print error]", err.message);
    }

    res.status(200).json({ message: "Order updated", order });
  } catch (err) {
    console.error("[ORDER update]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;
    const order = await Order.findOneAndDelete({
      _id: id,
      restaurant: restaurantId,
    });
    if (!order) return res.status(404).json({ error: "Order not found" });

    await freeTable(order.table);

    await adjustStock(order.items, true, restaurantId);

    io.to(restaurantId.toString()).emit("order:deleted", {
      orderId: order._id,
      tableId: order.table,
      deletedAt: new Date(),
    });

    const kot = await KOT.create({
      restaurant: restaurantId,
      table: deleted.table,
      order: deleted._id,
      type: "VOID",
      items: deleted.items.map((it) => ({
        item: it.item,
        name: it.item?.name || undefined,
        unitName: it.unitName,
        quantity: it.quantity,
      })),
      createdBy: req.user.userId,
      createdByRole: req.user.role,
    });

    try {
      printKOT(await kot.populate(["table", "order"]));

      io.to(restaurantId.toString()).emit("kot:void", {
        type: "VOID",
        tableId: deleted.table,
        orderId: deleted._id,
        items: deleted.items,
        deletedAt: new Date(),
      });
    } catch (err) {
      console.warn("[KOT print error]", err.message);
    }

    res.status(200).json({ message: "Order deleted" });
  } catch (err) {
    console.error("[ORDER delete]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const checkoutOrder = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;
    const { force = false } = req.body ?? {};

    const order = await Order.findOne({
      _id: id,
      restaurant: restaurantId,
    }).populate("table");
    if (!order) return res.status(404).json({ error: "Order not found" });

    const hasDue =
      Number(order.dueAmount ?? 0) > 0 || order.paymentStatus !== "Paid";
    if (hasDue && !force) {
      return res
        .status(400)
        .json({ error: "Order has due amount. Set force=true to override." });
    }

    order.checkedOut = true;
    order.checkedOutAt = new Date();

    if (hasDue && force) {
      order.paidAmount = order.totalAmount;
      order.dueAmount = 0;
      order.paymentStatus = "Paid";
      order.customerName = null;
    }

    await order.save();
    await freeTable(order.table);

    io.to(restaurantId.toString()).emit("order:checkedOut", {
      orderId: order._id,
      tableId: order.table._id,
      checkedOutAt: new Date(),
    });

    return res.status(200).json({ message: "Checked out", order });
  } catch (err) {
    console.error("[ORDER checkout]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const bulkCheckout = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { ids, force = false } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids (string[]) is required" });
    }

    const bad = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (bad.length) {
      return res.status(400).json({ error: `Invalid ids: ${bad.join(", ")}` });
    }

    let ok = 0;
    let failed = 0;
    const results = [];

    for (const id of ids) {
      try {
        const order = await Order.findOne({
          _id: id,
          restaurant: restaurantId,
        }).populate("table");

        if (!order) {
          failed++;
          results.push({ id, ok: false, reason: "Order not found" });
          continue;
        }

        if (order.checkedOut === true) {
          ok++;
          results.push({ id, ok: true, reason: "Already checked out" });
          continue;
        }

        const hasDue =
          Number(order.dueAmount ?? 0) > 0 || order.paymentStatus !== "Paid";
        if (hasDue && !force) {
          failed++;
          results.push({
            id,
            ok: false,
            reason: "Has due; require force=true",
          });
          continue;
        }

        order.checkedOut = true;
        order.checkedOutAt = new Date();
        if (hasDue && force) {
          order.paidAmount = order.totalAmount;
          order.dueAmount = 0;
          order.paymentStatus = "Paid";
          order.customerName = null;
        }
        await order.save();

        await freeTable(order.table);

        ok++;
        results.push({ id, ok: true });

        io.to(restaurantId.toString()).emit("order:checkedOut", {
          orderId: order._id,
          tableId: order.table._id,
          checkedOutAt: new Date(),
        });
      } catch (e) {
        failed++;
        results.push({ id, ok: false, reason: e?.message || "Error" });
      }
    }

    return res.status(200).json({
      ok,
      failed,
      results,
      message: `Checked out ${ok} • Failed ${failed}`,
    });
  } catch (err) {
    console.error("[ORDER bulkCheckout]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
