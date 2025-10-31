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

    const { restaurantName, vatNo, panNo, email, phone, address, footerNote } =
      req.body;

    if (vatNo && panNo) {
      return res.status(400).json({
        error:
          "You can only have either a VAT number or a PAN number, not both.",
      });
    }

    if (!vatNo && !panNo) {
      return res.status(400).json({
        error: "Please provide either a VAT number or a PAN number.",
      });
    }

    const cleanVatNo = vatNo || null;
    const cleanPanNo = panNo || null;

    let logoUrl;
    if (req.file) {
      logoUrl = `/uploads/logos/${req.file.filename}`;
    }

    const updates = {
      ...(restaurantName !== undefined && { restaurantName }),
      vatNo: cleanVatNo,
      panNo: cleanPanNo,
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(address !== undefined && { address }),
      ...(footerNote !== undefined && { footerNote }),
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
