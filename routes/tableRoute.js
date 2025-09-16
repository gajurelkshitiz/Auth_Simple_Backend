import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";
import {
  createTable,
  getTables,
  getTableById,
  updateTable,
  deleteTable,
} from "../controllers/tableController.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware(["admin", "manager"]),
  upload.single("image"),
  createTable
);
router.get("/", authMiddleware(["admin", "manager"]), getTables);
router.get("/:id", authMiddleware(["admin", "manager"]), getTableById);
router.put(
  "/:id",
  authMiddleware(["admin", "manager"]),
  upload.single("image"),
  updateTable
);
router.delete("/:id", authMiddleware(["admin", "manager"]), deleteTable);

export default router;
