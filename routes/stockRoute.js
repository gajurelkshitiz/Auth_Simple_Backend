import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js"; // adjust path if needed
import {
  createStock,
  listStocks,
  getStockById,
  updateStock,
  deleteStock,
} from "../controllers/stockController.js";

const router = express.Router();
router.get(
  "/",
  authMiddleware(["admin", "manager", "super-admin"]),
  listStocks
);
router.post(
  "/",
  authMiddleware(["admin", "manager", "super-admin"]),
  createStock
);
router.get(
  "/:id",
  authMiddleware(["admin", "manager", "super-admin"]),
  getStockById
);
router.put(
  "/:id",
  authMiddleware(["admin", "manager", "super-admin"]),
  updateStock
);
router.delete(
  "/:id",
  authMiddleware(["admin", "manager", "super-admin"]),
  deleteStock
);

export default router;
