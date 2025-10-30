import RestaurantSettings from "../models/restaurantSettings.js";
import Restaurant from "../models/restaurant.js";
import path from "path";

export const getRestaurantSettings = async (req, res) => {
  try {
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      return res.status(400).json({ error: "Restaurant context missing" });
    }

    const settings = await RestaurantSettings.findOne({
      restaurant: restaurantId,
    });

    if (!settings) {
      return res.status(200).json({
        settings: {
          restaurantName: "Deskgoo Cafe",
          logoUrl: null,
          vatNo: "",
          panNo: "",
          email: "",
          phone: "",
          address: "",
          footerNote: "Thank you for dining with us!",
        },
      });
    }

    res.status(200).json({ settings });
  } catch (err) {
    console.error("[GET SETTINGS ERROR]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateRestaurantSettings = async (req, res) => {
  try {
    console.log("PUT /restaurant-settings called");
    console.log("User from token:", req.user);
    console.log("Request body:", req.body);
    console.log("Uploaded file:", req.file);

    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      return res.status(400).json({ error: "Restaurant context missing" });
    }

    if (!["admin", "manager"].includes(req.user?.role)) {
      return res.status(403).json({ error: "Permission Denied" });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    const { restaurantName, vatNo, panNo, email, phone, address } = req.body;

    let logoUrl;
    if (req.file) {
      logoUrl = path.join(req.file.destination, req.file.filename);
    }

    const updates = {
      ...(restaurantName && { restaurantName }),
      ...(vatNo && { vatNo }),
      ...(panNo && { panNo }),
      ...(email && { email }),
      ...(phone && { phone }),
      ...(address && { address }),
      ...(footerNote && { footerNote }),
      ...(logoUrl && { logoUrl }),
      restaurant: restaurantId,
    };

    const settings = await RestaurantSettings.findOneAndUpdate(
      { restaurant: restaurantId },
      { $set: updates },
      { new: true, upsert: true }
    );

    res.status(200).json({
      message: "Restaurant settings updated successfully",
      settings,
    });
  } catch (err) {
    console.error("[UPDATE SETTINGS ERROR]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
