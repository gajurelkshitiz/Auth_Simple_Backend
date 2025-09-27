import fs from "fs";
import path from "path";
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

const safeUnlink = (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, (err) => {
    if (err) {
      console.warn("[AREA] unlink failed:", filePath, err.message);
    }
  });
};

export const createArea = async (req, res) => {
  try {
    const role = req.user?.role;
    if (!(isAdmin(role) || isManager(role))) {
      return res
        .status(403)
        .json({ error: "Only admin/manager can create areas" });
    }

    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Area name is required" });
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : undefined;

    const area = await Area.create({
      name: name.trim(),
      description: description ?? "",
      image: imagePath,
      restaurant: restaurantId,
      createdBy: req.user.userId,
      createdByRole: req.user.role,
    });

    res.status(201).json({ message: "Area created", area });
  } catch (err) {
    console.error("[AREA create]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getAreas = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const areas = await Area.find({ restaurant: restaurantId }).sort({
      createdAt: -1,
    });
    res.status(200).json({ areas });
  } catch (err) {
    console.error("[AREA list]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getAreaById = async (req, res) => {
  try {
    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;
    const area = await Area.findOne({ _id: id, restaurant: restaurantId });
    if (!area) return res.status(404).json({ error: "Area not found" });

    res.status(200).json({ area });
  } catch (err) {
    console.error("[AREA getById]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateArea = async (req, res) => {
  try {
    const role = req.user?.role;
    if (!(isAdmin(role) || isManager(role))) {
      return res
        .status(403)
        .json({ error: "Only admin/manager can update areas" });
    }

    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;
    const { name, description, removeImage } = req.body;

    const existing = await Area.findOne({ _id: id, restaurant: restaurantId });
    if (!existing) return res.status(404).json({ error: "Area not found" });

    let newImagePath = existing.image;
    if (req.file) {
      if (existing.image) {
        const absPath = path.join(
          process.cwd(),
          existing.image.replace(/^\//, "")
        );
        safeUnlink(absPath);
      }
      newImagePath = `/uploads/${req.file.filename}`;
    } else if (removeImage === "true") {
      if (existing.image) {
        const absPath = path.join(
          process.cwd(),
          existing.image.replace(/^\//, "")
        );
        safeUnlink(absPath);
      }
      newImagePath = undefined;
    }

    const nextName =
      name !== undefined ? name?.toString().trim() : existing.name;
    existing.name = nextName;
    existing.description = description ?? existing.description;
    existing.image = newImagePath;

    const updated = await existing.save();

    res.status(200).json({ message: "Area updated", area: updated });
  } catch (err) {
    console.error("[AREA update]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteArea = async (req, res) => {
  try {
    const role = req.user?.role;
    if (!(isAdmin(role) || isManager(role))) {
      return res
        .status(403)
        .json({ error: "Only admin/manager can delete areas" });
    }

    const restaurantId = ensureRestaurant(req, res);
    if (!restaurantId) return;

    const { id } = req.params;
    const deleted = await Area.findOneAndDelete({
      _id: id,
      restaurant: restaurantId,
    });
    if (!deleted) return res.status(404).json({ error: "Area not found" });

    if (deleted.image) {
      const absPath = path.join(
        process.cwd(),
        deleted.image.replace(/^\//, "")
      );
      safeUnlink(absPath);
    }

    res.status(200).json({ message: "Area deleted" });
  } catch (err) {
    console.error("[AREA delete]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
