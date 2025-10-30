import Receipt from "../models/receipt.js";
import Order from "../models/order.js";
import RestaurantSettings from "../models/restaurantSettings.js";

const getRestaurantNameOrDefault = async (restaurantId) => {
  const settings = await RestaurantSettings.findOne({
    restaurant: restaurantId,
  });
  return settings?.restaurantName || "Deskgoo Cafe";
};

export const saveReceipt = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId)
      .populate("restaurant")
      .populate("table")
      .populate("area")
      .populate("items.item");

    if (!order) return res.status(404).json({ error: "Order not found" });

    const restaurantName = await getRestaurantNameOrDefault(
      order.restaurant._id
    );

    const itemsTotal = order.items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

    const discountAmount = order.discountPercent
      ? (itemsTotal * order.discountPercent) / 100
      : order.discountAmount || 0;

    const vatAmount = order.vatPercent
      ? ((itemsTotal - discountAmount) * order.vatPercent) / 100
      : 0;

    const finalAmount = itemsTotal - discountAmount + vatAmount;

    const receiptData = {
      order: order._id,
      restaurantName,
      tableName: order.table.name,
      areaName: order.area?.name,
      customerName: order.customerName,
      note: order.note,
      items: order.items.map((i) => ({
        name: i.item.name,
        unitName: i.unitName,
        price: i.price,
        quantity: i.quantity,
      })),
      subtotal: order.totalAmount,
      discountPercent: order.discountPercent,
      discountAmount,
      vatPercent: order.vatPercent,
      vatAmount,
      finalAmount,
      paymentStatus: order.paymentStatus,
      printedAt: new Date(),
    };

    const savedReceipt = await Receipt.findOneAndUpdate(
      { order: order._id },
      { $set: receiptData },
      { new: true, upsert: true }
    );

    res.status(200).json(savedReceipt);
  } catch (err) {
    console.error("[saveReceipt]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getReceiptByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;
    let receipt = await Receipt.findOne({ order: orderId });

    if (!receipt) return res.status(404).json({ error: "Receipt not found" });

    if (!receipt.restaurantName && receipt.order) {
      const order = await Order.findById(orderId).populate("restaurant");
      if (order?.restaurant) {
        const settings = await RestaurantSettings.findOne({
          restaurant: order.restaurant._id,
        });
        receipt.restaurantName = settings?.restaurantName || "Deskgoo Cafe";
      }
    }

    res.json(receipt);
  } catch (err) {
    console.error("[getReceiptByOrderId]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
