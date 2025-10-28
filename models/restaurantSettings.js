import mongoose from "mongoose";

const restaurantSettingsSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      unique: true,
    },
    restaurantName: {
      type: String,
      trim: true,
      default: "Deskgoo Cafe",
    },

    logoUrl: {
      type: String,
      default: null,
    },
    vatNo: {
      type: String,
      trim: true,
    },
    panNo: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },

    footerNote: {
      type: String,
      trim: true,
      default: "Thank you for dining with us!",
    },
  },
  { timestamps: true }
);

export default mongoose.model("RestaurantSettings", restaurantSettingsSchema);
