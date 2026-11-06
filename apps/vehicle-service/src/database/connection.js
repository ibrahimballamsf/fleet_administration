import mongoose from "mongoose";
import { config } from "../config.js";

let connection;

export async function connectDatabase() {
  if (connection?.readyState === 1) return connection;
  connection = await mongoose
    .createConnection(config.database.uri, {
      dbName: config.database.name,
      serverSelectionTimeoutMS: 5000
    })
    .asPromise();
  return connection;
}

export function getDatabaseConnection() {
  if (!connection || connection.readyState !== 1) {
    throw new Error("Vehicle Service database connection has not been established.");
  }
  return connection;
}

export async function disconnectDatabase() {
  if (!connection) return;
  await connection.close();
  connection = undefined;
}
