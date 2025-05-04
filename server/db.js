import { Client } from "pg";

export const client = new Client({
  host: "localhost",
  user: "postgres",
  port: 5432,
  password: "K@rlandre2",
  database: "EMPRND",
});

client.connect((err) => {
  if (err) {
    console.error("Error connecting to the database", err.stack);
  } else {
    console.log("Connected to the database");
  }
});
