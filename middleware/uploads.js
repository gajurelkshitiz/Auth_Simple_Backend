// import multer from "multer";

// const storage = multer.diskStorage({
//   destination: (_req, _file, cb) => {
//     cb(null, "uploads/");
//   },
//   filename: (_req, file, cb) => {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(null, uniqueSuffix + "-" + file.originalname);
//   },
// });

// export const upload = multer({ storage });

import multer from "multer";
import fs from "fs";
import path from "path";

const ensureDirExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const restaurantId = req.user?.restaurantId;

      if (!restaurantId) {
        return cb(
          new Error(
            "Restaurant ID missing in user context. Authentication required."
          ),
          null
        );
      }

      let subFolder = "misc";
      if (file.fieldname === "logo") subFolder = "logos";
      else if (file.fieldname === "invoice") subFolder = "invoices";
      else if (file.fieldname === "menuImage") subFolder = "menus";

      const uploadPath = path.join(
        "uploads",
        restaurantId.toString(),
        subFolder
      );

      ensureDirExists(uploadPath);

      cb(null, uploadPath);
    } catch (err) {
      cb(err, null);
    }
  },

  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${uniqueSuffix}-${safeName}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error("Only image files (png, jpg, jpeg, webp) are allowed")
      );
    }
    cb(null, true);
  },
});
