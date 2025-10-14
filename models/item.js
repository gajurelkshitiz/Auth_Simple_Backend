import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
    unit: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },

    stockQuantity: { type: Number, default: 0 },
    autoStock: { type: Boolean, default: false },
    alertThreshold: { type: Number, default: 0 },
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    image: { type: String },

    variants: {
      type: [variantSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "At least one unit/price is required",
      },
    },

    available: { type: Boolean, default: true },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByRole: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Item", itemSchema);
