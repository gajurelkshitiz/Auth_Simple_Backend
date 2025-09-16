import express from "express";
import {
  createOrder,
  getAllOrders,
  getOrderById,
  getOrderByOrderId,
  updateOrder,
  deleteOrder,
} from "../controllers/orderController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware(["admin", "manager", "staff"]), createOrder);
router.get("/", authMiddleware(["admin", "manager", "staff"]), getAllOrders);
router.get(
  "/byOrderId/:orderId",
  authMiddleware(["admin", "manager", "staff"]),
  getOrderByOrderId
);
router.get("/:id", authMiddleware(["admin", "manager", "staff"]), getOrderById);
router.put("/:id", authMiddleware(["admin", "manager", "staff"]), updateOrder);
router.delete("/:id", authMiddleware(["admin", "manager"]), deleteOrder); // staff cannot delete

export default router;
