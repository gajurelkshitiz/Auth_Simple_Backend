import mongoose from "mongoose";

const kotSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    type: {
      type: String,
      enum: ["NEW", "UPDATE", "VOID"],
      required: true,
    },
    items: [
      {
        item: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
        name: String,
        unitName: String,
        quantity: Number,
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByRole: String,
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("KOT", kotSchema);
