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
    description: "Reduced glow and softer monochrome interface accents.",
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
    description: "Uses the supplied grand background asset when available.",
  },
  {
    value: "pencil",
    label: "Pencil",
    description: "Uses the supplied pencil background asset when available.",
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

export const Settings = ({
  theme = "default",
  setTheme = () => {},
  background = "default",
  setBackground = () => {},
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
          description="Choose the table background artwork. Images are cropped to fill the viewport instead of being stretched."
          options={BACKGROUND_OPTIONS}
          value={background}
          onChange={setBackground}
          ariaLabel="background"
        />

        <button className="back-button" onClick={() => navigate("/")}> 
          ← Return to Base
        </button>
      </div>
    </div>
  );
};
