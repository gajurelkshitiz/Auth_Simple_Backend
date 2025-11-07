import Restaurant from "../models/restaurant.js";
import { emitToRestaurant } from "../utils/socket.js";

const isSuper = (role) => role === "super-admin";
const isAdmin = (role) => role === "admin";

const ensureRestaurant = (req, res) => {
  const restaurantId = req.user?.restaurantId;
  if (!restaurantId) {
    res.status(400).json({ error: "Restaurant context missing in token" });
    return null;
  }
  return restaurantId;
};

export const createRestaurant = async (req, res) => {
  try {
    if (!isSuper(req.user?.role)) {
      return res
        .status(403)
        .json({ error: "Only super-admin can create restaurants" });
    }

    const { name, address, phone } = req.body;
    if (!name || !address || !phone) {
      return res
        .status(400)
        .json({ error: "Name, address, and phone are required" });
    }

    const restaurant = await Restaurant.create({ name, address, phone });

    emitToRestaurant(req, restaurant._id, "restaurantCreated", { restaurant });
    res
      .status(201)
      .json({ message: "Restaurant created successfully", restaurant });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getRestaurants = async (req, res) => {
  try {
    const role = req.user?.role;

    if (isSuper(role)) {
      const restaurants = await Restaurant.find().sort({ createdAt: -1 });
      return res.status(200).json({ restaurants });
    }

    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    return res.status(200).json({ restaurants: [restaurant] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getRestaurantById = async (req, res) => {
  try {
    const role = req.user?.role;
    const { id } = req.params;

    if (!isSuper(role)) {
      const restaurantId = ensureRestaurant(req, res);
      if (!restaurantId) return;
      if (id !== restaurantId.toString()) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }
    res.status(200).json({ restaurant });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateRestaurant = async (req, res) => {
  try {
    const role = req.user?.role;
    const { id } = req.params;

    if (isSuper(role)) {
    } else if (isAdmin(role)) {
      const restaurantId = ensureRestaurant(req, res);
      if (!restaurantId) return;
      if (id !== restaurantId.toString()) {
        return res
          .status(403)
          .json({ error: "Admins can only update their own restaurant" });
      }
    } else {
      return res.status(403).json({
        error: "Only super-admin or admin (own) can update a restaurant",
      });
    }

    const updates = { ...req.body };
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedRestaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    emitToRestaurant(req, updatedRestaurant._id, "restaurant:updated", {
      restaurant: updatedRestaurant,
    });

    res.status(200).json({
      message: "Restaurant updated successfully",
      restaurant: updatedRestaurant,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteRestaurant = async (req, res) => {
  try {
    if (!isSuper(req.user?.role)) {
      return res
        .status(403)
        .json({ error: "Only super-admin can delete restaurants" });
    }

    const { id } = req.params;
    const deletedRestaurant = await Restaurant.findByIdAndDelete(id);

    if (!deletedRestaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    emitToRestaurant(req, deletedRestaurant._id, "restaurant:deleted", {
      restaurantId: id,
    });

    res.status(200).json({
      message: "Restaurant deleted successfully",
      deletedRestaurant,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
