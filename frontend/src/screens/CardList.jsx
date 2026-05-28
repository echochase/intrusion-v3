import { useNavigate } from "react-router-dom";
import "../styles/card-list.css";
import React, { useState } from "react";
import cardBack from "../assets/card-back.png";
import { cardTextFor, enrichCardText } from "../data/cardText";

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
  falseflag: "falseflag",
  checkserverlog: "checkserverlog",
  rapidincidentresponse: "rapidincidentresponse",
  forensicanalysis: "forensicanalysis",
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

function withCardText(card) {
  return enrichCardText({ ...card, ...cardTextFor(card.name) });
}

function cleanEffectText(value = "") {
  return String(value).replace(/^Effect:\s*/i, "").trim();
}

function effectText(card) {
  return cleanEffectText(card?.effectDescription || cardTextFor(card?.name).effectDescription || "");
}

const attackCards = [
  { name: "Credential Theft", type: "attack", lane: "Credentials", copies: 3, deck: "Hacker" },
  { name: "Phishing", type: "attack", lane: "Social", copies: 3, deck: "Hacker" },
  { name: "XSS Attack", type: "attack", lane: "Web", copies: 3, deck: "Hacker" },
  { name: "DDoS Attack", type: "attack", lane: "Network", copies: 3, deck: "Hacker" },
  { name: "Physical Data Theft", type: "attack", lane: "Physical", copies: 3, deck: "Hacker" },
  { name: "Zero-Day Attack", type: "attack", lane: "Special", copies: 1, deck: "Hacker" },
].map(withCardText);

const defenceCards = [
  { name: "Two-Factor Authentication", type: "defence", lane: "Credentials", copies: 3, deck: "Security" },
  { name: "Employee Awareness", type: "defence", lane: "Social", copies: 3, deck: "Security" },
  { name: "Input Sanitisation", type: "defence", lane: "Web", copies: 3, deck: "Security" },
  { name: "Anti-DDoS Defence", type: "defence", lane: "Network", copies: 3, deck: "Security" },
  { name: "Security Detail", type: "defence", lane: "Physical", copies: 3, deck: "Security" },
].map(withCardText);

const actionCards = [
  { name: "Reconnaissance", type: "action", lane: "Private", copies: 3, deck: "Hacker" },
  { name: "False Flag", type: "action", lane: "Deception", copies: 2, deck: "Hacker" },
  { name: "Insider Sabotage", type: "action", lane: "Defence Slot", copies: 3, deck: "Hacker" },
  { name: "Rapid Incident Response", type: "action", lane: "Emergency", copies: 3, deck: "Security" },
  { name: "Check Server Log", type: "action", lane: "Investigation", copies: 3, deck: "Security" },
  { name: "Forensic Analysis", type: "action", lane: "Evidence", copies: 3, deck: "Security" },
].map(withCardText);

const taskCards = [
  { name: "Server Maintenance", type: "task", lane: "Network", copies: 2, deck: "Task" },
  { name: "Company Meeting", type: "task", lane: "Social", copies: 2, deck: "Task" },
  { name: "Model Training", type: "task", lane: "Web", copies: 2, deck: "Task" },
  { name: "Responsible Engineer", type: "task", lane: "Credentials", copies: 2, deck: "Task" },
  { name: "Hazard Report", type: "task", lane: "Physical", copies: 2, deck: "Task" },
  { name: "Corporate Announcement", type: "task", lane: "Social", copies: 2, deck: "Task" },
  { name: "Company Mixer Event", type: "task", lane: "Social + Physical", copies: 2, deck: "Task" },
  { name: "Access Review", type: "task", lane: "Credentials + Web", copies: 2, deck: "Task" },
  { name: "Secure Build Review", type: "task", lane: "Web + Network", copies: 2, deck: "Task" },
  { name: "Office Lockup Audit", type: "task", lane: "Physical", copies: 2, deck: "Task" },
].map(withCardText);

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

const CardSection = ({ label, cards, onInspect }) => (
  <div className="card-showcase">
    <div className="card-showcase-inner">
      <div className="showcase-label">{label}</div>
      <div className="card-grid">
        {cards.map((card, index) => (
          <div className="card-item" key={`${card.name}-${index}`} style={{ "--i": index }}>
            <button
              type="button"
              className="card-inner"
              onClick={() => onInspect(card)}
            >
              <img src={imageForCard(card.name)} alt={card.name} className="card-image" />
              <div className="card-overlay">
                <span className="card-name">{card.name}</span>
                <span className="card-meta">{card.copies}x // {card.type} // {card.lane}</span>
                <span className="card-inspect-hint">Click to inspect</span>
              </div>
              <div className="card-shine" />
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const DeckListSection = ({ onInspect }) => (
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
                <button
                  type="button"
                  className="deck-list-row"
                  key={`${deck.name}-${card.name}`}
                  onClick={() => onInspect(card)}
                >
                  <strong>{card.copies}x</strong>
                  <span>{card.name}</span>
                  <em>{card.type} // {card.lane}</em>
                  <small>{effectText(card)}</small>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  </div>
);

function CardLibraryPreviewModal({ card, onClose }) {
  if (!card) return null;
  const displayCard = enrichCardText(card);

  return (
    <div className="card-library-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="card-library-modal" role="dialog" aria-modal="true" aria-labelledby="card-library-modal-title" onClick={(event) => event.stopPropagation()}>
        <div className="card-library-modal-art">
          <img src={imageForCard(displayCard.name)} alt={displayCard.name} />
        </div>
        <div className="card-library-modal-copy">
          <span>{displayCard.type} // {displayCard.lane}</span>
          <h2 id="card-library-modal-title">{displayCard.name}</h2>
          <p>{displayCard.description}</p>
          <p><strong>Effect:</strong> {effectText(displayCard)}</p>
          <div className="card-library-modal-meta">
            <span>{displayCard.copies} copies</span>
            <span>{displayCard.deck} deck</span>
          </div>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export const CardList = () => {
  const navigate = useNavigate();
  const [previewCard, setPreviewCard] = useState(null);
  const uniqueTotal = attackCards.length + defenceCards.length + actionCards.length + taskCards.length;
  const deckTotal = deckLists.reduce((sum, deck) => sum + deck.count, 0);

  return (
    <div className="card-list-page">
      <header className="card-list-header">
        <span className="header-eyebrow">Classified Database</span>
        <h1>CARD LIBRARY</h1>
        <span className="header-count">{uniqueTotal} live modules // {deckTotal} deck cards</span>
      </header>

      <DeckListSection onInspect={setPreviewCard} />
      <CardSection label="hacker registry" cards={attackCards} onInspect={setPreviewCard} />
      <CardSection label="defence registry" cards={defenceCards} onInspect={setPreviewCard} />
      <CardSection label="action registry" cards={actionCards} onInspect={setPreviewCard} />
      <CardSection label="task registry" cards={taskCards} onInspect={setPreviewCard} />

      <CardLibraryPreviewModal card={previewCard} onClose={() => setPreviewCard(null)} />
      <button className="back-button" onClick={() => navigate(-1)}>← Back</button>
    </div>
  );
};
