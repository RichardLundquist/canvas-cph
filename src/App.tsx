import { useEffect, useState } from "react";
import "./App.css";
import { cloudyDay16, day16, night16, rain16 } from "./assets/colors";

type DataElementType = {
  observed: string;
  parameterId: string;
  value: number;
};

function App() {
  const [apiData, setApiData] = useState<DataElementType[]>();

  const url =
    "https://dmigw.govcloud.dk/v2/metObs/collections/observation/items?period=latest&stationId=06180&limit=100&bbox-crs=https%3A%2F%2Fwww.opengis.net%2Fdef%2Fcrs%2FOGC%2F1.3%2FCRS84&api-key=5d305213-5974-45d2-a603-cd3e04a6958e";

  const fetchData = async () => {
    try {
      const response = await fetch(url);
      const data = await response.json();

      const weatherData: DataElementType[] = data.features.map((f) => ({
        parameterId: f.properties.parameterId,
        value: f.properties.value,
        observed: f.properties.observed,
      }));

      setApiData(weatherData);

      return weatherData;
    } catch (error) {
      console.error("Error fetching DMI API data:", error);
      throw new Response(
        `Failed to fetch DMI API data: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          status: 500,
          statusText: "Internal Server Error",
        }
      );
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const temp = apiData?.find((p) => p.parameterId === "temp_dry");
  const cloudCover = apiData?.find((p) => p.parameterId === "cloud_cover");
  const rain = apiData?.find((p) => p.parameterId === "precip_past10min");

  const [cloudBlendFactor, setCloudBlendFactor] = useState(
    cloudCover ? Math.min(cloudCover.value / 100, 1) : 0
  );

  const [rainBlendFactor, setRainBlendFactor] = useState(
    rain ? Math.min(rain.value / 2, 1) : 0
  );

  const [currentTime, setCurrentTime] = useState(new Date());

  function getTimeBlendFactor() {
    const hour = currentTime.getHours() + currentTime.getMinutes() / 60;
    // Day: 8am-8pm (8-20), Night: 8pm-8am (20-8)
    if (hour < 12) {
      // Midnight to noon: 0 -> 1
      return hour / 12;
    } else {
      // Noon to midnight: 1 -> 0
      return (24 - hour) / 12;
    }
  }
  function generateBlendedColors(
    arr1: string[],
    arr2: string[],
    factor: number,
    count: number
  ): string[] {
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      const idx1 = Math.floor((i * arr1.length) / count);
      const idx2 = Math.floor((i * arr2.length) / count);
      const color1 = arr1[idx1];
      const color2 = arr2[idx2];
      // Defensive: fallback to a default color if undefined
      result.push(
        interpolateColor(color1 ?? "#000000", color2 ?? "#FFFFFF", factor)
      );
    }
    return result;
  }

  const timeBlendFactor = getTimeBlendFactor();

  const timeBlended = generateBlendedColors(
    night16,
    day16,
    timeBlendFactor,
    128
  );
  const cloudBlended = generateBlendedColors(
    timeBlended,
    cloudyDay16,
    rainBlendFactor,
    128
  );
  const finalBlended = generateBlendedColors(
    cloudBlended,
    rain16,
    cloudBlendFactor,
    128
  );

  // Helper function to convert a hex color to an RGB object
  function hexToRgb(hex: string): { r: number; g: number; b: number } {
    if (!hex || typeof hex !== "string") return { r: 0, g: 0, b: 0 };
    hex = hex.replace(/^#/, "");
    if (hex.length === 3)
      hex = hex
        .split("")
        .map((x) => x + x)
        .join("");
    if (hex.length !== 6) return { r: 0, g: 0, b: 0 };
    const num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }

  // Helper function to convert an RGB object back to a hex string
  function rgbToHex(r: number, g: number, b: number): string {
    return (
      "#" +
      [r, g, b]
        .map((x) => {
          const hex = Number.isNaN(x) ? "00" : x.toString(16).padStart(2, "0");
          return hex;
        })
        .join("")
        .toUpperCase()
    );
  }

  // Function to interpolate between two colors
  function interpolateColor(
    color1: string,
    color2: string,
    factor: number
  ): string {
    if (!color1 || !color2) return "#000000";
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    const r = Math.round(rgb1.r + factor * (rgb2.r - rgb1.r));
    const g = Math.round(rgb1.g + factor * (rgb2.g - rgb1.g));
    const b = Math.round(rgb1.b + factor * (rgb2.b - rgb1.b));
    return rgbToHex(r, g, b);
  }

  return (
    <main>
      <div className="p-12 space-y-8">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <h3>copenhagen</h3>
            <h3>weather</h3>
          </div>

          <h4>{`${currentTime.toLocaleTimeString()} ${currentTime.toLocaleDateString()}`}</h4>

          <div className="flex justify-between w-full">
            <div className="flex gap-2">
              {temp?.value && <p>{`Degrees: ${temp.value}C`}</p>}
              {cloudCover && <p>{`Clouds: ${cloudCover.value}%`}</p>}
              {rain && <p>{`Rain: ${rain.value}%`}</p>}
            </div>
            <p>Data from DMI</p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap rounded-lg overflow-hidden gap-1">
            {finalBlended.map((col, i) => (
              <div
                className="h-24 w-24"
                key={i}
                style={{ background: col }}
              ></div>
            ))}
          </div>

          <div className="flex flex-col gap-1 max-w-screen-sm rounded-lg p-4 bg-[#e8e9ea]">
            <div>
              <label className="block mb-2 font-bold">
                Cloud Cover: {(cloudBlendFactor * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                defaultValue={cloudBlendFactor}
                value={cloudBlendFactor}
                onChange={(e) => setCloudBlendFactor(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-2 font-bold">
                Rain: {(rainBlendFactor * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                defaultValue={rainBlendFactor}
                value={rainBlendFactor}
                onChange={(e) => setRainBlendFactor(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-2 font-bold">
                Current hour: {currentTime.getHours()}
              </label>
              <input
                type="range"
                min={0}
                max={24}
                step={1}
                value={currentTime.getHours()}
                onChange={(e) =>
                  setCurrentTime(
                    new Date(new Date().setHours(Number(e.target.value)))
                  )
                }
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
