import { useNavigate } from "react-router-dom";
import "../styles/settings.css";
import React from "react";

const THEME_OPTIONS = [
  {
    value: "default",
    label: "Default",
    description: "Current green terminal styling.",
  },
  {
    value: "futuristic",
    label: "Futuristic",
    description: "Cooler neon blue controls, panels, and hover states.",
  },
  {
    value: "simple",
    label: "Simple",
    description: "Reduced glow, softer monochrome accents.",
  },
];

const BACKGROUND_OPTIONS = [
  {
    value: "default",
    label: "Default Design",
    description: "Current terminal grid background.",
  },
  {
    value: "grand",
    label: "Grand",
    description: "Use the Grand background option.",
  },
  {
    value: "pencil",
    label: "Pencil",
    description: "Uses the pencil background option.",
  },
];

function OptionGroup({ title, description, options, value, onChange, ariaLabel }) {
  return (
    <section className="settings-section" aria-labelledby={`${ariaLabel}-title`}>
      <div>
        <h2 id={`${ariaLabel}-title`}>{title}</h2>
        <p>{description}</p>
      </div>

      <div className="settings-option-grid" role="radiogroup" aria-label={title}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`settings-option ${value === option.value ? "active" : ""}`}
            onClick={() => onChange(option.value)}
            role="radio"
            aria-checked={value === option.value}
          >
            <span>{option.label}</span>
            <em>{option.description}</em>
          </button>
        ))}
      </div>
    </section>
  );
}

function ToggleSetting({ title, description, checked, onChange }) {
  return (
    <section className="settings-section settings-toggle-section">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <button
        type="button"
        className={`settings-toggle ${checked ? "active" : ""}`}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <span className="settings-toggle-track">
          <span className="settings-toggle-thumb" />
        </span>
        <strong>{checked ? "On" : "Off"}</strong>
      </button>
    </section>
  );
}

export const Settings = ({
  theme = "default",
  setTheme = () => {},
  background = "default",
  setBackground = () => {},
  skipIntro = false,
  setSkipIntro = () => {},
}) => {
  const navigate = useNavigate();

  return (
    <div className="settings-wrapper">
      <div className="settings-panel">
        <div className="settings-title">CONFIG</div>

        <OptionGroup
          title="Theme"
          description="Choose the interface accent style for buttons, panels, card hovers, and menus."
          options={THEME_OPTIONS}
          value={theme}
          onChange={setTheme}
          ariaLabel="theme"
        />

        <OptionGroup
          title="Background"
          description="Choose the table background artwork. Images are cropped to fill the viewport instead of being stretched. All art is human-drawn."
          options={BACKGROUND_OPTIONS}
          value={background}
          onChange={setBackground}
          ariaLabel="background"
        />

        <ToggleSetting
          title="Skip Intro"
          description="Skip the opening lore and identity briefing when a new simulation starts."
          checked={skipIntro}
          onChange={setSkipIntro}
        />

        <button className="back-button" onClick={() => navigate("/")}> 
          ← Return to Base
        </button>
      </div>
    </div>
  );
};
