import Admin from "../models/admin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const createAdmin = async (req, res, next) => {
  try {
    console.log("creating admin..");
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and Password required." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await Admin.create({ name, email, password: hashedPassword });

    res.status(201).json({ message: "Admin created successfully", admin });
  } catch (err) {
    console.log(err);
    if (err.code === 11000) {
      return res.status(400).json({ error: "Email already exists." });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and Password required." });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ error: "Invalid Email or Password." });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid Email or Password." });
    }

    const token = jwt.sign(
      { adminId: admin._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "15d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      adminId: admin._id,
      email: admin.email,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export { createAdmin, loginAdmin };
