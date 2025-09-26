import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const login = async (req, res) => {
  try {
    const { password } = req.body;
    const email = (req.body.email || "").trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ error: "Email and Password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid Email or Password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid Email or Password" });
    }

    const populatedUser = await User.findById(user._id)
      .populate("restaurant", "name address")
      .populate("role", "name");

    if (
      populatedUser.role?.name !== "super-admin" &&
      !populatedUser.restaurant
    ) {
      return res.status(400).json({
        error:
          "User is not assigned to any restaurant. Ask a super-admin to attach a restaurant.",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: populatedUser.role.name,
        restaurantId: populatedUser.restaurant
          ? populatedUser.restaurant._id
          : null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15d" }
    );

    res.status(200).json({
      token,
      message: "Login successful",
      role: populatedUser?.role?.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
