import express from "express";
import {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
  getItemsByCategory,
  getDistinctQuantities,
  getDistinctUnits,
} from "../controllers/itemController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploads.js";

const router = express.Router();

router.get("/", authMiddleware(["admin", "manager", "staff"]), getItems);
router.get(
  "/by-category/:categoryId",
  authMiddleware(["admin", "manager", "staff"]),
  getItemsByCategory
);
router.get("/:id", authMiddleware(["admin", "manager", "staff"]), getItemById);

router.post(
  "/",
  authMiddleware(["admin", "manager"]),
  upload.single("image"),
  createItem
);
router.put(
  "/:id",
  authMiddleware(["admin", "manager"]),
  upload.single("image"),
  updateItem
);
router.delete("/:id", authMiddleware(["admin", "manager"]), deleteItem);
router.get("/quantities", authMiddleware, getDistinctQuantities);
router.get("/distinct-units", authMiddleware, getDistinctUnits);

export default router;
