import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    units: [
      {
        unitName: { type: String, required: true, trim: true },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    isAvailable: { type: Boolean, default: true },
    category: {
      type: String,
      enum: ["food", "drink", "other"],
      default: "food",
    },
    image: { type: String },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Admin",
    },
    createdByModel: {
      type: String,
      enum: ["Admin", "Manager"],
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Item", itemSchema);
