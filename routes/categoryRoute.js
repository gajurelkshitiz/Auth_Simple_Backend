import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

const router = express.Router();

router.get("/", authMiddleware(["admin", "manager", "staff"]), getCategories);
router.get(
  "/:id",
  authMiddleware(["admin", "manager", "staff"]),
  getCategoryById
);

router.post("/", authMiddleware(["admin", "manager"]), createCategory);
router.put("/:id", authMiddleware(["admin", "manager"]), updateCategory);
router.delete("/:id", authMiddleware(["admin", "manager"]), deleteCategory);

export default router;
