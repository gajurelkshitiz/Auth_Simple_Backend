import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    unitName: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: Number, required: true },

    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true,
    },
    area: { type: mongoose.Schema.Types.ObjectId, ref: "Area", required: true },

    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true },
    vatPercent: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    finalTotal: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Due", "Credit"],
      default: "Paid",
    },
    customerName: { type: String },
    note: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    checkedOut: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

orderSchema.index({ restaurant: 1, orderId: 1 }, { unique: true });

export default mongoose.model("Order", orderSchema);
