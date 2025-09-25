import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 8000;

app.use(cors());

app.get("/api", async (req, res) => {
  // remove the VITE_prefix in .env if using this backend

  const apiKey = process.env.DMI_API_KEY;

  const url = `https://dmigw.govcloud.dk/v2/metObs/collections/observation/items?period=latest&stationId=06180&limit=100&bbox-crs=https%3A%2F%2Fwww.opengis.net%2Fdef%2Fcrs%2FOGC%2F1.3%2FCRS84&api-key=${apiKey}`;

  try {
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching DMI API data:", error.message);
    res.status(500).json({ error: "Failed to fetch data from DMI API" });
  }
});

app.listen(8000, () => console.log(`server is running on ${PORT}`));
