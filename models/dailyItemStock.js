import mongoose from "mongoose";

const dailyItemStockSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    totalStock: {
      type: Number,
      required: true,
      default: 0,
    },
    remainingStock: {
      type: Number,
      required: true,
      default: 0,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

dailyItemStockSchema.index(
  { item: 1, date: 1, restaurant: 1 },
  { unique: true }
);

export default mongoose.model("DailyItemStock", dailyItemStockSchema);
