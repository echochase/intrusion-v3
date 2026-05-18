import { useNavigate } from "react-router-dom";
import "../styles/settings.css";
import React from "react";

export const Settings = () => {
  const navigate = useNavigate();

  return (
    <div className="settings-wrapper">
      <div className="settings-panel">
        <div className="settings-title">CONFIG</div>
        <p className="settings-stub">// No additional parameters available.<br />Further modules pending deployment.</p>
        <button className="back-button" onClick={() => navigate("/")}>
          ← Return to Base
        </button>
      </div>
    </div>
  );
};