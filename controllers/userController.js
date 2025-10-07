import Role from "../models/role.js";
import User from "../models/user.js";
import bcrypt from "bcryptjs";
import Restaurant from "../models/restaurant.js";

const R = {
  SUPER: "super-admin",
  ADMIN: "admin",
  MANAGER: "manager",
  STAFF: "staff",
};

export const createUser = async (req, res) => {
  try {
    const {
      name,
      password,
      role,
      restaurantId: bodyRestaurantId,
    } = req.body ?? {};
    const email = (req.body?.email || "").trim().toLowerCase();

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const roleDoc = await Role.findOne({ name: role });
    if (!roleDoc) {
      return res.status(400).json({ error: "Invalid role specified." });
    }

    const caller = req.user?.role;

    if (caller === R.SUPER) {
      if (role !== R.SUPER && !bodyRestaurantId) {
        return res.status(400).json({
          error:
            "restaurantId is required when super-admin creates non–super-admin user.",
        });
      }
    } else if (caller === R.ADMIN) {
      if (![R.MANAGER, R.STAFF].includes(role)) {
        return res
          .status(403)
          .json({ error: "Admins can only create manager or staff." });
      }
    } else if (caller === R.MANAGER) {
      if (role !== R.STAFF) {
        return res
          .status(403)
          .json({ error: "Managers can only create staff." });
      }
    } else {
      return res.status(403).json({ error: "Access denied." });
    }

    let restaurantId = null;
    if (caller === R.SUPER) {
      restaurantId = role === R.SUPER ? null : bodyRestaurantId;
      if (restaurantId) {
        const r = await Restaurant.findById(restaurantId);
        if (!r)
          return res.status(400).json({ error: "Invalid restaurant ID." });
      }
    } else {
      const r = await Restaurant.findById(req.user.restaurantId);
      if (!r)
        return res
          .status(400)
          .json({ error: "Invalid caller restaurant context." });
      restaurantId = r._id;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: roleDoc._id,
      restaurant: restaurantId,
    });

    const populatedUser = await User.findById(user._id)
      .populate("role", "name")
      .populate("restaurant", "name address");

    return res
      .status(201)
      .json({ message: "User created successfully", user: populatedUser });
  } catch (err) {
    console.error("[CREATE USER ERROR]", err);
    if (err?.code === 11000) {
      return res.status(400).json({ error: "Email already exists" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const findUsers = async (req, res) => {
  try {
    let roleFilter = {};
    if (req.user.role === R.MANAGER) {
      const staffRole = await Role.findOne({ name: R.STAFF }).select("_id");
      roleFilter = staffRole ? { role: staffRole._id } : { _id: null };
    }
    const users = await User.find({
      restaurant: req.user.restaurantId,
      ...roleFilter,
    })
      .populate("role", "name")
      .populate("restaurant", "name address");
    return res.status(200).json({ users });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getUserById = async (req, res) => {
  try {
    const isSuper = req.user?.role === R.SUPER;
    const query = isSuper
      ? { _id: req.params.id }
      : { _id: req.params.id, restaurant: req.user.restaurantId };

    const user = await User.findOne(query)
      .populate("role", "name")
      .populate("restaurant", "name address");

    if (!user) return res.status(404).json({ error: "User not found" });
    return res.status(200).json({ user });
  } catch (err) {
    console.error("[GET USER ERROR]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const assignRestaurant = async (req, res) => {
  try {
    if (req.user?.role !== R.SUPER) {
      return res
        .status(403)
        .json({ error: "Only super-admin can reassign restaurants." });
    }
    const { userId, restaurantId } = req.body ?? {};
    if (!userId || !restaurantId) {
      return res
        .status(400)
        .json({ error: "userId and restaurantId are required." });
    }
    const okId = (id) => /^[a-f\d]{24}$/i.test(id);
    if (!okId(userId) || !okId(restaurantId)) {
      return res.status(400).json({ error: "Invalid IDs" });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant)
      return res.status(400).json({ error: "Invalid restaurant ID." });

    const user = await User.findByIdAndUpdate(
      userId,
      { restaurant: restaurant._id },
      { new: true }
    )
      .populate("role", "name")
      .populate("restaurant", "name address");

    if (!user) return res.status(404).json({ error: "User not found" });
    return res.status(200).json({ message: "Restaurant assigned", user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
