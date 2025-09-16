import Order from "../models/order.js";

const getNextOrderId = async (adminId) => {
  const lastOrder = await Order.findOne({ adminId }).sort({ orderId: -1 });
  return lastOrder ? lastOrder.orderId + 1 : 1;
};

export const createOrder = async (req, res) => {
  try {
    const adminId = req.user.adminId;
    const nextId = await getNextOrderId(adminId);
    console.log("Next order id = ", nextId);

    if (
      !req.body.items ||
      !Array.isArray(req.body.items) ||
      req.body.items.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "Order must contain at least one item" });
    }

    for (const item of req.body.items) {
      if (
        !item.itemName ||
        !item.unitName ||
        item.price == null ||
        item.quantity == null
      ) {
        return res.status(400).json({
          error: "Each item must have itemName, unitName, price, and quantity",
        });
      }
    }

    const newOrder = await Order.create({
      adminId,
      orderId: nextId,
      tableName: req.body.tableName,
      area: req.body.area || "",
      items: req.body.items,
      totalAmount: req.body.totalAmount,
      paidAmount: req.body.paidAmount || 0,
      dueAmount: req.body.dueAmount || 0,
      paymentStatus: req.body.paymentStatus || "Paid",
      customerName: req.body.customerName || "",
      note: req.body.note || "",
    });

    res
      .status(201)
      .json({ message: "Order created successfully", order: newOrder });
  } catch (err) {
    console.error("[CREATE ORDER ERROR]", err);
    res.status(500).json({ error: "Failed to create order" });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({ adminId: req.user.adminId }).sort({
      createdAt: -1,
    });
    res.status(200).json(orders);
  } catch (err) {
    console.error("[GET ALL ORDERS ERROR]", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      adminId: req.user.adminId,
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.status(200).json(order);
  } catch (err) {
    console.error("[GET ORDER ERROR]", err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
};

export const getOrderByOrderId = async (req, res) => {
  try {
    const order = await Order.findOne({
      orderId: Number(req.params.orderId),
      adminId: req.user.adminId,
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.status(200).json(order);
  } catch (err) {
    console.error("[GET ORDER BY ORDERID ERROR]", err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: req.params.id, adminId: req.user.adminId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedOrder)
      return res.status(404).json({ error: "Order not found" });

    res
      .status(200)
      .json({ message: "Order updated successfully", order: updatedOrder });
  } catch (err) {
    console.error("[UPDATE ORDER ERROR]", err);
    res.status(500).json({ error: "Failed to update order" });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.findOneAndDelete({
      _id: req.params.id,
      adminId: req.user.adminId,
    });
    if (!deletedOrder)
      return res.status(404).json({ error: "Order not found" });

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (err) {
    console.error("[DELETE ORDER ERROR]", err);
    res.status(500).json({ error: "Failed to delete order" });
  }
};
