import mongoose from "mongoose";

const areaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
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

export default mongoose.model("Area", areaSchema);
