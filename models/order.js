import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  unitName: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  imagePath: { type: String },
});

const OrderSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    orderId: { type: Number, required: true },
    tableName: { type: String, required: true },
    area: { type: String, default: "" },
    items: [OrderItemSchema],
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Due", "Credit"],
      default: "Paid",
    },
    customerName: { type: String },
    note: { type: String },
  },
  { timestamps: true }
);

OrderSchema.index({ adminId: 1, orderId: 1 }, { unique: true });

OrderSchema.pre("validate", function (next) {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    this.dueAmount = Math.max(this.totalAmount - (this.paidAmount || 0), 0);
  }
  next();
});

export default mongoose.model("Order", OrderSchema);
