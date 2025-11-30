import mongoose from "mongoose";

const itemStockSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
      unique: true,
    },
    // variantUnit: {
    //   type: String,
    //   required: true,
    // },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);
// itemStockSchema.index(
//   { item: 1, variantUnit: 1, restaurant: 1 },
//   { unique: true }
// );

export default mongoose.model("ItemStock", itemStockSchema);
