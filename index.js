import "dotenv/config";
import express from "express";
import authRouter from "./auth_Router.js";
import connectDB from "./db/connect.js";
import adminRouter from "./routes/adminRoute.js";
import managerRouter from "./routes/managerRoute.js";
import staffRouter from "./routes/staffRoute.js";
import itemRouter from "./routes/itemRoute.js";
import areaRouter from "./routes/areaRoute.js";
import tableRouter from "./routes/tableRoute.js";
import orderRouter from "./routes/orderRoute.js";

const app = express();
app.use(express.json());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/managers", managerRouter);
app.use("/api/v1/staff", staffRouter);
app.use("/api/v1/items", itemRouter);
app.use("/api/v1/areas", areaRouter);
app.use("/api/v1/tables", tableRouter);
app.use("/api/v1/orders", orderRouter);

app.get("/", (req, res) => {
  res.send("Test Route is fine!");
});

app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

const port = process.env.PORT || 3000;

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, () => console.log(`Server is running at ${port}`));
  } catch (err) {
    console.log(err);
  }
};

start();
