import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploads.js";
import {
  getRestaurantSettings,
  updateRestaurantSettings,
} from "../controllers/restaurantSettingsController.js";

const router = express.Router();

router.get("/", authMiddleware(["admin", "manager"]), getRestaurantSettings);

router.put(
  "/",
  authMiddleware(["admin", "manager"]),
  upload.single("logo"),
  updateRestaurantSettings
);

export default router;
