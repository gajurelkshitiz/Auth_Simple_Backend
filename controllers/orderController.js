import mongoose from "mongoose";
import Order from "../models/order.js";
import Table from "../models/table.js";
import Area from "../models/area.js";
import OrderCounter from "../models/orderCounter.js";
import KOT from "../models/kot.js";
import { printKOT } from "../utils/printKOT.js";
import { io } from "../index.js";
import { adjustStock } from "./stockController.js";

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

function applyPayment(order, paymentStatus, customerName, paymentMethod = {}) {
  const subtotal = Number(order.totalAmount) || 0;
  const discountPercent = Number(order.discountPercent || 0);
  const vatPercent = Number(order.vatPercent || 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const discountedBase = subtotal - discountAmount;
  const vatAmount = (discountedBase * vatPercent) / 100;
  const finalAmount = discountedBase + vatAmount;

  order.discountAmount = discountAmount;
  order.vatAmount = vatAmount;
  order.finalAmount = finalAmount;

  if (!paymentMethod.method) paymentMethod.method = "cash";
  order.paymentMethod = paymentMethod;

  if (paymentStatus === "Paid") {
    order.paidAmount = finalAmount;
    order.dueAmount = 0;
    order.customerName = null;
  } else if (paymentStatus === "Due") {
    order.paidAmount = 0;
    order.dueAmount = finalAmount;
    order.customerName = null;
  } else if (paymentStatus === "Credit") {
    order.paidAmount = 0;
    order.dueAmount = finalAmount;
    order.customerName = customerName || null;
  }

  order.paymentStatus = paymentStatus;
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

export const createOrder = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const {
      tableId,
      items,
      paymentStatus = "Due",
      customerName,
      note,
      vatPercent = 0,
      discountPercent = 0,
      paymentMethod = {},
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
    if (!areaId)
      return res
        .status(400)
        .json({ error: "Table has no valid area reference" });

    const orderId = await nextOrderIdForRestaurant(restaurantId);
    const { totalAmount } = computeTotals(items);

    const order = await Order.create({
      orderId,
      table: table._id,
      area: areaId,
      restaurant: restaurantId,
      items,
      totalAmount,
      vatPercent,
      discountPercent,
      checkedOut: false,
      note,
      createdBy: req.user.userId,
      adminId: req.user.userId,
    });

    applyPayment(order, paymentStatus, customerName, paymentMethod);
    await order.save();
    await occupyTable(table._id, order._id);

    await adjustStock(items, false, restaurantId);
    await order.populate("items.item", "name");

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

export const cancelOrder = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;
    const { cancelReason = "" } = req.body || {};

    const order = await Order.findOne({
      _id: id,
      restaurant: restaurantId,
    }).populate("table");

    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.checkedOut === true) {
      return res
        .status(400)
        .json({ error: "Checked-out orders cannot be cancelled" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ error: "Order already cancelled" });
    }

    order.cancelReason = cancelReason;
    order.status = "cancelled";

    await adjustStock(order.items, true, restaurantId);
    await freeTable(order.table);

    await order.save();

    io.to(restaurantId.toString()).emit("order:cancelled", {
      orderId: order._id,
      tableId: order.table._id,
      cancelReason,
      cancelledAt: new Date(),
    });

    return res.status(200).json({
      message: "Order cancelled",
      order,
    });
  } catch (err) {
    console.error("[ORDER cancel]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;
    const { items, paymentStatus, customerName, note, paymentMethod } =
      req.body ?? {};

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

    if (paymentStatus)
      applyPayment(order, paymentStatus, customerName, paymentMethod);
    if (note !== undefined) order.note = note;

    await order.save();

    io.to(restaurantId.toString()).emit("order:updated", {
      orderId: order._id,
      tableId: order.table._id,
      totalAmount: order.totalAmount,
      items: order.items,
      updatedAt: new Date(),
    });

    res.status(200).json({ message: "Order updated successfully", order });
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
    const {
      force = false,
      vatPercent = 0,
      discountPercent = 0,
      paymentMethod = {},
    } = req.body ?? {};

    const order = await Order.findOne({
      _id: id,
      restaurant: restaurantId,
    }).populate("table");
    if (!order) return res.status(404).json({ error: "Order not found" });

    const subtotal = Number(order.totalAmount) || 0;
    const discountAmount = (subtotal * Number(discountPercent)) / 100;
    const discountedBase = subtotal - discountAmount;
    const vatAmount = (discountedBase * Number(vatPercent)) / 100;
    const finalAmount = discountedBase + vatAmount;

    order.discountPercent = Number(discountPercent);
    order.discountAmount = discountAmount;
    order.vatPercent = Number(vatPercent);
    order.vatAmount = vatAmount;
    order.finalAmount = finalAmount;

    const hasDue =
      Number(order.dueAmount ?? 0) > 0 || order.paymentStatus !== "Paid";
    if (hasDue && !force)
      return res
        .status(400)
        .json({ error: "Order has due amount. Set force=true to override." });

    order.checkedOut = true;
    order.checkedOutAt = new Date();

    if (hasDue && force) applyPayment(order, "Paid", null, paymentMethod);
    else {
      const alreadyPaid = Number(order.paidAmount) || 0;
      const due = finalAmount - alreadyPaid;
      order.dueAmount = due > 0 ? due : 0;
      if (order.dueAmount <= 0) order.paymentStatus = "Paid";
    }

    await order.save();
    await freeTable(order.table);

    io.to(restaurantId.toString()).emit("order:checkedOut", {
      orderId: order._id,
      tableId: order.table._id,
      checkedOutAt: order.checkedOutAt,
      vatPercent,
      discountPercent,
      finalAmount,
    });

    return res.status(200).json({ message: "Checked out", order });
  } catch (err) {
    console.error("[ORDER checkout]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const bulkCheckout = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const {
      ids,
      force = false,
      vatPercent = 0,
      discountPercent = 0,
      paymentMethod = {},
    } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: "ids (string[]) is required" });

    const bad = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (bad.length)
      return res.status(400).json({ error: `Invalid ids: ${bad.join(", ")}` });

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

        const subtotal = Number(order.totalAmount) || 0;
        const discountAmount = (subtotal * Number(discountPercent)) / 100;
        const discountedBase = subtotal - discountAmount;
        const vatAmount = (discountedBase * Number(vatPercent)) / 100;
        const finalAmount = discountedBase + vatAmount;

        order.discountPercent = Number(discountPercent);
        order.discountAmount = discountAmount;
        order.vatPercent = Number(vatPercent);
        order.vatAmount = vatAmount;
        order.finalAmount = finalAmount;

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
        order.status = "checkedout";

        if (hasDue && force) applyPayment(order, "Paid", null, paymentMethod);
        else {
          const alreadyPaid = Number(order.paidAmount) || 0;
          const due = finalAmount - alreadyPaid;
          order.dueAmount = due > 0 ? due : 0;
          if (order.dueAmount <= 0) order.paymentStatus = "Paid";
        }

        await order.save();
        await freeTable(order.table);

        ok++;
        results.push({ id, ok: true });

        io.to(restaurantId.toString()).emit("order:checkedOut", {
          orderId: order._id,
          tableId: order.table._id,
          checkedOutAt: order.checkedOutAt,
          vatPercent,
          discountPercent,
          finalAmount,
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
