import express from "express";
import { createUser, findUsers } from "../controllers/userController.js";
import { assignRestaurant } from "../controllers/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware(["super-admin", "admin"]), createUser);
router.get("/", authMiddleware(["super-admin", "admin", "manager"]), findUsers);

router.post(
  "/assign-restaurant",
  authMiddleware(["super-admin"]),
  assignRestaurant
);

export default router;
