import mongoose from "mongoose";

const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    pricePerUnit: { type: Number, required: true },

    totalCost: { type: Number, default: 0 },

    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
  },
  { timestamps: true }
);

ingredientSchema.pre("save", function (next) {
  this.totalCost = this.quantity * this.pricePerUnit;
  next();
});

ingredientSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();

  const qty = update.quantity ?? update.$set?.quantity;
  const ppu = update.pricePerUnit ?? update.$set?.pricePerUnit;

  if (qty !== undefined || ppu !== undefined) {
    const newQty = qty ?? this._update.quantity;
    const newPPU = ppu ?? this._update.pricePerUnit;

    this.set({
      totalCost: newQty * newPPU,
    });
  }

  next();
});

export default mongoose.model("Ingredient", ingredientSchema);
