import mongoose from "mongoose";

const stockHistorySchema = new mongoose.Schema(
  {
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    date: { type: Date, default: Date.now },
  },
  { _id: false }
);

const stockSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    unit: { type: String, trim: true },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    autoDecrement: { type: Boolean, default: false },
    alertThreshold: { type: Number, default: 0 },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: false,
      default: null,
    },
    history: [stockHistorySchema],
  },
  { timestamps: true }
);

stockSchema.index({ restaurant: 1, name: 1, unit: 1 }, { unique: true });

export default mongoose.model("Stock", stockSchema);
