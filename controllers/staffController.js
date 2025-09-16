import Staff from "../models/staff.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const createStaff = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = await Staff.create({
      name,
      email,
      password: hashedPassword,
      createdBy: req.user.adminId,
      createdByModel: req.user.role === "admin" ? "Admin" : "Manager",
    });

    res.status(201).json({ message: "Staff created successfully", staff });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const loginStaff = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and Password are required" });
    }

    const staff = await Staff.findOne({ email });
    if (!staff) {
      return res.status(401).json({ error: "Invalid Email or Password" });
    }

    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid Email or Password" });
    }

    const token = jwt.sign(
      {
        userId: staff._id,
        role: "staff",
        createdBy: staff.createdBy,
        createdByModel: staff.createdByModel,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      staff: { id: staff._id, name: staff.name, email: staff.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ GET ALL STAFF (only those created by logged-in admin/manager)
export const getStaffs = async (req, res) => {
  try {
    const filter = {
      createdBy: req.user.userId,
      createdByModel: req.user.role === "admin" ? "Admin" : "Manager",
    };
    const staffs = await Staff.find(filter).select("-password");
    res.status(200).json(staffs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findOne({
      _id: id,
      createdBy: req.user.userId,
      createdByModel: req.user.role === "admin" ? "Admin" : "Manager",
    }).select("-password");

    if (!staff) return res.status(404).json({ error: "Staff not found" });

    res.status(200).json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updatedStaff = await Staff.findOneAndUpdate(
      {
        _id: id,
        createdBy: req.user.userId,
        createdByModel: req.user.role === "admin" ? "Admin" : "Manager",
      },
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedStaff) {
      return res.status(404).json({ error: "Staff not found" });
    }

    res.status(200).json({
      message: "Staff updated successfully",
      staff: updatedStaff,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedStaff = await Staff.findOneAndDelete({
      _id: id,
      createdBy: req.user.userId,
      createdByModel: req.user.role === "admin" ? "Admin" : "Manager",
    });

    if (!deletedStaff) {
      return res.status(404).json({ error: "Staff not found" });
    }

    res.status(200).json({ message: "Staff deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
