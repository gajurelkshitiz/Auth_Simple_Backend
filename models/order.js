import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
  unitName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
});

const paymentMethodSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ["cash", "card", "online", "others"],
    default: "cash",
  },
  split: {
    cash: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
    online: { type: Number, default: 0 },
  },
  others: {
    type: String,
    enum: ["cash-card", "cash-online", "card-online"],
    default: null,
  },
});

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: Number, required: true, unique: true },

    orderType: {
      type: String,
      enum: ["dine-in", "takeaway", "delivery"],
      required: true,
      default: "dine-in",
    },

    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: function () {
        return this.orderType === "dine-in";
      },
    },
    area: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Area",
      required: function () {
        return this.orderType === "dine-in";
      },
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },

    items: [orderItemSchema],
    previousItems: [orderItemSchema],

    totalAmount: { type: Number, required: true, default: 0 },
    deliveryCharge: { type: Number, default: 0, min: 0 },

    discountPercent: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    vatPercent: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },

    paymentStatus: {
      type: String,
      enum: ["Paid", "Due", "Credit"],
      default: "Due",
    },

    paymentMethod: { type: paymentMethodSchema, default: () => ({}) },

    customerName: {
      type: String,
      required: function () {
        return this.orderType !== "delivery";
      },
    },

    deliveryAddress: {
      type: String,
      default: null,
      required: function () {
        return this.orderType === "delivery";
      },
    },

    status: {
      type: String,
      enum: ["active", "cancelled", "checkedout"],
      default: "active",
    },

    cancelReason: { type: String, default: "" },

    checkedOutAt: { type: Date },

    note: { type: String, default: "" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
