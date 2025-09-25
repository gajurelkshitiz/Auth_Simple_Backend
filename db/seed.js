import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import Role from "../models/role.js";
import User from "../models/user.js";

dotenv.config();

(async () => {
  try {
    mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB for seeding roles.");

    const existingRoles = await Role.find({});
    if (existingRoles.length === 0) {
      await Role.insertMany([
        { name: "super-admin" },
        { name: "admin" },
        { name: "manager" },
        { name: "staff" },
      ]);
      console.log("Default roles added to the database.");
    } else {
      console.log("Roles already exist in the database.");
    }

    // create a super admin user
    await User.create({
      name: process.env.SUPER_ADMIN_NAME,
      email: process.env.SUPER_ADMIN_EMAIL,
      password: bcrypt.hashSync(process.env.SUPER_ADMIN_PASSWORD, 10),
      role: await Role.findOne({ name: "super-admin" }).then((r) => r._id),
    });
    console.log("Super admin user created.");

    mongoose.connection.close();
  } catch (err) {
    console.error("Error seeding roles:", err);
    mongoose.connection.close();
  }
})();
