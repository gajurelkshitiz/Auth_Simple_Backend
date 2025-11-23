import express from "express";
import {
  createOrder,
  cancelOrder,
  getOrders,
  getOrderById,
  updateOrder,
  checkoutOrder,
  bulkCheckout,
  deleteOrder,
} from "../controllers/orderController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware(["admin", "manager", "staff"]), getOrders);
router.get("/:id", authMiddleware(["admin", "manager", "staff"]), getOrderById);
router.post("/", authMiddleware(["admin", "manager", "staff"]), createOrder);

router.patch(
  "/:id/cancel",
  authMiddleware(["admin", "manager", "staff"]),
  cancelOrder
);

router.put("/:id", authMiddleware(["admin", "manager", "staff"]), updateOrder);
router.patch(
  "/:id/checkout",
  authMiddleware(["admin", "manager", "staff"]),
  checkoutOrder
);
router.post(
  "/checkout-bulk",
  authMiddleware(["admin", "manager", "staff"]),
  bulkCheckout
);
router.delete("/:id", authMiddleware(["admin", "manager"]), deleteOrder);

export default router;
