import Manager from "../models/manager.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const createManager = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const adminId = req.user.adminId;
    if (!adminId) {
      return res
        .status(403)
        .json({ error: "Only admins can create managers." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const manager = await Manager.create({
      name,
      email,
      password: hashedPassword,
      admin: adminId,
    });

    res.status(201).json({ message: "Manager created successfully", manager });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const loginManager = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and Password are required" });
    }

    const manager = await Manager.findOne({ email });
    if (!manager) {
      return res.status(401).json({ error: "Invalid Email or Password" });
    }

    const isMatch = await bcrypt.compare(password, manager.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid Email or Password" });
    }

    const token = jwt.sign(
      { userId: manager._id, role: "manager", adminId: manager.admin },
      process.env.JWT_SECRET,
      { expiresIn: "15d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      manager: { id: manager._id, name: manager.name, email: manager.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getManagers = async (req, res) => {
  try {
    const managers = await Manager.find({ admin: req.user.adminId }).populate(
      "admin",
      "email"
    );
    res.status(200).json(managers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getManagerById = async (req, res) => {
  try {
    const { id } = req.params;
    const manager = await Manager.findOne({
      _id: id,
      admin: req.user.adminId,
    }).populate("admin", "email");

    if (!manager) return res.status(404).json({ error: "Manager not found" });
    res.status(200).json(manager);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateManager = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updatedManager = await Manager.findOneAndUpdate(
      { _id: id, admin: req.user.adminId },
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedManager) {
      return res.status(404).json({ error: "Manager not found" });
    }

    res.status(200).json({
      message: "Manager updated successfully",
      manager: updatedManager,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteManager = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedManager = await Manager.findOneAndDelete({
      _id: id,
      admin: req.user.adminId,
    });
    if (!deletedManager) {
      return res.status(404).json({ error: "Manager not found" });
    }
    res.status(200).json({ message: "Manager deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
