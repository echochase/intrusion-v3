import { useNavigate } from "react-router-dom";
import "../styles/card-list.css";
import React from "react";

const attackCardModules = import.meta.glob("/src/assets/attack-cards/*.{png,jpg,jpeg,webp}", {
  eager: true,
  import: "default",
});

const defenceCardModules = import.meta.glob("/src/assets/defence-cards/*.{png,jpg,jpeg,webp}", {
  eager: true,
  import: "default",
});

const taskCardModules = import.meta.glob("/src/assets/task-cards/*.{png,jpg,jpeg,webp}", {
  eager: true,
  import: "default",
});

const actionNames = new Set([
  "reconnaissance",
  "check server log",
  "rapid incident response",
  "threat mitigation protocol",
]);

const normalise = (name = "") => name
  .replace(/([a-z])([A-Z])/g, "$1 $2")
  .replace(/[-_]/g, " ")
  .trim()
  .toLowerCase();

const formatCards = (modules) =>
  Object.entries(modules).map(([path, src]) => {
    const raw = path.split("/").pop().replace(/\.[^/.]+$/, "");
    return {
      src,
      name: raw.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]/g, " "),
      normal: normalise(raw),
    };
  });

const attackAndActionCards = formatCards(attackCardModules);
const defenceAndActionCards = formatCards(defenceCardModules);
const taskCards = formatCards(taskCardModules);

const actionCards = [
  ...attackAndActionCards.filter((card) => actionNames.has(card.normal)),
  ...defenceAndActionCards.filter((card) => actionNames.has(card.normal)),
];
const attackCards = attackAndActionCards.filter((card) => !actionNames.has(card.normal));
const defenceCards = defenceAndActionCards.filter((card) => !actionNames.has(card.normal));

const CardSection = ({ label, cards }) => (
  <div className="card-showcase">
    <div className="card-showcase-inner">
      <div className="showcase-label">{label}</div>
      <div className="card-grid">
        {cards.map((card, index) => (
          <div className="card-item" key={`${card.name}-${index}`} style={{ "--i": index }}>
            <div className="card-inner">
              <img src={card.src} alt={card.name} className="card-image" />
              <div className="card-overlay"><span className="card-name">{card.name}</span></div>
              <div className="card-shine" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const CardList = () => {
  const navigate = useNavigate();
  const total = attackCards.length + defenceCards.length + actionCards.length + taskCards.length;

  return (
    <div className="card-list-page">
      <header className="card-list-header">
        <span className="header-eyebrow">Classified Database</span>
        <h1>ARSENAL</h1>
        <span className="header-count">{total} modules loaded</span>
      </header>

      <CardSection label="attack registry" cards={attackCards} />
      <CardSection label="defence registry" cards={defenceCards} />
      <CardSection label="action registry" cards={actionCards} />
      <CardSection label="task registry" cards={taskCards} />

      <button className="back-button" onClick={() => navigate(-1)}>← Back</button>
    </div>
  );
};
