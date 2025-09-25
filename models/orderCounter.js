import mongoose from "mongoose";

const orderCounterSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      unique: true,
    },
    seq: { type: Number, default: -1 },
  },
  { timestamps: true }
);

export default mongoose.model("OrderCounter", orderCounterSchema);
