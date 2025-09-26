import Role from "../models/role.js";
import User from "../models/user.js";
import bcrypt from "bcryptjs";
import Restaurant from "../models/restaurant.js";

async function requireRoleByName(name, res) {
  const role = await Role.findOne({ name });
  if (!role) {
    res.status(400).json({ error: `Role '${name}' not found` });
    throw new Error("abort");
  }
  return role;
}

export const createUser = async (req, res) => {
  try {
    const { name, password, role, restaurantId: bodyRestaurantId } = req.body;
    const email = (req.body.email || "").trim().toLowerCase();

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const roleCheck = await Role.findOne({ name: role });
    if (!roleCheck) {
      return res.status(400).json({ error: "Invalid role specified." });
    }

    if (req.user?.role !== "super-admin" && role === "admin") {
      return res
        .status(403)
        .json({ error: "Only super-admin can create admin users." });
    }
    if (
      req.user?.role !== "admin" &&
      (role === "staff" || role === "manager")
    ) {
      return res
        .status(403)
        .json({ error: "Only admin can create staff or manager users." });
    }

    let restaurantId = null;

    if (role === "admin" && req.user?.role === "super-admin") {
      if (!bodyRestaurantId) {
        return res
          .status(400)
          .json({ error: "restaurantId is required when creating an admin." });
      }
      const restaurant = await Restaurant.findById(bodyRestaurantId);
      if (!restaurant) {
        return res.status(400).json({ error: "Invalid restaurant ID." });
      }
      restaurantId = restaurant._id;
    } else if (req.user?.role === "admin") {
      if (!req.user.restaurantId) {
        return res
          .status(400)
          .json({ error: "Admin has no restaurant assigned." });
      }
      const restaurant = await Restaurant.findById(req.user.restaurantId);
      if (!restaurant) {
        return res.status(400).json({ error: "Invalid restaurant ID." });
      }
      restaurantId = restaurant._id;
    } else if (
      req.user?.role === "super-admin" &&
      (role === "manager" || role === "staff")
    ) {
      if (bodyRestaurantId) {
        const restaurant = await Restaurant.findById(bodyRestaurantId);
        if (!restaurant) {
          return res.status(400).json({ error: "Invalid restaurant ID." });
        }
        restaurantId = restaurant._id;
      } else {
        return res
          .status(400)
          .json({ error: "restaurantId is required for manager/staff." });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: roleCheck._id,
      restaurant: restaurantId,
    });

    const populatedUser = await User.findById(user._id)
      .populate("role", "name")
      .populate("restaurant", "name address");

    res
      .status(201)
      .json({ message: "User created successfully", user: populatedUser });
  } catch (err) {
    if (err?.message === "abort") return;
    console.error(err);
    if (err && err.code === 11000) {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const findUsers = async (req, res) => {
  try {
    let role;
    if (req.user.role === "manager") {
      role = await Role.findOne({ name: "staff" }).select("_id");
    }
    const users = await User.find({
      restaurant: req.user.restaurantId,
      ...(role ? { role: role._id } : {}),
    })
      .populate("role", "name")
      .populate("restaurant", "name address");
    res.status(200).json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("role", "name")
      .populate("restaurant", "name address");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const assignRestaurant = async (req, res) => {
  try {
    if (req.user?.role !== "super-admin") {
      return res
        .status(403)
        .json({ error: "Only super-admin can reassign restaurants." });
    }
    const { userId, restaurantId } = req.body;
    if (!userId || !restaurantId) {
      return res
        .status(400)
        .json({ error: "userId and restaurantId are required." });
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
    res.status(500).json({ error: "Internal Server Error" });
  }
};
