import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { cloudyDay16, day16, night16, rain16 } from "./assets/colors";
import { ArrowUpRight, RotateCcwIcon } from "lucide-react";

type DataElementType = {
  observed: string;
  parameterId: string;
  value: number;
};

function App() {
  const [apiData, setApiData] = useState({
    temp: 0,
    rain: 0,
    cloudCover: 0,
  });

  const [cloudBlendFactor, setCloudBlendFactor] = useState(0);
  const [rainBlendFactor, setRainBlendFactor] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  const apiKey = import.meta.env.VITE_DMI_API_KEY;
  const apiKey2 = 0;

  const url = `https://dmigw.govcloud.dk/v2/metObs/collections/observation/items?period=latest&stationId=06180&limit=100&bbox-crs=https%3A%2F%2Fwww.opengis.net%2Fdef%2Fcrs%2FOGC%2F1.3%2FCRS84&api-key=${apiKey}`;

  const fetchData = async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch data from mini-backend");
      }

      const data = await response.json();

      const weatherData: DataElementType[] = data.features.map(
        (f: { properties: DataElementType }) => ({
          parameterId: f.properties.parameterId,
          value: f.properties.value,
          observed: f.properties.observed,
        })
      );

      const temp =
        weatherData?.find((p) => p.parameterId === "temp_dry")?.value ?? 0;
      const cloudCover =
        weatherData?.find((p) => p.parameterId === "cloud_cover")?.value ?? 0;
      const rain =
        weatherData?.find((p) => p.parameterId === "precip_past10min")?.value ??
        0;

      setCloudBlendFactor(Math.min(cloudCover / 100, 1));
      setRainBlendFactor(Math.min(rain / 2, 1));

      setApiData({ temp, cloudCover, rain });

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


  const resetAllValues = () => {
    setCloudBlendFactor(Math.min(apiData?.cloudCover / 100, 1));
    setRainBlendFactor(Math.min(apiData?.rain / 2, 1));
    setCurrentTime(new Date());
  };

  function generateBlendedColors(
    arr1: string[],
    arr2: string[],
    factor: number,
    count: number
  ): string[] {
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      // handles colors arrays of different lengths
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

  const timeBlendFactor = useMemo(() => {
    const hour = currentTime.getHours() + currentTime.getMinutes() / 60;
    // Day: 8am-8pm (8-20), Night: 8pm-8am (20-8)
    if (hour < 12) {
      // Midnight to noon: 0 -> 1
      return hour / 12;
    } else {
      // Noon to midnight: 1 -> 0
      return (24 - hour) / 12;
    }
  }, [currentTime]);

  // creates an interpolated mix of colors based on time of day (darker at night, lighter at day)

  const timeBlended = useMemo(
    () => generateBlendedColors(night16, day16, timeBlendFactor, 32),
    [timeBlendFactor]
  );

  // creates an interpolated mix of colors based on cloud cover (more gray with more clouds)
  const cloudBlended = useMemo(
    () => generateBlendedColors(timeBlended, cloudyDay16, rainBlendFactor, 32),
    [timeBlended, rainBlendFactor]
  );

  // creates an interpolated mix of colors based on rain (more blue with more rain)
  const finalBlended = useMemo(
    () => generateBlendedColors(cloudBlended, rain16, cloudBlendFactor, 32),
    [cloudBlended, cloudBlendFactor]
  );

  // Helper function to convert a hex color to an RGB object (easier to manipulate than hexidecimals)
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

  // Function to interpolate between two colors, creates a gradient based on two colors and factor (0 to 1)
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

  const [openEditor, setOpenEditor] = useState(false);

  return (
    <main className="w-full flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <div className="p-2 md:p-8 space-y-4 md:space-y-8">
          <div className="flex flex-col gap-2 md:gap-4">
            <h5>{`canvas:cph ${currentTime.toLocaleTimeString()} ${currentTime.toLocaleDateString()}`}</h5>
            <div className="space-y-4">
              <div className="flex md:flex-row flex-col gap-4  uppercase text-sm">
                <div className="flex flex-wrap gap-2">
                  <p>
                    Degrees{" "}
                    <span className="bg-gray-200 rounded-sm py-1 px-2">{`${apiData?.temp}C`}</span>
                  </p>

                  <p>
                    Clouds{" "}
                    <span className="bg-gray-200 rounded-sm py-1 px-2">{`${apiData?.cloudCover}%`}</span>
                  </p>

                  <p>
                    Rain{" "}
                    <span className="bg-gray-200 rounded-sm py-1 px-2">{`${apiData?.rain}%`}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:gap-6">
            <div className="grid grid-cols-4 rounded-lg overflow-hidden gap-1">
              {finalBlended.map((col, i) => (
                <div
                  className="h-18 md:h-24 w-full"
                  key={i}
                  style={{ background: col }}
                ></div>
              ))}
            </div>

            <div className="space-y-4 max-w-screen-sm rounded-lg ">
              <button
                className="hover:cursor-pointer uppercase text-sm  rounded-md"
                onClick={() => setOpenEditor(!openEditor)}
              >
                <span>EDIT</span>
                <span>{openEditor ? "-" : "+"}</span>
              </button>
              {openEditor && (
                <div className="flex flex-col gap-2 bg-gray-200 p-4 rounded-md uppercase text-sm">
                  <div className="">
                    <label className="">
                      Cloud Cover: {(cloudBlendFactor * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      defaultValue={cloudBlendFactor}
                      value={cloudBlendFactor}
                      onChange={(e) =>
                        setCloudBlendFactor(Number(e.target.value))
                      }
                      className="w-full bg-gray-600 h-1 rounded-full appearance-none hover:cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className=" mb-2 ">
                      Rain: {(rainBlendFactor * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      defaultValue={rainBlendFactor}
                      value={rainBlendFactor}
                      onChange={(e) =>
                        setRainBlendFactor(Number(e.target.value))
                      }
                      className="w-full bg-gray-600 h-1 rounded-full appearance-none hover:cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="mb-2">
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
                      className="w-full bg-gray-600 h-1 rounded-full appearance-none hover:cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-between">
                    <button
                      className="px-4 py-2  rounded-lg bg-black text-white self-start hover:cursor-pointer flex items-center gap-1"
                      onClick={resetAllValues}
                    >
                      RESET
                      <RotateCcwIcon size={16} />
                    </button>
                    <a
                      target="_blank"
                      className=" flex gap-1 items-center"
                      href="https://www.dmi.dk/"
                    >
                      <span>Data</span>
                      <ArrowUpRight size={16} />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
