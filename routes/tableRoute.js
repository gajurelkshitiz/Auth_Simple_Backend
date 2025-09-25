import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";

import {
  createTable,
  getTables,
  getTableById,
  updateTable,
  deleteTable,
} from "../controllers/tableController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

const uploadDir = path.join(process.cwd(), "uploads", "tables");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const base = path
      .basename(file.originalname || "", ext)
      .replace(/\s+/g, "_");
    cb(null, `${base}_${Date.now()}${ext}`);
  },
});
const fileFilter = (req, file, cb) => {
  if (/image\/(png|jpe?g|webp|gif)/i.test(file.mimetype)) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};
const upload = multer({ storage, fileFilter });

router.get("/", authMiddleware(["admin", "manager", "staff"]), getTables);
router.get("/:id", authMiddleware(["admin", "manager", "staff"]), getTableById);

router.post(
  "/",
  authMiddleware(["admin", "manager"]),
  upload.single("image"),
  createTable
);

router.put(
  "/:id",
  authMiddleware(["admin", "manager"]),
  upload.single("image"),
  updateTable
);

router.delete("/:id", authMiddleware(["admin", "manager"]), deleteTable);

export default router;
