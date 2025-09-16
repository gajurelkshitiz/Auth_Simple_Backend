import mongoose from "mongoose";

const tableSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Table name is required"],
      trim: true,
    },
    capacity: {
      type: Number,
      default: 4,
      min: [1, "Capacity must be at least 1"],
    },
    status: {
      type: String,
      enum: ["Available", "Occupied", "Reserved"],
      default: "Available",
    },
    image: { type: String },
    area: { type: mongoose.Schema.Types.ObjectId, ref: "Area", required: true },
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

export default mongoose.model("Table", tableSchema);
