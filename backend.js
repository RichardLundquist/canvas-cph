import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.static(path.join(__dirname, "dist")));

app.get("/api", async (req, res) => {
  // remove the VITE_prefix in .env if using this backend

  const station = {
    botaniskHave1: "05735",
    kbhLufthavn: "06180",
    kbhToldbod: "06187",
  };

  const apiKey = process.env.DMI_API_KEY;

  const url = `https://dmigw.govcloud.dk/v2/metObs/collections/observation/items?stationId=${station.kbhLufthavn}&period=latest-day&bbox-crs=https%3A%2F%2Fwww.opengis.net%2Fdef%2Fcrs%2FOGC%2F1.3%2FCRS84&api-key=${apiKey}`;

  try {
    const response = await axios.get(url);

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching DMI API data:", error.message);
    res.status(500).json({ error: "Failed to fetch data from DMI API" });
  }
});

// Serve the index.html for all other requests (client-side routing support)
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(8000, () => console.log(`server is running on ${PORT}`));




  // remove the VITE_prefix in .env if using this backend
