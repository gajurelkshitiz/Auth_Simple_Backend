import mongoose from "mongoose";
import Order from "../models/order.js";
import Table from "../models/table.js";
import Area from "../models/area.js";
import OrderCounter from "../models/orderCounter.js";
import KOT from "../models/kot.js";
import Item from "../models/item.js";
import { printKOT } from "../utils/printKOT.js";
import { io } from "../index.js";
import {
  decreaseItemStockWithConversion,
  restoreItemStockWithConversion,
} from "./itemStockController.js";

function diffOrderItems(oldItems = [], newItems = []) {
  const key = (it) => {
    const itemId = it?.item?.toString?.() ?? String(it?.item ?? "");
    const unit = (it?.unitName ?? "").toString();
    return `${itemId}__${unit}`;
  };

  const oldMap = new Map();
  const newMap = new Map();

  oldItems.forEach((it) =>
    oldMap.set(key(it), {
      ...it,
      quantity: Number(it.quantity || 0),
    })
  );

  newItems.forEach((it) =>
    newMap.set(key(it), {
      ...it,
      quantity: Number(it.quantity || 0),
    })
  );

  const added = [];
  const removed = [];
  const qtyChanged = [];

  for (const [k, newIt] of newMap.entries()) {
    const oldIt = oldMap.get(k);
    if (!oldIt) {
      added.push(newIt);
    } else if (oldIt.quantity !== newIt.quantity) {
      qtyChanged.push({
        ...newIt,
        oldQty: oldIt.quantity,
      });
    }
  }

  for (const [k, oldIt] of oldMap.entries()) {
    if (!newMap.has(k)) {
      removed.push(oldIt);
    }
  }

  return { added, removed, qtyChanged };
}

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

function computeTotals(items = [], deliveryCharge = 0) {
  const itemsTotal = items.reduce(
    (sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 0),
    0
  );

  return {
    itemsTotal,
    totalAmount: itemsTotal + Number(deliveryCharge || 0),
  };
}

function applyPayment(order, paymentStatus, customerName, paymentMethod = {}) {
  const itemsTotal = Number(order.itemsTotal || 0);
  const discountPercent = Number(order.discountPercent || 0);
  const vatPercent = Number(order.vatPercent || 0);
  const deliveryCharge = Number(order.deliveryCharge || 0);

  const discountAmount = (itemsTotal * discountPercent) / 100;
  const afterDiscount = itemsTotal - discountAmount;

  const vatAmount = (afterDiscount * vatPercent) / 100;
  const afterVAT = afterDiscount + vatAmount;

  const finalAmount = afterVAT + deliveryCharge;

  order.discountAmount = discountAmount;
  order.vatAmount = vatAmount;
  order.finalAmount = finalAmount;

  if (!paymentMethod.method) paymentMethod.method = "cash";
  order.paymentMethod = paymentMethod;

  if (paymentStatus === "Paid") {
    order.paidAmount = finalAmount;
    order.dueAmount = 0;
  } else {
    order.paidAmount = 0;
    order.dueAmount = finalAmount;
  }

  order.customerName = customerName ?? "Guest";
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
      orderType = "dine-in",
      deliveryCharge = 0,
      paymentStatus = "Due",
      customerName,
      deliveryAddress,
      note,
      vatPercent = 0,
      discountPercent = 0,
      paymentMethod = {},
    } = req.body ?? {};

    if (orderType === "dine-in") {
      if (!tableId || !mongoose.Types.ObjectId.isValid(tableId)) {
        return res.status(400).json({ error: "Invalid or missing tableId" });
      }
    }

    if (!validateItems(items, res)) return;

    let areaId = null;
    let table = null;

    if (orderType === "dine-in") {
      table = await Table.findById(tableId).populate("area", "name");
      if (!table || table.restaurant.toString() !== restaurantId.toString()) {
        return res
          .status(404)
          .json({ error: "Table not found in your restaurant" });
      }
      areaId = table.area?._id ?? table.area;
      if (!areaId)
        return res
          .status(400)
          .json({ error: "Table has no valid area reference" });
    }

    const orderId = await nextOrderIdForRestaurant(restaurantId);
    const { totalAmount } = computeTotals(items, deliveryCharge);

    const order = await Order.create({
      orderId,
      orderType,
      table: table?._id ?? null,
      area: areaId ?? null,
      restaurant: restaurantId,
      items,
      totalAmount,
      deliveryCharge: orderType === "delivery" ? deliveryCharge : 0,
      deliveryAddress: orderType === "delivery" ? deliveryAddress : null,
      vatPercent,
      discountPercent,
      checkedOut: false,
      note,
      createdBy: req.user.userId,
      adminId: req.user.userId,
      customerName: customerName ?? null,
    });

    applyPayment(order, paymentStatus, customerName, paymentMethod);
    await order.save();

    if (orderType === "dine-in") await occupyTable(table._id, order._id);

    await order.populate("items.item", "name");

    io.to(restaurantId.toString()).emit("order:created", {
      orderId: order._id,
      tableId: table?._id,
      totalAmount: order.totalAmount,
      status: "active",
      createdAt: new Date(),
    });

    if (orderType === "dine-in") {
      const kot = await KOT.create({
        restaurant: restaurantId,
        table: table._id,
        order: order._id,
        type: "NEW",
        note: note || "",
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
          note: note || "",
          createdAt: new Date(),
        });
      } catch (err) {
        console.warn("[KOT print error]", err.message);
      }
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

    if (order.status === "checkedout") {
      return res
        .status(400)
        .json({ error: "Checked-out orders cannot be cancelled" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ error: "Order already cancelled" });
    }

    order.cancelReason = cancelReason;
    order.status = "cancelled";

    if (order.orderType === "dine-in") {
      const kot = await KOT.create({
        restaurant: restaurantId,
        table: order.table._id,
        order: order._id,
        type: "VOID",
        items: order.items.map((it) => ({
          item: it.item,
          name: it.item?.name,
          unitName: it.unitName,
          quantity: it.quantity,
          action: "CANCEL",
        })),
        createdBy: req.user.userId,
        createdByRole: req.user.role,
      });

      printKOT(await kot.populate(["table", "order"]));
    }

    if (order.status === "checkedout") {
      await restoreItemStockWithConversion(order.items, restaurantId);
    }

    if (order.orderType === "dine-in") await freeTable(order.table);

    await order.save();

    io.to(restaurantId.toString()).emit("order:cancelled", {
      orderId: order._id,
      tableId: order.table?._id,
      cancelReason,
      cancelledAt: new Date(),
    });

    return res.status(200).json({ message: "Order cancelled", order });
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

    const lastKOT = await KOT.findOne({ order: order._id })
      .sort({ createdAt: -1 })
      .lean();

    const oldKOTItems = lastKOT?.items || [];

    let hasChanges = false;
    let kotItems = [];

    if (items && Array.isArray(items)) {
      if (!validateItems(items, res)) return;

      const { added, removed, qtyChanged } = diffOrderItems(oldKOTItems, items);
      hasChanges =
        added.length > 0 || removed.length > 0 || qtyChanged.length > 0;

      const itemIds = [
        ...added.map((it) => it.item),
        ...removed.map((it) => it.item),
        ...qtyChanged.map((it) => it.item),
      ].filter(Boolean);

      let itemMap = new Map();
      if (itemIds.length) {
        const itemDocs = await Item.find({ _id: { $in: itemIds } });
        itemMap = new Map(itemDocs.map((d) => [d._id.toString(), d]));
      }

      kotItems = [];

      for (const it of removed) {
        kotItems.push({
          item: it.item,
          name: itemMap.get(it.item.toString())?.name || it.name,
          unitName: it.unitName,
          quantity: it.quantity,
          changeType: "VOIDED",
        });
      }

      for (const it of added) {
        kotItems.push({
          item: it.item,
          name: itemMap.get(it.item.toString())?.name || it.name,
          unitName: it.unitName,
          quantity: it.quantity,
          changeType: "ADDED",
        });
      }

      for (const ch of qtyChanged) {
        kotItems.push({
          item: ch.item,
          name: itemMap.get(ch.item.toString())?.name || ch.name,
          unitName: ch.unitName,
          oldQuantity: ch.oldQty,
          quantity: ch.newQty,
          changeType: "UPDATED",
        });
      }

      order.items = items;
      order.totalAmount = computeTotals(items).totalAmount;
    }

    if (paymentStatus)
      applyPayment(order, paymentStatus, customerName, paymentMethod);

    const oldNote = order.note ?? "";
    const noteChanged = note !== undefined && note !== oldNote;
    if (note !== undefined) order.note = note;

    await order.save();

    io.to(restaurantId.toString()).emit("order:updated", {
      orderId: order._id,
      tableId: order.table?._id,
      totalAmount: order.totalAmount,
      items: order.items,
      updatedAt: new Date(),
    });

    if (order.orderType === "dine-in" && (hasChanges || noteChanged)) {
      const kotPayloadItems = kotItems.map((it) => {
        const out = {
          item: it.item,
          name: it.name,
          unitName: it.unitName,
          quantity: it.quantity,
          changeType: it.changeType,
        };
        if (it.changeType === "UPDATED") {
          out.oldQuantity = it.oldQuantity ?? 0;
        }
        return out;
      });

      const kot = await KOT.create({
        restaurant: restaurantId,
        table: order.table._id,
        order: order._id,
        type: "UPDATE",
        note: order.note,
        items: kotPayloadItems,
        createdBy: req.user.userId,
        createdByRole: req.user.role,
      });

      try {
        await printKOT(await kot.populate(["table", "order"]));
      } catch (err) {
        console.warn("[KOT print error]", err?.message || err);
      }
      io.to(restaurantId.toString()).emit("kot:update", {
        type: "UPDATE",
        table: order.table?.name,
        tableId: order.table?._id,
        orderId: order._id,
        items: kotPayloadItems,
        note: order.note || "",
        createdAt: new Date(),
      });
    }

    return res
      .status(200)
      .json({ message: "Order updated successfully", order });
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

    if (order.orderType === "dine-in") await freeTable(order.table);

    io.to(restaurantId.toString()).emit("order:deleted", {
      orderId: order._id,
      tableId: order.table?._id,
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
    order.status = "checkedout";

    await decreaseItemStockWithConversion(order.items, restaurantId);

    if (hasDue && force) applyPayment(order, "Paid", null, paymentMethod);
    else {
      const alreadyPaid = Number(order.paidAmount) || 0;
      const due = finalAmount - alreadyPaid;
      order.dueAmount = due > 0 ? due : 0;
      if (order.dueAmount <= 0) order.paymentStatus = "Paid";
    }

    if (order.orderType === "dine-in") await freeTable(order.table);

    await order.save();

    io.to(restaurantId.toString()).emit("order:checkedOut", {
      orderId: order._id,
      tableId: order.table?._id,
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
        const oldItems = order.items.map((it) => ({
          item: it.item,
          unitName: it.unitName,
          quantity: it.quantity,
        }));

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

        await decreaseItemStockWithConversion(order.items, restaurantId);

        if (hasDue && force) applyPayment(order, "Paid", null, paymentMethod);
        else {
          const alreadyPaid = Number(order.paidAmount) || 0;
          const due = finalAmount - alreadyPaid;
          order.dueAmount = due > 0 ? due : 0;
          if (order.dueAmount <= 0) order.paymentStatus = "Paid";
        }

        if (order.orderType === "dine-in") await freeTable(order.table);

        await order.save();
        ok++;
        results.push({ id, ok: true });
      } catch (e) {
        failed++;
        results.push({ id, ok: false, reason: e.message });
      }
    }

    return res.status(200).json({ ok, failed, results });
  } catch (err) {
    console.error("[ORDER bulkCheckout]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
