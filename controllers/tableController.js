import Table from "../models/table.js";

export const createTable = async (req, res) => {
  try {
    const { name, capacity, status, area } = req.body;
    if (!name || !area)
      return res
        .status(400)
        .json({ error: "Table name and area are required" });

    const table = await Table.create({
      name,
      capacity,
      status: status || "Available",
      area,
      image: req.file ? `/uploads/${req.file.filename}` : undefined,
      createdBy: req.user.adminId,
      createdByModel: req.user.role === "admin" ? "Admin" : "Manager",
    });

    res.status(201).json({ message: "Table created successfully", table });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getTables = async (req, res) => {
  try {
    const tables = await Table.find({ createdBy: req.user.adminId }).populate(
      "area",
      "name"
    );
    res.status(200).json(tables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getTableById = async (req, res) => {
  try {
    const table = await Table.findOne({
      _id: req.params.id,
      createdBy: req.user.adminId,
    }).populate("area", "name");
    if (!table) return res.status(404).json({ error: "Table not found" });
    res.status(200).json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateTable = async (req, res) => {
  try {
    const updatedTable = await Table.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.adminId },
      {
        ...req.body,
        image: req.file ? `/uploads/${req.file.filename}` : req.body.image,
      },
      { new: true, runValidators: true }
    ).populate("area", "name");

    if (!updatedTable)
      return res.status(404).json({ error: "Table not found" });
    res
      .status(200)
      .json({ message: "Table updated successfully", table: updatedTable });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteTable = async (req, res) => {
  try {
    const deletedTable = await Table.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.adminId,
    });
    if (!deletedTable)
      return res.status(404).json({ error: "Table not found" });
    res.status(200).json({ message: "Table deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
