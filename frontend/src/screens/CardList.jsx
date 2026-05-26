import { useNavigate } from "react-router-dom";
import "../styles/card-list.css";
import React from "react";
import cardBack from "../assets/card-back.png";

const cardModules = import.meta.glob("/src/assets/**/*.{png,jpg,jpeg,webp}", {
  eager: true,
  import: "default",
});

const normalise = (name = "") => name
  .replace(/([a-z])([A-Z])/g, "$1 $2")
  .replace(/[-_]/g, " ")
  .trim()
  .toLowerCase();

const compactName = (name = "") => normalise(name).replace(/[^a-z0-9]/g, "");

const assetEntries = Object.entries(cardModules).map(([path, src]) => {
  const raw = path.split("/").pop().replace(/\.[^/.]+$/, "");
  return {
    src,
    raw,
    normal: normalise(raw),
    compact: compactName(raw),
  };
});

const assetAliases = {
  credentialtheft: "credentialtheft",
  ddosattack: "ddosattack",
  phishing: "phishing",
  physicaldatatheft: "physicaldatatheft",
  xssattack: "xssattack",
  zerodayattack: "zerodayattack",
  twofactorauthentication: "twofactorauthentication",
  employeeawareness: "employeeawareness",
  inputsanitisation: "inputsanitisation",
  antiddosdefence: "antiddosdefence",
  securitydetail: "securitydetail",
  reconnaissance: "reconnaissance",
  checkserverlog: "checkserverlog",
  rapidincidentresponse: "rapidincidentresponse",
  threatmitigationprotocol: "threatmitigationprotocol",
};

function imageForCard(name) {
  const compact = compactName(name);
  const direct = assetEntries.find((entry) => entry.compact === compact);
  if (direct) return direct.src;

  const alias = assetAliases[compact];
  if (alias) return assetEntries.find((entry) => entry.compact === alias)?.src || cardBack;

  const fuzzy = assetEntries.find((entry) => entry.compact.includes(compact) || compact.includes(entry.compact));
  return fuzzy?.src || cardBack;
}

const attackCards = [
  { name: "Credential Theft", type: "attack", lane: "Credentials", copies: 3, deck: "Hacker" },
  { name: "Phishing", type: "attack", lane: "Social", copies: 3, deck: "Hacker" },
  { name: "XSS Attack", type: "attack", lane: "Web", copies: 3, deck: "Hacker" },
  { name: "DDoS Attack", type: "attack", lane: "Network", copies: 3, deck: "Hacker" },
  { name: "Physical Data Theft", type: "attack", lane: "Physical", copies: 3, deck: "Hacker" },
  { name: "Zero-Day Attack", type: "attack", lane: "Special", copies: 1, deck: "Hacker" },
];

const defenceCards = [
  { name: "Two-Factor Authentication", type: "defence", lane: "Credentials", copies: 3, deck: "Security" },
  { name: "Employee Awareness", type: "defence", lane: "Social", copies: 3, deck: "Security" },
  { name: "Input Sanitisation", type: "defence", lane: "Web", copies: 3, deck: "Security" },
  { name: "Anti-DDoS Defence", type: "defence", lane: "Network", copies: 3, deck: "Security" },
  { name: "Security Detail", type: "defence", lane: "Physical", copies: 3, deck: "Security" },
];

const actionCards = [
  { name: "Reconnaissance", type: "action", lane: "Private", copies: 3, deck: "Hacker" },
  { name: "Insider Sabotage", type: "action", lane: "Defence Slot", copies: 3, deck: "Hacker" },
  { name: "Rapid Incident Response", type: "action", lane: "Emergency", copies: 3, deck: "Security" },
  { name: "Check Server Log", type: "action", lane: "Investigation", copies: 3, deck: "Security" },
  { name: "Threat Mitigation Protocol", type: "action", lane: "Evidence", copies: 3, deck: "Security" },
];

const taskCards = [
  { name: "Server Maintenance", type: "task", lane: "Network", copies: 3, deck: "Task" },
  { name: "Company Meeting", type: "task", lane: "Social", copies: 3, deck: "Task" },
  { name: "Model Training", type: "task", lane: "Web", copies: 3, deck: "Task" },
  { name: "Responsible Engineer", type: "task", lane: "Credentials", copies: 3, deck: "Task" },
  { name: "Hazard Report", type: "task", lane: "Physical", copies: 3, deck: "Task" },
  { name: "Corporate Announcement", type: "task", lane: "Social", copies: 3, deck: "Task" },
  { name: "Company Mixer Event", type: "task", lane: "Social", copies: 3, deck: "Task" },
  { name: "Access Review", type: "task", lane: "Credentials", copies: 3, deck: "Task" },
  { name: "Secure Build Review", type: "task", lane: "Web", copies: 3, deck: "Task" },
  { name: "Office Lockup Audit", type: "task", lane: "Physical", copies: 3, deck: "Task" },
];

const deckLists = [
  {
    name: "Hacker Deck",
    count: attackCards.reduce((sum, card) => sum + card.copies, 0) + actionCards.filter((card) => card.deck === "Hacker").reduce((sum, card) => sum + card.copies, 0),
    cards: [
      ...attackCards,
      ...actionCards.filter((card) => card.deck === "Hacker"),
    ],
  },
  {
    name: "Security Deck",
    count: defenceCards.reduce((sum, card) => sum + card.copies, 0) + actionCards.filter((card) => card.deck === "Security").reduce((sum, card) => sum + card.copies, 0),
    cards: [
      ...defenceCards,
      ...actionCards.filter((card) => card.deck === "Security"),
    ],
  },
  {
    name: "Task Deck",
    count: taskCards.reduce((sum, card) => sum + card.copies, 0),
    cards: taskCards,
  },
];

const CardSection = ({ label, cards }) => (
  <div className="card-showcase">
    <div className="card-showcase-inner">
      <div className="showcase-label">{label}</div>
      <div className="card-grid">
        {cards.map((card, index) => (
          <div className="card-item" key={`${card.name}-${index}`} style={{ "--i": index }}>
            <div className="card-inner">
              <img src={imageForCard(card.name)} alt={card.name} className="card-image" />
              <div className="card-overlay">
                <span className="card-name">{card.name}</span>
                <span className="card-meta">{card.copies}x // {card.lane}</span>
              </div>
              <div className="card-shine" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const DeckListSection = () => (
  <div className="card-showcase deck-list-showcase">
    <div className="card-showcase-inner">
      <div className="showcase-label">deck lists</div>
      <div className="deck-list-grid">
        {deckLists.map((deck) => (
          <section className="deck-list-card" key={deck.name}>
            <div className="deck-list-heading">
              <h2>{deck.name}</h2>
              <span>{deck.count} cards</span>
            </div>
            <div className="deck-list-rows">
              {deck.cards.map((card) => (
                <div className="deck-list-row" key={`${deck.name}-${card.name}`}>
                  <strong>{card.copies}x</strong>
                  <span>{card.name}</span>
                  <em>{card.type} // {card.lane}</em>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  </div>
);

export const CardList = () => {
  const navigate = useNavigate();
  const uniqueTotal = attackCards.length + defenceCards.length + actionCards.length + taskCards.length;
  const deckTotal = deckLists.reduce((sum, deck) => sum + deck.count, 0);

  return (
    <div className="card-list-page">
      <header className="card-list-header">
        <span className="header-eyebrow">Classified Database</span>
        <h1>ARSENAL</h1>
        <span className="header-count">{uniqueTotal} live modules // {deckTotal} deck cards</span>
      </header>

      <DeckListSection />
      <CardSection label="hacker registry" cards={attackCards} />
      <CardSection label="defence registry" cards={defenceCards} />
      <CardSection label="action registry" cards={actionCards} />
      <CardSection label="task registry" cards={taskCards} />

      <button className="back-button" onClick={() => navigate(-1)}>← Back</button>
    </div>
  );
};
