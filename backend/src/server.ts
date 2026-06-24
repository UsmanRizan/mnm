import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.ts";
import cors from "cors";

const app = express();
const port = 8000;

app.use(
  cors({
    origin: "http://localhost:8081", // Replace with your frontend's origin
    methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  }),
);

app.all("/api/auth/{*any}", toNodeHandler(auth));

// Mount express json middleware after Better Auth handler
// or only apply it to routes that don't interact with Better Auth
app.use(express.json());

app.listen(port, () => {
  console.log(`Better Auth app listening on port ${port}`);
});
