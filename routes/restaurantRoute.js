import express from "express";
import {
  createRestaurant,
  getRestaurants,
  getRestaurantById,
  updateRestaurant,
  deleteRestaurant,
} from "../controllers/restaurantController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware(["super-admin"]), createRestaurant);
router.get("/", authMiddleware(["super-admin", "admin"]), getRestaurants);
router.get("/:id", authMiddleware(["super-admin", "admin"]), getRestaurantById);
router.put("/:id", authMiddleware(["super-admin", "admin"]), updateRestaurant);
router.delete("/:id", authMiddleware(["super-admin"]), deleteRestaurant);

export default router;
