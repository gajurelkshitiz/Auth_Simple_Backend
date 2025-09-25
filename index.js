import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";

import connectDB from "./db/connect.js";
import itemRouter from "./routes/itemRoute.js";
import areaRouter from "./routes/areaRoute.js";
import tableRouter from "./routes/tableRoute.js";
import orderRouter from "./routes/orderRoute.js";
import userRouter from "./routes/userRoute.js";
import restaurantRouter from "./routes/restaurantRoute.js";
import authRouter from "./routes/authRoute.js";

const app = express();
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));

const uploadsRoot = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });
app.use("/uploads", express.static(uploadsRoot));

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/items", itemRouter);
app.use("/api/v1/areas", areaRouter);
app.use("/api/v1/tables", tableRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/restaurants", restaurantRouter);

app.get("/", (_req, res) => {
  res.send("Test Route is fine!");
});

app.use((err, _req, res, _next) => {
  console.error("[ERROR]", err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

const port = process.env.PORT || 3000;

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, "0.0.0.0", () =>
      console.log(`Server is running at ${port}`)
    );
  } catch (err) {
    console.log(err);
  }
};

start();
