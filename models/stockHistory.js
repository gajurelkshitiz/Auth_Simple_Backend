import mongoose from "mongoose";

const stockHistorySchema = new mongoose.Schema(
  {
    stock: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stock",
      required: true,
    },
    quantityAdded: { type: Number, required: true },
    pricePerUnit: { type: Number, required: true },
    totalCost: { type: Number },
    note: { type: String },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
  },
  { timestamps: true }
);

stockHistorySchema.pre("save", function (next) {
  this.totalCost = this.quantityAdded * this.pricePerUnit;
  next();
});

export default mongoose.model("StockHistory", stockHistorySchema);
