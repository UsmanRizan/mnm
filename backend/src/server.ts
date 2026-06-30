import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.ts";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import gemsRouter from "./routes/gems.ts";
import offersRouter from "./routes/offers.ts";
import creditsRouter from "./routes/credits.ts";
import payhereRouter from "./routes/payhere.ts";
import userRouter from "./routes/user.ts";
import uploadRouter from "./routes/upload.ts";

const app = express();
const port = 8000;

app.use(
  cors({
    origin: [
      "http://localhost:8081",
      "http://localhost:8000",
      "exp://",
      "myapp://",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.all("/api/auth/{*any}", toNodeHandler(auth));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// API Routes
app.use("/api/gems", gemsRouter);
app.use("/api/offers", offersRouter);
app.use("/api/credits", creditsRouter);
app.use("/api/payhere", payhereRouter);
app.use("/api/user", userRouter);
app.use("/api/upload", uploadRouter);

// Serve uploaded files as static content
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${port}`);
});
