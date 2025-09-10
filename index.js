import "dotenv/config";
import express from "express";
import authRouter from "./auth_Router.js";
import connectDB from "./db/connect.js";

const app = express();

app.use(express.json());
app.use("/api/v1/auth", authRouter);

// test route:
app.get("/", (req, res) => {
  res.send("Test Route is fine!");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  res.status(500).json({
    error: err.message || "Internal Server Error",
  });
});

// const port = process.env.PORT || 5555;

// const start = async () => {
//     try {
//         app.listen(port, () => {
//             console.log(`Server is running on port: ${port}`);
//         });
//     } catch (err) {
//         console.log("[SERVER ERROR]", err);
//     }
// };

// start();

// defing the port and ready for the server to start..
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
