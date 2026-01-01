import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import connectDB from "./db/connect.js";
import itemRouter from "./routes/itemRoute.js";
import areaRouter from "./routes/areaRoute.js";
import tableRouter from "./routes/tableRoute.js";
import orderRouter from "./routes/orderRoute.js";
import userRouter from "./routes/userRoute.js";
import restaurantRouter from "./routes/restaurantRoute.js";
import authRouter from "./routes/authRoute.js";
import kotRouter from "./routes/kotRoute.js";
import restaurantSettingsRoute from "./routes/restaurantSettingsRoute.js";
import receiptRouter from "./routes/receiptRoute.js";
import categoryRouter from "./routes/categoryRoute.js";
import reportRoutes from "./routes/reportRoute.js";
import itemStockRoute from "./routes/itemStockRoute.js";

const app = express();
app.use(
  cors({
    origin: "*",
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
app.use("/api/v1/kots", kotRouter);
app.use("/api/v1/restaurant-settings", restaurantSettingsRoute);

app.get("/", (_req, res) => {
  res.send("Test Route is fine!");
});

app.use("/api/v1/receipts", receiptRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/item-stock", itemStockRoute);

app.use((err, _req, res, _next) => {
  console.error("[ERROR]", err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

const port = process.env.PORT || 3000;

const server = createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

app.set("io", io);

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      socket.isAuthenticated = false;
      console.log(`Client ${socket.id} connected without token`);
      return next();
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.userId = decoded.userId;
    socket.role = decoded.role;
    socket.restaurantId = decoded.restaurantId;
    socket.isAuthenticated = true;

    if (socket.restaurantId) {
      socket.join(socket.restaurantId.toString());
      console.log(
        ` User ${socket.userId} (${socket.role}) joined restaurant: ${socket.restaurantId}`
      );
    }

    next();
  } catch (err) {
    console.warn(`Socket auth failed for ${socket.id}:`, err.message);
    socket.isAuthenticated = false;
    next();
  }
});

io.on("connection", (socket) => {
  console.log(
    "Client connected:",
    socket.id,
    "Authenticated:",
    socket.isAuthenticated
  );

  socket.on("joinRestaurant", (restaurantId) => {
    if (socket.isAuthenticated && socket.restaurantId === restaurantId) {
      socket.join(restaurantId);
      console.log(` ${socket.id} joined restaurant room: ${restaurantId}`);
    } else {
      console.warn(
        `Unauthorized join attempt: ${socket.id} -> ${restaurantId}`
      );
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    server.listen(port, "0.0.0.0", () =>
      console.log(`Server is running at ${port}`)
    );
  } catch (err) {
    console.log(err);
  }
};

start();
