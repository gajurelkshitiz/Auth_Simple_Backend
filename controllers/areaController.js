import Area from "../models/area.js";

export const createArea = async (req, res) => {
  try {
    if (!req.body.name)
      return res.status(400).json({ error: "Area name required" });
    const area = await Area.create({
      ...req.body,
      image: req.file ? `/uploads/${req.file.filename}` : undefined,
      createdBy: req.user.adminId,
      createdByModel: req.user.role === "admin" ? "Admin" : "Manager",
    });
    res.status(201).json({ message: "Area created", area });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAreas = async (req, res) => {
  try {
    const areas = await Area.find({ createdBy: req.user.adminId });
    res.status(200).json(areas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAreaById = async (req, res) => {
  try {
    const area = await Area.findOne({
      _id: req.params.id,
      createdBy: req.user.adminId,
    });
    if (!area) return res.status(404).json({ error: "Area not found" });
    res.status(200).json(area);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateArea = async (req, res) => {
  try {
    const updatedArea = await Area.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.adminId },
      {
        ...req.body,
        image: req.file ? `/uploads/${req.file.filename}` : req.body.image,
      },
      { new: true, runValidators: true }
    );
    if (!updatedArea) return res.status(404).json({ error: "Area not found" });
    res.status(200).json({ message: "Area updated", area: updatedArea });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteArea = async (req, res) => {
  try {
    const deletedArea = await Area.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.adminId,
    });
    if (!deletedArea) return res.status(404).json({ error: "Area not found" });
    res.status(200).json({ message: "Area deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
