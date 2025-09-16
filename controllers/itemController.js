import Item from "../models/item.js";

export const createItem = async (req, res) => {
  try {
    const { name, units, category, isAvailable } = req.body;
    if (!name || !units || !units.length)
      return res
        .status(400)
        .json({ error: "Name and at least one unit required" });

    const item = await Item.create({
      name,
      units,
      category,
      isAvailable,
      image: req.file ? `/uploads/${req.file.filename}` : undefined,
      createdBy: req.user.adminId,
      createdByModel: req.user.role === "admin" ? "Admin" : "Staff",
    });

    res.status(201).json({ message: "Item created successfully", item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getItems = async (req, res) => {
  try {
    const items = await Item.find({ createdBy: req.user.adminId });
    res.status(200).json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getItemById = async (req, res) => {
  try {
    const item = await Item.findOne({
      _id: req.params.id,
      createdBy: req.user.adminId,
    });
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.status(200).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateItem = async (req, res) => {
  try {
    const updatedItem = await Item.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.adminId },
      {
        ...req.body,
        image: req.file ? `/uploads/${req.file.filename}` : req.body.image,
      },
      { new: true, runValidators: true }
    );
    if (!updatedItem) return res.status(404).json({ error: "Item not found" });
    res
      .status(200)
      .json({ message: "Item updated successfully", item: updatedItem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const deletedItem = await Item.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.adminId,
    });
    if (!deletedItem) return res.status(404).json({ error: "Item not found" });
    res.status(200).json({ message: "Item deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
