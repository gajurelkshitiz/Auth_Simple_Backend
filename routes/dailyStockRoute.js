import express from "express";
import {
  setDailyStock,
  getDailyStocks,
  decrementStock,
  incrementStock,
  updateDailyStock,
  deleteDailyStock,
} from "../controllers/dailyStockController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware(["admin", "manager", "staff"]), setDailyStock);

router.get("/", authMiddleware(["admin", "manager", "staff"]), getDailyStocks);

router.patch(
  "/decrement",
  authMiddleware(["admin", "manager", "staff"]),
  decrementStock
);

router.patch(
  "/increment",
  authMiddleware(["admin", "manager", "staff"]),
  incrementStock
);

router.patch(
  "/update/:id",
  authMiddleware(["admin", "manager", "staff"]),
  updateDailyStock
);

router.delete(
  "/:id",
  authMiddleware(["admin", "manager", "staff"]),
  deleteDailyStock
);

export default router;
