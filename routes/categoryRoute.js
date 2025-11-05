import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createCategory,
  getCategories,
} from "../controllers/categoryController.js";

const router = express.Router();

router.get("/", authMiddleware(["admin", "manager", "staff"]), getCategories);
router.post("/", authMiddleware(["admin", "manager"]), createCategory);

export default router;
