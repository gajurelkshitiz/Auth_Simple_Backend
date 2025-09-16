import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";
import {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
} from "../controllers/itemController.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware(["admin", "manager"]),
  upload.single("image"),
  createItem
);
router.get("/", authMiddleware(["admin", "manager"]), getItems);
router.get("/:id", authMiddleware(["admin", "manager"]), getItemById);
router.put(
  "/:id",
  authMiddleware(["admin", "manager"]),
  upload.single("image"),
  updateItem
);
router.delete("/:id", authMiddleware(["admin", "manager"]), deleteItem);

export default router;
