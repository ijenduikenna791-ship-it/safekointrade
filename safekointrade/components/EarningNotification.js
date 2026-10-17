"use client";

import { useEffect, useState } from "react";
import "./EarningNotification.css";

const countries = [
  "Cuba",
  "United States",
  "United Kingdom",
  "Canada",
  "Germany",
  "France",
  "Brazil",
  "India",
  "Japan",
  "Australia",
  "Nigeria",
  "South Africa",
  "Singapore",
  "United Arab Emirates",
  "Kenya",
  "Mexico",
  "Spain",
  "Italy",
  "Netherlands",
  "Philippines",
];

// Demo values only. Do not present these as confirmed customer earnings.
const sampleAmounts = ["$10,000", "$2,500", "$5,200", "$1,800", "$3,400"];
const notifications = countries.map((country, index) => ({
  country,
  amount: sampleAmounts[index % sampleAmounts.length],
}));

export default function EarningNotification() {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let hideTimer;
    let nextTimer;
    let startTimer;

    function startNotification() {
      if (cancelled || document.hidden) {
        startTimer = setTimeout(startNotification, 1000);
        return;
      }

      setVisible(true);

      hideTimer = setTimeout(() => {
        setVisible(false);

        nextTimer = setTimeout(() => {
          if (cancelled) return;

          setCurrent((previous) => (previous + 1) % notifications.length);
          startNotification();
        }, 1200);
      }, 5000);
    }

    startTimer = setTimeout(startNotification, 1800);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      clearTimeout(hideTimer);
      clearTimeout(nextTimer);
    };
  }, []);

  const notification = notifications[current];

  return (
    <div
      className={`earning-notification ${visible ? "earning-notification--visible" : ""}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="earning-indicator" aria-hidden="true" />
      <div>
        <span className="sample-label"></span>
        <p>
          Someone from <strong>{notification.country}</strong> just earned{" "}
          <span className="earning-amount">{notification.amount}</span>.
        </p>
      </div>
    </div>
  );
}
