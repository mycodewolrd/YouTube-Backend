import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import healthCheckRouter from "./routes/healthCheck.routes.js";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.routes.js";
import morgan from "morgan";
import logger from "../logger.js";
const morganFormat = ":method :url :status :response-time ms";

const app = express();

dotenv.config({
  path: "./.env",
});
const PORT = process.env.PORT || 8080;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
// Morgan and logger
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const logObject = {
          method: message.split(" ")[0],
          url: message.split(" ")[1],
          status: message.split(" ")[2],
          responseTime: message.split(" ")[3],
        };
        logger.info(JSON.stringify(logObject));
      },
    },
  })
);

//* common Middleware

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());


// routes

app.use("/api/v1/healthCheck",healthCheckRouter);
app.use("/api/v1/users",userRouter);
export { app, PORT };
