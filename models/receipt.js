import mongoose from "mongoose";

const receiptSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    restaurantName: { type: String, required: true },
    tableName: { type: String, required: true },
    areaName: { type: String },
    customerName: { type: String },
    note: { type: String },
    items: [
      {
        name: String,
        unitName: String,
        price: Number,
        quantity: Number,
      },
    ],
    subtotal: Number,
    discountPercent: Number,
    discountAmount: Number,
    vatPercent: Number,
    vatAmount: Number,
    finalAmount: Number,
    paymentStatus: {
      type: String,
      enum: ["Paid", "Due", "Credit"],
      default: "Paid",
    },
    printedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Receipt", receiptSchema);
