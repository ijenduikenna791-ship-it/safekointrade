"use client";

import { useEffect, useState } from "react";
import "./EarningNotification.css";

const notifications = [
  { country: "Cuba", amount: "$10,000" },
  { country: "united states", amount: "$2,500" },
  { country: "United Kingdom", amount: "$5,200" },
  { country: "Canada", amount: "$1,800" },
  { country: "Germany", amount: "$3,400" },
];

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

          setCurrent((previous) =>
            (previous + 1) % notifications.length
          );

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
      className={`earning-notification ${
        visible ? "earning-notification--visible" : ""
      }`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <p>
        <span className="sample-label"></span>{" "}
        Someone from <strong>{notification.country}</strong> just earned{" "}
        <span className="earning-amount">
          {notification.amount}
        </span>
        <span className="earning-period">.</span>
      </p>
    </div>
  );
}
