import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    unitName: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
  },
  { _id: false }
);

const paymentMethodSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: [
        "cash",
        "card",
        "online",
        "cash-card",
        "cash-online",
        "card-online",
      ],
    },
    cashAmount: { type: Number, default: 0 },
    cardAmount: { type: Number, default: 0 },
    onlineAmount: { type: Number, default: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true,
    },
    items: { type: [orderItemSchema], required: true },
    paymentStatus: {
      type: String,
      enum: ["Due", "Paid", "Credit"],
      default: "Due",
    },
    paidAmount: { type: Number, default: 0 },
    paymentMethod: { type: paymentMethodSchema, default: null },
    customerName: { type: String },
    note: { type: String },
    createdAt: { type: Date, default: Date.now },
    vatPercent: { type: Number, default: 13 },
    vatAmount: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 },
    restaurantName: { type: String, default: "Deskgoo Cafe" },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
