import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import Table from "../models/table.js";
import Area from "../models/area.js";

const isAdmin = (role) => role === "admin";
const isManager = (role) => role === "manager";
const isStaff = (role) => role === "staff";

const ensureRestaurant = (req, res) => {
  const restaurantId = req.user?.restaurantId;
  if (!restaurantId) {
    res.status(400).json({ error: "Restaurant context missing in token" });
    return null;
  }
  return restaurantId;
};

function deleteFileIfExists(p) {
  if (!p) return;
  const abs = path.join(process.cwd(), p.startsWith("/") ? p.slice(1) : p);
  fs.promises
    .stat(abs)
    .then(() => fs.promises.unlink(abs).catch(() => {}))
    .catch(() => {});
}

export const createTable = async (req, res) => {
  try {
    const role = req.user?.role;
    if (!(isAdmin(role) || isManager(role))) {
      return res
        .status(403)
        .json({ error: "Only admin/manager can create tables" });
    }

    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { name, capacity, areaId } = req.body;
    if (!name || !capacity || !areaId) {
      return res
        .status(400)
        .json({ error: "Name, capacity, and areaId are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(areaId)) {
      return res.status(400).json({ error: "Invalid areaId format" });
    }

    const area = await Area.findOne({ _id: areaId, restaurant: restaurantId });
    if (!area) {
      return res
        .status(404)
        .json({ error: "Area not found for this restaurant" });
    }

    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    const table = await Table.create({
      name: name.trim(),
      capacity: Number(capacity),
      area: areaId,
      restaurant: restaurantId,
      image: imagePath,
      createdBy: req.user.userId,
      createdByRole: req.user.role,
    });

    res.status(201).json({ message: "Table created", table });
  } catch (err) {
    console.error("[TABLE create]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getTables = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const filter = { restaurant: restaurantId };
    if (req.query.areaId) {
      filter.area = req.query.areaId;
    }

    const tables = await Table.find(filter)
      .populate("area", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ tables });
  } catch (err) {
    console.error("[TABLE list]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getTableById = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid table ID format" });
    }

    const table = await Table.findOne({
      _id: id,
      restaurant: restaurantId,
    }).populate("area", "name");
    if (!table) return res.status(404).json({ error: "Table not found" });

    res.status(200).json({ table });
  } catch (err) {
    console.error("[TABLE getById]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateTable = async (req, res) => {
  try {
    const role = req.user?.role;
    if (!(isAdmin(role) || isManager(role))) {
      return res
        .status(403)
        .json({ error: "Only admin/manager can update tables" });
    }

    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid table ID format" });
    }

    const { name, capacity, areaId, removeImage } = req.body;

    if (areaId && !mongoose.Types.ObjectId.isValid(areaId)) {
      return res.status(400).json({ error: "Invalid areaId format" });
    }

    if (areaId) {
      const area = await Area.findOne({
        _id: areaId,
        restaurant: restaurantId,
      });
      if (!area) {
        return res
          .status(404)
          .json({ error: "Area not found for this restaurant" });
      }
    }

    const table = await Table.findOne({
      _id: id,
      restaurant: restaurantId,
    });
    if (!table) return res.status(404).json({ error: "Table not found" });

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (capacity !== undefined) updates.capacity = Number(capacity);
    if (areaId !== undefined) updates.area = areaId;

    // let newImagePath = null;
    if (req.file) {
      const newPath = `/uploads/${req.file.filename}`;
      if (table.image) deleteFileIfExists(table.image);
      updates.image = newPath;
    } else if (removeImage === "true" || removeImage === true) {
      if (table.image) deleteFileIfExists(table.image);
      updates.image = null;
    }

    const updated = await Table.findOneAndUpdate(
      { _id: id, restaurant: restaurantId },
      updates,
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ error: "Table not found" });

    res.status(200).json({ message: "Table updated", table: updated });
  } catch (err) {
    console.error("[TABLE update]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteTable = async (req, res) => {
  try {
    const role = req.user?.role;
    if (!(isAdmin(role) || isManager(role))) {
      return res
        .status(403)
        .json({ error: "Only admin/manager can delete tables" });
    }

    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid table ID format" });
    }

    const deleted = await Table.findOneAndDelete({
      _id: id,
      restaurant: restaurantId,
    });
    if (!deleted) return res.status(404).json({ error: "Table not found" });

    deleteFileIfExists(deleted.image);

    res.status(200).json({ message: "Table deleted" });
  } catch (err) {
    console.error("[TABLE delete]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
