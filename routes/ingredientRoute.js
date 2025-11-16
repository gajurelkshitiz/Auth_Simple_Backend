import express from "express";
import {
  createIngredient,
  getIngredients,
  updateIngredient,
  deleteIngredient,
} from "../controllers/ingredientController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware(["admin", "manager", "staff"]),
  createIngredient
);

router.get("/", authMiddleware(["admin", "manager", "staff"]), getIngredients);

router.put(
  "/:id",
  authMiddleware(["admin", "manager", "staff"]),
  updateIngredient
);

router.delete(
  "/:id",
  authMiddleware(["admin", "manager", "staff"]),
  deleteIngredient
);

export default router;
