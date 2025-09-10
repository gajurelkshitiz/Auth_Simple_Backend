import "dotenv/config";
import express from "express";
import authRouter from "./auth_Router.js";
import connectDB from "./db/connect.js";
import adminRouter from "./routes/adminRoute.js"

const app = express();

app.use(express.json());
app.use("/api/v1/auth", authRouter);
app.use("/register", adminRouter);

// test route:
app.get("/", (req, res) => {
  res.send("Test Route is fine!");
});


app.get("/health-route", (req, res) => {
  res.send("Hello this is a test route from Archana.");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  res.status(500).json({
    error: err.message || "Internal Server Error",
  });
});


// defing the port and ready for the server to start..
const port = process.env.PORT || 4000;

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, () => console.log(`Server is running at ${port}`));
  } catch (err) {
    console.log(err);
  }
};

start();
