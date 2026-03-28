import dotenv from "dotenv";

dotenv.config();

export const env = {
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/livewell",
};
