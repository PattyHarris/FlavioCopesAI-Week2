const {
  OPENWEATHER_API_KEY,
  WEATHER_LAT,
  WEATHER_LON,
  WEATHER_LABEL = "My City",
  EVENTS_API_BASE_URL,
  EVENTS_API_KEY,
  WEATHER_UNITS = "metric",
} = process.env;

if (
  !OPENWEATHER_API_KEY ||
  !WEATHER_LAT ||
  !WEATHER_LON ||
  !EVENTS_API_BASE_URL ||
  !EVENTS_API_KEY
) {
  throw new Error("Missing required env vars");
}

const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${WEATHER_LAT}&lon=${WEATHER_LON}&units=${WEATHER_UNITS}&appid=${OPENWEATHER_API_KEY}`;

const weatherRes = await fetch(weatherUrl);
if (!weatherRes.ok) throw new Error(`OpenWeather failed: ${weatherRes.status}`);
const w = await weatherRes.json();

const temp = Math.round(w.main?.temp);
const feels = Math.round(w.main?.feels_like);
const condition = w.weather?.[0]?.description ?? "unknown";

const event = {
  channel: "weather",
  title: `${WEATHER_LABEL}: ${temp}°`,
  description: `${condition}, feels like ${feels}°, humidity ${w.main?.humidity}%`,
  emoji: "🌤️",
  tags: [
    `city:${WEATHER_LABEL}`,
    `condition:${condition}`,
    `temp:${temp}`,
    "source:openweather",
  ],
};

const eventsRes = await fetch(
  `${EVENTS_API_BASE_URL.replace(/\/$/, "")}/api/events`,
  {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": EVENTS_API_KEY,
    },
    body: JSON.stringify(event),
  },
);

if (!eventsRes.ok) {
  const txt = await eventsRes.text();
  throw new Error(`Events API failed: ${eventsRes.status} ${txt}`);
}

console.log("Weather event sent");
