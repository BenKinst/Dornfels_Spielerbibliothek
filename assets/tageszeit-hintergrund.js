(() => {
  "use strict";

  const root = document.documentElement;

  // Einheitlicher Referenzpunkt in der geografischen Mitte Deutschlands.
  // Damit ist keine Standortfreigabe des Seitenbesuchers erforderlich.
  const GERMANY_CENTER = Object.freeze({
    latitude: 51.1657,
    longitude: 10.4515
  });

  const setPeriod = (period) => root.setAttribute("data-dornfels-time", period);

  // NOAA-Näherung für Sonnenaufgang/-untergang; Ergebnis sind UTC-Minuten.
  // Der Zenit 90,833° berücksichtigt die scheinbare Sonnenscheibe und Refraktion.
  const solarTimes = (date, latitude, longitude) => {
    const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
    const day = Math.floor((date - start) / 86400000);
    const gamma = 2 * Math.PI / 365 * (day - 1);
    const equation = 229.18 * (
      0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
      - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma)
    );
    const declination =
      0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
      - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
      - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
    const lat = latitude * Math.PI / 180;
    const cosHour = (Math.cos(90.833 * Math.PI / 180) /
      (Math.cos(lat) * Math.cos(declination))) -
      Math.tan(lat) * Math.tan(declination);

    if (cosHour > 1) return { polar: "night" };
    if (cosHour < -1) return { polar: "day" };

    const hourAngle = Math.acos(cosHour) * 180 / Math.PI;
    const solarNoon = 720 - 4 * longitude - equation;
    return {
      sunrise: solarNoon - 4 * hourAngle,
      sunset: solarNoon + 4 * hourAngle
    };
  };

  const updatePeriod = () => {
    const now = new Date();
    const times = solarTimes(
      now,
      GERMANY_CENTER.latitude,
      GERMANY_CENTER.longitude
    );

    if (times.polar) {
      setPeriod(times.polar);
      return;
    }

    const utcMinutes = now.getUTCHours() * 60 +
      now.getUTCMinutes() + now.getUTCSeconds() / 60;

    setPeriod(
      utcMinutes >= times.sunrise && utcMinutes < times.sunset
        ? "day"
        : "night"
    );
  };

  updatePeriod();

  // Bei länger geöffnetem Tab regelmäßig und nach Rückkehr aktualisieren.
  window.setInterval(updatePeriod, 10 * 60 * 1000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updatePeriod();
  });
})();