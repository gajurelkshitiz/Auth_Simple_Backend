import express from "express";
import {
  getSalesSummary,
  getTopItems,
  getSalesByCategory,
  getSalesByArea,
  getSalesByTable,
} from "../controllers/reportController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/sales/summary", authMiddleware(["admin", "manager"]), getSalesSummary);
router.get("/sales/top-items", authMiddleware(["admin", "manager"]), getTopItems);
router.get("/sales/by-category", authMiddleware(["admin", "manager"]), getSalesByCategory);
router.get("/sales/by-area", authMiddleware(["admin", "manager"]), getSalesByArea);
router.get("/sales/by-table", authMiddleware(["admin", "manager"]), getSalesByTable);

export default router;
