import express from "express";
import {
  createItemStock,
  getItemStocks,
  getItemStockById,
  updateItemStock,
  deleteItemStock,
} from "../controllers/itemStockController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware(["admin", "manager", "staff"]), getItemStocks);
router.get(
  "/:id",
  authMiddleware(["admin", "manager", "staff"]),
  getItemStockById
);
router.post("/", authMiddleware(["admin", "manager"]), createItemStock);
router.put("/:id", authMiddleware(["admin", "manager"]), updateItemStock);
router.delete("/:id", authMiddleware(["admin", "manager"]), deleteItemStock);

export default router;
