import express from "express";
import {
  saveReceipt,
  getReceiptByOrderId,
} from "../controllers/receiptController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware(["admin", "manager", "staff"]), saveReceipt);

router.get(
  "/:orderId",
  authMiddleware(["admin", "manager", "staff"]),
  getReceiptByOrderId
);

export default router;
