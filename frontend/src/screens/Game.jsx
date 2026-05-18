import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Modal } from "@mui/material";
import "../styles/game.css";

const CARD_BACK_SRC = "/src/assets/card-back.png";

const cardModules = import.meta.glob(
  "/src/assets/{attack-cards,defence-cards,task-cards,skill-cards}/*.{png,jpg,jpeg,webp}",
  { eager: true, import: "default" }
);

function normaliseCardName(value = "") {
  return value
    .split("/")
    .pop()
    .replace(/\.[^/.]+$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function compactName(value = "") {
  return normaliseCardName(value).replace(/[^a-z0-9]/g, "");
}

const cardImageEntries = Object.entries(cardModules).map(([path, src]) => ({
  normal: normaliseCardName(path),
  compact: compactName(path),
  src,
}));

const cardImageMap = Object.fromEntries(cardImageEntries.map(({ normal, src }) => [normal, src]));
const compactCardImageMap = Object.fromEntries(cardImageEntries.map(({ compact, src }) => [compact, src]));

function titleCaseCardName(value = "") {
  const lower = normaliseCardName(value);
  const words = lower.split(" " ).filter(Boolean);
  const titled = words.map((word) => {
    if (word === "ddos") return "DDoS";
    if (word === "xss") return "XSS";
    if (word === "sqli") return "SQLi";
    if (word === "sql") return "SQL";
    if (word === "sep") return "SEP";
    if (word === "sim") return "SIM";
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(" " );

  if (titled === "DDoS") return "DDoS Attack";
  if (titled === "Zero Day") return "Zero-Day Attack";
  if (titled === "Brute Force") return "Brute Force Attack";
  return titled;
}

const KNOWN_CARD_NAMES = Array.from(new Set([
  ...cardImageEntries.map(({ normal }) => titleCaseCardName(normal)),
  "DDoS",
  "DDoS Attack",
  "Zero-Day",
  "Zero-Day Attack",
  "Credential Theft",
  "XSS Attack",
  "SQL Injection",
  "Rapid Incident Response",
  "Threat Mitigation Protocol",
  "Check Server Log",
  "Reconnaissance",
  "Insider Sabotage",
  "Socialise with Tech Team",
  "Two-Factor Authentication",
  "Anti-DDoS Defence",
  "Secure Hashing & Salting",
  "Employee Awareness",
  "Security Detail",
  "Input Sanitisation",
  "Phishing",
  "Shoulder Surfing",
  "Stored XSS",
  "Reflected XSS",
  "SIM Swapping",
  "Physical Data Theft",
  "Authenticator Theft",
  "Brute Force Attack",
  "Hazard Report",
  "Corporate Announcement",
  "Server Maintenance",
  "Company Meeting",
  "Model Training",
  "Responsible Engineer",
  "Company Mixer Event",
])).filter(Boolean).sort((a, b) => b.length - a.length);

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function flexibleNamePattern(name = "") {
  const tokens = String(name).match(/[a-z0-9]+/gi);
  if (!tokens || tokens.length === 0) return null;
  return tokens.map(escapeRegex).join("[-\\s]+");
}

function TextWithHighlightedCards({ text, preferred = [] }) {
  const source = String(text || "");
  const names = Array.from(new Set([...preferred.filter(Boolean), ...KNOWN_CARD_NAMES]))
    .filter((name) => String(name).trim().length > 2)
    .sort((a, b) => String(b).length - String(a).length);

  let parts = [{ text: source, highlighted: false }];

  for (const name of names) {
    const pattern = flexibleNamePattern(name);
    if (!pattern) continue;
    const regex = new RegExp(pattern, "gi");
    const next = [];

    for (const part of parts) {
      if (part.highlighted) {
        next.push(part);
        continue;
      }

      let lastIndex = 0;
      let match;
      let matched = false;
      regex.lastIndex = 0;

      while ((match = regex.exec(part.text)) !== null) {
        matched = true;
        if (match.index > lastIndex) {
          next.push({ text: part.text.slice(lastIndex, match.index), highlighted: false });
        }
        next.push({ text: match[0], highlighted: true });
        lastIndex = match.index + match[0].length;
      }

      if (!matched) {
        next.push(part);
      } else if (lastIndex < part.text.length) {
        next.push({ text: part.text.slice(lastIndex), highlighted: false });
      }
    }

    parts = next;
  }

  return (
    <>
      {parts.map((part, index) => (
        part.highlighted
          ? <span key={`${part.text}-${index}`} className="card-name-highlight">{part.text}</span>
          : <React.Fragment key={`${part.text}-${index}`}>{part.text}</React.Fragment>
      ))}
    </>
  );
}

function imageFor(card) {
  if (!card?.name) return null;

  const normal = normaliseCardName(card.name);
  const compact = compactName(card.name);

  if (cardImageMap[normal]) return cardImageMap[normal];
  if (compactCardImageMap[compact]) return compactCardImageMap[compact];

  const fuzzy = cardImageEntries.find((entry) =>
    entry.compact.includes(compact) || compact.includes(entry.compact)
  );

  return fuzzy?.src ?? null;
}



const SKILL_LABELS = {
  time: 'TIME MGMT',
  comm: 'COMMUNICATION',
  prog: 'PROGRAMMING',
  sep: 'SE points',
};

function extractSkillCost(card) {
  if (!card || card.type === 'action' || card.type === 'skill') return [];

  const text = `${card.effectDescription || ''}\n${card.description || ''}`;
  const costs = [];
  const seen = new Set();
  const pattern = /(\d+)\s*x\s*(Communication|Time Management|Programming)/gi;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const skillName = match[2].toLowerCase();
    const kind = skillName.includes('communication')
      ? 'comm'
      : skillName.includes('programming')
        ? 'prog'
        : 'time';
    const key = `${kind}-${match[1]}`;

    if (!seen.has(key)) {
      seen.add(key);
      costs.push({ kind, amount: Number(match[1]) });
    }
  }

  return costs;
}

function playerSkillValue(player, kind) {
  if (!player) return 0;
  if (kind === 'time') return player.timePoints ?? 0;
  if (kind === 'comm') return player.commPoints ?? 0;
  if (kind === 'prog') return player.progPoints ?? 0;
  return 0;
}

function canAffordCard(player, card) {
  if (!card || card.type === 'action' || card.type === 'skill') return true;
  const costs = extractSkillCost(card);
  return costs.every(({ kind, amount }) => playerSkillValue(player, kind) >= amount);
}

function affordabilityMessage(player, card) {
  if (!card || card.type === 'action' || card.type === 'skill') return '';
  const costs = extractSkillCost(card);
  const missing = costs
    .filter(({ kind, amount }) => playerSkillValue(player, kind) < amount)
    .map(({ kind, amount }) => `${SKILL_LABELS[kind]} ${playerSkillValue(player, kind)}/${amount}`);

  if (missing.length === 0) return '';
  return `Cannot afford ${card?.name || 'that card'} - need ${missing.join(', ')}.`;
}

function CardCostChips({ card }) {
  const costs = extractSkillCost(card);

  if (card?.type === 'action') {
    return <span className="cost-chip cost-free">Free action</span>;
  }

  if (card?.type === 'skill') {
    return <span className="cost-chip cost-free">Free skill</span>;
  }

  if (costs.length === 0) {
    return <span className="cost-chip cost-free">No skill cost</span>;
  }

  return costs.map(({ kind, amount }) => (
    <span key={`${kind}-${amount}`} className={`cost-chip skill-${kind}`}>
      {SKILL_LABELS[kind]} {amount}
    </span>
  ));
}

function effectText(card) {
  return card?.effectDescription || card?.description || 'No extra effect text.';
}

function CardTile({
  card,
  selected,
  draggable = false,
  disabled = false,
  onClick,
  onDragStart,
  onInspect,
  compact = false,
  animate = false,
}) {
  const src = imageFor(card);
  const holdTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);
  const [holding, setHolding] = useState(false);

  const clearHold = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHolding(false);
  };

  useEffect(() => () => {
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
  }, []);

  const startHold = (event) => {
    if (!card) return;
    if (event.button !== undefined && event.button !== 0) return;

    longPressFiredRef.current = false;
    clearHold();
    setHolding(true);

    holdTimerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      holdTimerRef.current = null;
      setHolding(false);
      onInspect?.(card);
    }, 500);
  };

  const handleClick = (event) => {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (!disabled) onClick?.(event);
  };

  return (
    <div
      className={`play-card ${selected ? "selected" : ""} ${compact ? "compact" : ""} ${disabled ? "disabled" : ""} ${animate ? "drawn-card" : ""} ${holding ? "holding" : ""}`}
      draggable={draggable && !disabled}
      onClick={handleClick}
      onPointerDown={startHold}
      onPointerUp={clearHold}
      onPointerCancel={clearHold}
      onPointerLeave={clearHold}
      onDragStart={(event) => {
        clearHold();
        onDragStart?.(event);
      }}
      title={effectText(card)}
    >
      {src ? (
        <img src={src} alt={card.name} className="play-card-image" draggable={false} />
      ) : (
        <div className="play-card-fallback">
          <span>{card?.type || "card"}</span>
          <strong>{card?.name}</strong>
        </div>
      )}

      <div className="play-card-details">
        <strong>{card?.name}</strong>
        <p>{effectText(card)}</p>
        <div className="cost-chip-row">
          <CardCostChips card={card} />
          {card?.deployTime > 0 && (
            <span className="cost-chip cost-delay">{card.deployTime} turn pending</span>
          )}
        </div>
      </div>

      {holding && (
        <div className="hold-progress" aria-label="Hold to inspect">
          <svg viewBox="0 0 44 44" aria-hidden="true">
            <circle cx="22" cy="22" r="18" />
            <circle className="hold-progress-fill" cx="22" cy="22" r="18" />
          </svg>
        </div>
      )}

      <div className="play-card-meta">
        <span>{card?.type}</span>
        {card?.deployTime > 0 && <span>{card.deployTime} turn</span>}
      </div>
    </div>
  );
}

function SkillValue({ label, value = 0, delta = 0, kind }) {
  return (
    <div className={`skill-cell skill-${kind} ${delta > 0 ? "skill-pending" : ""}`}>
      <span>{label}</span>
      <strong>
        {delta > 0 ? (
          <>
            <span className="skill-current">{value}</span>
            <span className="skill-arrow">-&gt;</span>
            <span className="skill-next">{value + delta}</span>
          </>
        ) : (
          value
        )}
      </strong>
    </div>
  );
}

function PlayerSkillChips({ player }) {
  return (
    <div className="agent-skills" aria-label={`${player.name} status`}>
      <span className="agent-skill-chip skill-time">tasks {player.tasksCompleted ?? 0}</span>
      {player.awaitingDrawChoice && <span className="agent-skill-chip skill-comm">drawing</span>}
      {player.mustDiscard && <span className="agent-skill-chip skill-prog">discard {player.discardCount ?? 0}</span>}
    </div>
  );
}

function DefenceZone({ slots = [], onInspect }) {
  const normalisedSlots = [...slots];
  while (normalisedSlots.length < 3) {
    normalisedSlots.push({ state: "empty", index: normalisedSlots.length });
  }

  return (
    <div className="defence-zone" aria-label="Defence zone">
      {normalisedSlots.slice(0, 3).map((slot, index) => {
        if (slot.state === "revealed" && slot.card) {
          return (
            <div key={slot.card.id ?? index} className="defence-slot revealed">
              <CardTile card={slot.card} compact disabled onInspect={onInspect} />
            </div>
          );
        }

        if (slot.state === "hidden") {
          return (
            <div key={`hidden-${index}`} className="defence-slot hidden-card">
              <img
                src={CARD_BACK_SRC}
                alt="Face-down defence card"
                draggable={false}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <span>Face Down</span>
            </div>
          );
        }

        return (
          <div key={`empty-${index}`} className="defence-slot empty">
            <span>Empty Slot</span>
          </div>
        );
      })}
    </div>
  );
}

function LaneBoard({ lanes = [], onInspect }) {
  const fallback = [
    { lane: 'credentials', label: 'Credentials', status: 'open', expectedDefence: 'Two-Factor Authentication' },
    { lane: 'social', label: 'Social', status: 'open', expectedDefence: 'Employee Awareness' },
    { lane: 'web', label: 'Web', status: 'open', expectedDefence: 'Input Sanitisation' },
    { lane: 'network', label: 'Network', status: 'open', expectedDefence: 'Anti-DDoS Defence' },
    { lane: 'physical', label: 'Physical', status: 'open', expectedDefence: 'Security Detail' },
  ];
  const rows = lanes.length ? lanes : fallback;

  return (
    <div className="lane-board" aria-label="Security lanes">
      {rows.map((lane) => (
        <button
          key={lane.lane || lane.label}
          type="button"
          className={`lane-row ${lane.status === 'defended' ? 'defended' : 'open'}`}
          onClick={() => lane.defence && onInspect?.(lane.defence)}
        >
          <span className="lane-name">{lane.label}</span>
          <strong>{lane.status === 'defended' ? 'DEFENDED' : 'OPEN'}</strong>
          <small>{lane.defence?.name || lane.expectedDefence}</small>
        </button>
      ))}
    </div>
  );
}

function HackerDrawPanel({ you, onChoose }) {
  if (!you?.awaitingDrawChoice) return null;

  return (
    <section className="game-panel hacker-draw-panel">
      <div className="panel-heading">
        <span>// private draw</span>
        <strong>choose 2 cards</strong>
      </div>
      <p>Choose any combination of Security and Hacker deck draws. After drawing, discard 1 card from your hand before submitting.</p>
      <div className="hacker-draw-options">
        <button type="button" onClick={() => onChoose({ security: 0, hacker: 2 })}>2 Hacker</button>
        <button type="button" onClick={() => onChoose({ security: 1, hacker: 1 })}>1 + 1</button>
        <button type="button" onClick={() => onChoose({ security: 2, hacker: 0 })}>2 Security</button>
      </div>
    </section>
  );
}


function PendingBreakdown({ counts = {} }) {
  return (
    <div className="pending-breakdown">
      <div><span>condition</span><strong>{counts.condition ?? 0}</strong></div>
      <div><span>1-turn</span><strong>{counts.oneTurn ?? 0}</strong></div>
      <div><span>2-turn</span><strong>{counts.twoTurn ?? 0}</strong></div>
    </div>
  );
}

function displayRole(role) {
  if (role === "SecEng") return "Security Engineer";
  return role || "Unknown";
}

function formatLogEntry(entry) {
  if (typeof entry === 'string') return entry;
  if (entry?.publicMessage) return entry.publicMessage;

  const name = entry?.name || "Unknown";
  const description = entry?.description || "resolved";
  return `${entry?.type || "card"}: ${name} (${description})`;
}

function VoteModal({ open, onClose, players, name, onVote }) {
  const activeTargets = players.filter((p) => p.name !== name && !p.isEliminated);

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal center vote-modal">
        <h2>Accuse Player</h2>
        <p>Select the player you believe is the hacker.</p>

        <div className="vote-grid">
          {activeTargets.map((player) => (
            <button key={player.name} type="button" onClick={() => onVote(player.name)}>
              {player.name}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function LogModal({ open, onClose, logs }) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal center game-log-modal">
        <h2>Table Log</h2>

        <div className="game-log-list">
          {logs.length === 0 ? (
            <p>No log entries yet.</p>
          ) : (
            logs.map((entry, i) => (
              <div key={`${entry}-${i}`} className="game-log-line">
                &gt; <TextWithHighlightedCards text={entry} />
              </div>
            ))
          )}
        </div>

        <button type="button" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

function CardPreviewModal({ card, onClose }) {
  const src = imageFor(card);

  return (
    <Modal open={Boolean(card)} onClose={onClose}>
      <div className="card-preview-shell" onClick={onClose}>
        <div className="card-preview-panel" onClick={(event) => event.stopPropagation()}>
          <div className="card-preview-art">
            {src ? (
              <img src={src} alt={card?.name} draggable={false} />
            ) : (
              <div className="play-card-fallback">
                <span>{card?.type || 'card'}</span>
                <strong>{card?.name}</strong>
              </div>
            )}
          </div>

          <div className="card-preview-copy">
            <span>{card?.type}</span>
            <h2>{card?.name}</h2>
            <p>{effectText(card)}</p>
            <div className="cost-chip-row">
              <CardCostChips card={card} />
              {card?.deployTime > 0 && (
                <span className="cost-chip cost-delay">{card.deployTime} turn pending</span>
              )}
            </div>
            <button type="button" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}


function splitLines(text = '') {
  return String(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function taskFeatureChips(task) {
  const text = `${task?.effectDescription || ''}\n${task?.description || ''}`.toLowerCase();
  const chips = [];
  if ((task?.deployTime ?? 0) > 0) chips.push(`PENDING ${task.deployTime} TURN${task.deployTime === 1 ? '' : 'S'}`);
  if (text.includes('condition')) chips.push('CONDITION');
  if (text.includes('side effect')) chips.push('SIDE EFFECT');
  if (text.includes('trigger')) chips.push('TRIGGER');
  return chips;
}

function TaskDetails({ task }) {
  if (!task) return <p>No task assigned.</p>;

  const detailLines = splitLines(task.effectDescription || 'No special requirements.');
  const features = taskFeatureChips(task);

  return (
    <div className="task-detail-card">
      <div className="task-title-row">
        <div>
          <span>{task.type || 'task'}</span>
          <h3>{task.name}</h3>
        </div>
        <div className="cost-chip-row">
          <CardCostChips card={task} />
        </div>
      </div>

      <p className="task-description">{task.description || 'No task description.'}</p>

      {features.length > 0 && (
        <div className="task-feature-row">
          {features.map((feature) => (
            <span key={feature} className="task-feature-chip">{feature}</span>
          ))}
        </div>
      )}

      <ul className="task-effect-list">
        {detailLines.map((line, index) => (
          <li key={`${line}-${index}`}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function TaskLeaderboard({ leaderboard = [] }) {
  return (
    <div className="task-leaderboard">
      <div className="zone-heading">Task Leaderboard</div>
      {leaderboard.length === 0 ? (
        <p>No completed tasks yet.</p>
      ) : (
        leaderboard.map((entry, index) => (
          <div key={entry.name} className="leaderboard-row">
            <span>#{index + 1} {entry.name}</span>
            <strong>{entry.tasksCompleted ?? 0}</strong>
          </div>
        ))
      )}
    </div>
  );
}

function CoinFlipSet({ flips = [] }) {
  if (!flips.length) return null;

  return (
    <div className="incident-coins" aria-label="Coin flips">
      {flips.map((flip, index) => (
        <div key={`${flip}-${index}`} className={`incident-coin ${flip}`} style={{ animationDelay: `${index * 0.12}s` }}>
          <span>{flip === 'heads' ? 'H' : 'T'}</span>
        </div>
      ))}
    </div>
  );
}

function IntegrityLoss({ page }) {
  const delta = page?.integrityDelta ?? 0;
  if (delta <= 0) return null;

  return (
    <div className="integrity-loss-card">
      <span>System Integrity</span>
      <strong>
        {page.integrityBefore} <span>-{delta}</span> {page.integrityAfter}
      </strong>
      <div className="integrity-loss-bar"><i /></div>
    </div>
  );
}

function IncidentReportModal({ open, pages, index, setIndex, onClose }) {
  const page = pages[index] || pages[0];
  const card = page?.card || null;
  const src = imageFor(card);
  const isPrivate = page?.type === 'private';

  const goPrev = () => setIndex((current) => Math.max(0, current - 1));
  const goNext = () => setIndex((current) => Math.min((pages?.length || 1) - 1, current + 1));

  return (
    <Modal open={open && Boolean(page)} onClose={onClose}>
      <div className="incident-shell">
        <div className={`incident-panel ${isPrivate ? 'private' : ''}`}>
          <div className="incident-header">
            <div>
              <span className="header-eyebrow">incident report</span>
              <h2>{page?.title || 'Turn event'}</h2>
            </div>
            <strong>{index + 1}/{pages.length}</strong>
          </div>

          <div className="incident-body">
            {card && (
              <div className="incident-card-art">
                {src ? (
                  <img src={src} alt={card.name} draggable={false} />
                ) : (
                  <div className="play-card-fallback"><span>{card.type}</span><strong>{card.name}</strong></div>
                )}
              </div>
            )}

            <div className="incident-copy">
              <span>{isPrivate ? 'private result' : page?.cardType || page?.type || 'system'}</span>
              <p>
                <TextWithHighlightedCards
                  text={page?.message || 'An operation resolved.'}
                  preferred={[page?.cardName, card?.name, card?.rawName]}
                />
              </p>
              <CoinFlipSet flips={page?.coinFlips || []} />
              <IntegrityLoss page={page} />

              {page?.defenceCard && (
                <div className="blocked-defence-note">
                  <span>blocking defence revealed</span>
                  <strong><TextWithHighlightedCards text={page.defenceCard.name} preferred={[page.defenceCard.name, page.defenceCard.rawName]} /></strong>
                </div>
              )}

              {isPrivate && (
                <div className="private-result-list">
                  {(page.cards || []).length === 0 ? (
                    <p>Pending zone empty.</p>
                  ) : (
                    (page.cards || []).map((pendingCard) => (
                      <div key={pendingCard.id || pendingCard.name} className="private-result-card">
                        <strong><TextWithHighlightedCards text={pendingCard.name} preferred={[pendingCard.name, pendingCard.rawName]} /></strong>
                        <span>{pendingCard.type} {pendingCard.deployTime > 0 ? `// ${pendingCard.deployTime} turn pending` : ''}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {page?.discardedCards?.length > 0 && (
                <div className="private-result-list">
                  {page.discardedCards.map((discarded) => (
                    <div key={discarded.id || discarded.name} className="private-result-card">
                      <strong><TextWithHighlightedCards text={discarded.name} preferred={[discarded.name, discarded.rawName]} /></strong>
                      <span>{discarded.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="incident-actions">
            <button type="button" onClick={goPrev} disabled={index <= 0}>Prev</button>
            {index < pages.length - 1 ? (
              <button type="button" onClick={goNext}>Next</button>
            ) : (
              <button type="button" onClick={onClose}>Close Report</button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function RulesList({ children }) {
  return <div className="rules-list">{children}</div>;
}

function RuleBlock({ title, children }) {
  return (
    <section className="rules-block">
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

function GameInfoModal({ open, onClose }) {
  const [tab, setTab] = useState('rules');

  return (
    <Modal open={open} onClose={onClose}>
      <div className="game-info-shell" onClick={onClose}>
        <div className="game-info-panel" onClick={(event) => event.stopPropagation()}>
          <div className="game-info-header">
            <div>
              <span className="header-eyebrow">internal briefing</span>
              <h2>{tab === 'rules' ? 'Rules of Intrusion' : 'Field Notes and Lore'}</h2>
            </div>
            <button type="button" onClick={onClose}>Close</button>
          </div>

          <div className="game-info-tabs" role="tablist" aria-label="Rules and lore sections">
            <button type="button" className={tab === 'rules' ? 'active' : ''} onClick={() => setTab('rules')}>Rules</button>
            <button type="button" className={tab === 'field' ? 'active' : ''} onClick={() => setTab('field')}>Field Notes</button>
          </div>

          {tab === 'rules' ? (
            <div className="rules-copy">
              <RuleBlock title="Premise">
                <p>One hidden Hacker is trying to compromise the system while the Security Engineers race to finish the project. The public board is built around five security lanes: Credentials, Social, Web, Network, and Physical. A lane is either open or defended.</p>
              </RuleBlock>

              <RuleBlock title="Players and Roles">
                <RulesList>
                  <p><strong>4 to 5 players</strong> are required. One player is secretly assigned as the Hacker. Everyone else is a Security Engineer.</p>
                  <p><strong>Security Engineers</strong> win by completing the project or correctly voting out the Hacker. Engineers always draw from the Security deck.</p>
                  <p><strong>The Hacker</strong> wins by reducing System Integrity to zero. At the start of each turn after the first, the Hacker secretly draws 2 cards in any combination from the Security and Hacker decks, then discards 1 card for cover and planning.</p>
                </RulesList>
              </RuleBlock>

              <RuleBlock title="Turn Structure">
                <RulesList>
                  <p>Each active player has one task and a private hand. Each turn, players discuss, then each player secretly submits <strong>one card</strong> or passes.</p>
                  <p>When everyone has submitted, the System resolves emergency responses first, then hostile operations, defences, investigations, and tasks.</p>
                  <p>Hands are private. Players may claim, bluff, promise, and accuse, but they should not reveal screenshots or prove the exact contents of their hand.</p>
                </RulesList>
              </RuleBlock>

              <RuleBlock title="Lanes, Defences, and Tasks">
                <RulesList>
                  <p>There are five lanes: <strong>Credentials</strong>, <strong>Social</strong>, <strong>Web</strong>, <strong>Network</strong>, and <strong>Physical</strong>.</p>
                  <p>Only three lanes can be defended at once. Defences are face-up and persist until replaced or sabotaged. They do not deplete when they block an attack.</p>
                  <p>Tasks also belong to lanes. A task gives +1 project progress, or +2 if its lane is currently defended.</p>
                </RulesList>
              </RuleBlock>

              <RuleBlock title="Attacks, Evidence, and Logs">
                <RulesList>
                  <p>Attacks target lanes. If the lane is open, most attacks remove 1 Integrity. DDoS instead cancels project progress for that turn. Zero-Day is a rare late-game attack that cannot be blocked.</p>
                  <p>When a defence blocks an attack, the team gains 1 Evidence. Check Server Log lets a player privately check whether another player's submitted card this turn was hostile.</p>
                  <p>Rapid Incident Response blocks one attack during the current turn only. It is discarded after use and never lingers into later turns.</p>
                </RulesList>
              </RuleBlock>

              <RuleBlock title="Voting and Win Conditions">
                <RulesList>
                  <p>Security Engineers may call the formal vote from cycle 3 onward. The Hacker may vote, but only engineer votes count when deciding who is removed.</p>
                  <p>If the engineers remove the Hacker, they win. If they remove the wrong player, that player becomes a spectator and the formal vote is spent.</p>
                  <p>The Hacker wins if Integrity reaches zero. The engineers win if the project reaches its required progress first.</p>
                </RulesList>
              </RuleBlock>
            </div>
          ) : (
            <div className="rules-copy field-notes-copy">
              <RuleBlock title="Why Tasks Matter">
                <p>QuantumNova is trying to finish a practical quantum computer and connect it to an AI-powered defence system. Once that work is finished, the insider has missed their best chance. Every completed task is a step toward that safer future.</p>
              </RuleBlock>

              <RuleBlock title="Why Lanes Are Visible">
                <p>Security is not just a pile of hidden shields. Teams need to understand which areas are protected and which areas are exposed. The visible lane board turns that idea into a readable game state: the Hacker sees where the openings are, but the engineers see those openings too.</p>
              </RuleBlock>

              <RuleBlock title="Why Defences Persist">
                <p>Two-factor authentication, input sanitisation, employee awareness, traffic filtering, and physical security do not vanish just because they stop one incident. They stay in place until the team replaces them or an insider disables them.</p>
              </RuleBlock>

              <RuleBlock title="The Zero-Day Attack">
                <p>The Zero-Day Attack represents a flaw nobody planned around. It is rare, late-game, and unblockable because it reminds players that no system is perfect. Security is a constant race between defenders improving their posture and attackers finding new gaps.</p>
              </RuleBlock>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function winnerTitle(winner) {
  if (winner === 'engineers') return 'Security Engineers Win';
  if (winner === 'hacker') return 'Hacker Wins';
  return 'Session Complete';
}

function FinalResultsPanel({ gameState, logs }) {
  const system = gameState?.system ?? {};
  const winner = winnerTitle(gameState?.winner);
  const reason = gameState?.endReason || 'The win condition was reached.';
  const tasksCompleted = system.numTasksCompleted ?? Math.max(0, (system.numTasksRequired ?? 0) - (system.numTasksRemaining ?? 0));
  const tasksRequired = system.numTasksRequired ?? '?';
  const eliminated = (gameState?.players ?? []).filter((player) => player.isEliminated).map((player) => player.name);

  return (
    <section className="game-panel final-results-panel">
      <div className="panel-heading">
        <span>// final results</span>
        <strong>{winner}</strong>
      </div>

      <div className="final-results-grid">
        <div><span>outcome</span><strong>{winner}</strong></div>
        <div><span>reason</span><strong>{reason}</strong></div>
        <div><span>tasks</span><strong>{tasksCompleted}/{tasksRequired}</strong></div>
        <div><span>integrity</span><strong>{system.integrityPoints ?? '?'}</strong></div>
        <div><span>eliminated</span><strong>{eliminated.length ? eliminated.join(', ') : 'None'}</strong></div>
        <div><span>log entries</span><strong>{logs.length}</strong></div>
      </div>
    </section>
  );
}

function GameOverModal({ open, gameState, logs, onLobby, onClose }) {
  const system = gameState?.system ?? {};
  const title = winnerTitle(gameState?.winner);
  const reason = gameState?.endReason || 'The win condition was reached.';
  const tasksCompleted = system.numTasksCompleted ?? Math.max(0, (system.numTasksRequired ?? 0) - (system.numTasksRemaining ?? 0));
  const tasksRequired = system.numTasksRequired ?? '?';

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal center game-over-modal">
        <span className="header-eyebrow">simulation complete</span>
        <h1>{title}</h1>
        <p>{reason}</p>

        <div className="game-over-stats">
          <div><span>tasks completed</span><strong>{tasksCompleted}/{tasksRequired}</strong></div>
          <div><span>integrity</span><strong>{system.integrityPoints ?? '?'}</strong></div>
          <div><span>visible report entries</span><strong>{logs.length}</strong></div>
        </div>

        <div className="game-over-actions">
          <button type="button" onClick={onLobby}>Return to Room</button>
          <button type="button" onClick={onClose}>Review Board</button>
        </div>
      </div>
    </Modal>
  );
}

export const Game = ({ socket, name, room, setRoom }) => {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const activeRoom = roomCode || room;

  const [gameState, setGameState] = useState(null);
  const [stagedIds, setStagedIds] = useState([]);
  const [cardTargets, setCardTargets] = useState({});
  const [discardIds, setDiscardIds] = useState([]);
  const [newDrawCardIds, setNewDrawCardIds] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [logs, setReports] = useState([]);
  const [logOpen, setLogOpen] = useState(false);
  const [voteOpen, setVoteOpen] = useState(false);
  const [previewCard, setPreviewCard] = useState(null);
  const [gameOverOpen, setGameOverOpen] = useState(false);
  const [incidentReportPages, setIncidentReportPages] = useState([]);
  const [incidentReportOpen, setIncidentReportOpen] = useState(false);
  const [incidentReportIndex, setIncidentReportIndex] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);
  const [affordanceWarning, setAffordanceWarning] = useState('');

  const previousHandIdsRef = useRef(null);
  const drawTimerRef = useRef(null);
  const affordanceTimerRef = useRef(null);
  const delayGameOverRef = useRef(false);
  const pendingGameOverRef = useRef(null);

  const you = useMemo(
    () => gameState?.players?.find((p) => p.name === name) ?? null,
    [gameState, name]
  );

  const hand = you?.cards ?? [];
  const task = you?.task ?? null;
  const selectableCards = useMemo(
    () => [...hand, ...(task ? [{ ...task, fromTaskSlot: true }] : [])],
    [hand, task]
  );

  const mustDiscard = Boolean(you?.mustDiscard);
  const discardCount = you?.discardCount ?? 0;
  const isEngineer = you?.role === "SecEng" || you?.role === "SecurityEngineer";
  const isSpectator = Boolean(you?.isEliminated) || you?.role === "Spectator";
  const isEnded = gameState?.phase === "ended" || Boolean(gameState?.winner);
  const hasSubmitted = Boolean(you?.submittedThisTurn);
  const submittedCards = you?.submittedCardsThisTurn ?? [];
  const canAct = Boolean(you) && !isEnded && !isSpectator && gameState?.phase === "playing" && !hasSubmitted && !you?.awaitingDrawChoice;

  useEffect(() => {
    if (isEnded) setGameOverOpen(true);
  }, [isEnded]);

  const stagedCards = stagedIds
    .map((cardId) => selectableCards.find((card) => card.id === cardId) || submittedCards.find((card) => card.id === cardId))
    .filter(Boolean);
  const visibleQueueCards = hasSubmitted && submittedCards.length > 0 ? submittedCards : stagedCards;
  const system = gameState?.system ?? {};
  const tasksCompleted = system.numTasksCompleted ?? Math.max(0, (system.numTasksRequired ?? 0) - (system.numTasksRemaining ?? 0));
  const tasksRequired = system.numTasksRequired ?? "?";
  const taskLeaderboard = gameState?.taskLeaderboard ?? gameState?.players?.map((player) => ({
    name: player.name,
    tasksCompleted: player.tasksCompleted ?? 0,
  })) ?? [];

  useEffect(() => {
    if (!socket || !name) {
      navigate("/");
      return undefined;
    }

    if (activeRoom && room !== activeRoom) setRoom(activeRoom);

    socket.emit("request-game-state", {
      room: activeRoom,
      playerName: name,
      participantToken: localStorage.getItem("participantToken") || "",
    });

    const onGameState = (state) => {
      setGameState(state);
      setError("");

      const me = state.players?.find((p) => p.name === name);
      const handIds = (me?.cards ?? []).map((card) => card.id);
      const previousHandIds = previousHandIdsRef.current;
      const drawnIds = previousHandIds === null
        ? handIds
        : handIds.filter((id) => !previousHandIds.includes(id));

      previousHandIdsRef.current = handIds;

      if (drawnIds.length > 0) {
        setNewDrawCardIds(drawnIds);
        if (drawTimerRef.current) window.clearTimeout(drawTimerRef.current);
        drawTimerRef.current = window.setTimeout(() => setNewDrawCardIds([]), 1400);
      }

      const validCards = [
        ...(me?.cards ?? []),
        ...(me?.task ? [me.task] : []),
      ];

      if (!me?.submittedThisTurn) {
        setStagedIds((current) => current.filter((id) => validCards.some((card) => card.id === id)));
      }
      setDiscardIds((current) => current.filter((id) => (me?.cards ?? []).some((card) => card.id === id)));
    };

    const onSubmitAck = ({ mustDiscard: needsDiscard, discardCount: count }) => {
      setStatus(
        needsDiscard
          ? `Queue submitted. Discard ${count} card${count === 1 ? "" : "s"}.`
          : "Queue submitted. Waiting for the rest of the table."
      );
    };

    const onDiscardAck = () => {
      setStatus("Discard confirmed. Waiting for the rest of the table.");
      setDiscardIds([]);
    };

    const onHackerDrawAck = ({ discardCount: count }) => {
      setStatus(`Draw complete. Discard ${count} card${count === 1 ? "" : "s"}, then submit your operation.`);
    };

    const onTurnResolved = (summary) => {
      setReports((current) => [
        ...current,
        `Cycle ${summary.turnNumber} resolved.`,
        ...(summary.log ?? []).map(formatLogEntry),
      ]);

      setStagedIds([]);
      setCardTargets({});

      const reportPages = summary.incidentReport || [];
      const hasArrestSequence = reportPages.some((page) => page?.hackerArrested);
      delayGameOverRef.current = Boolean(summary.win && hasArrestSequence && reportPages.length > 0);

      if (reportPages.length > 0) {
        setIncidentReportPages(reportPages);
        setIncidentReportIndex(0);
        setIncidentReportOpen(true);
      }

      setStatus(hasArrestSequence ? "Hacker arrest sequence triggered. Review the incident report." : "Cycle resolved. Review the incident report.");
    };

    const onGameError = (message) => {
      setError(message || "Something went wrong.");
    };

    const onReconResult = (result) => {
      if (!result?.lanes) {
        setReports((current) => [...current, "Recon result: no lane posture available."]);
        return;
      }

      const openLanes = result.lanes
        .filter((lane) => !lane.defended)
        .map((lane) => lane.label)
        .join(", ") || "none";
      setReports((current) => [...current, `Recon result: open lanes are ${openLanes}.`]);
    };

    const onServerLogResult = (result) => {
      if (!result?.checked) {
        setReports((current) => [...current, "Private server log result: no valid target was checked."]);
        return;
      }

      setReports((current) => [
        ...current,
        `Private server log result: ${result.targetName} submitted a ${result.hostile ? "hostile" : "non-hostile"} card this cycle.`,
      ]);
    };

    const onTaskReplaced = (result) => {
      setStatus(result?.ok ? "Task replaced." : result?.error || "Could not replace task.");
    };

    const onVoteStarted = () => {
      setVoteOpen(true);
      setStatus("Vote started.");
    };

    const onVoteCast = ({ voterName }) => {
      setStatus(`${voterName} has voted.`);
    };

    const onVoteResolved = ({ outcome, eliminated }) => {
      setVoteOpen(false);
      setStatus(
        eliminated
          ? `${eliminated} eliminated. Outcome: ${outcome}.`
          : `Vote outcome: ${outcome}.`
      );

      socket.emit("request-game-state", {
        room: activeRoom,
        playerName: name,
        participantToken: localStorage.getItem("participantToken") || "",
      });
    };

    const onGameOver = (win) => {
      setStatus(win?.reason || "Game over.");

      if (delayGameOverRef.current) {
        pendingGameOverRef.current = win || { reason: "Game over." };
        return;
      }

      socket.emit("request-game-state", {
        room: activeRoom,
        playerName: name,
        participantToken: localStorage.getItem("participantToken") || "",
      });
    };

    socket.on("game-state", onGameState);
    socket.on("submit-ack", onSubmitAck);
    socket.on("discard-ack", onDiscardAck);
    socket.on("hacker-draw-ack", onHackerDrawAck);
    socket.on("turn-resolved", onTurnResolved);
    socket.on("game-error", onGameError);
    socket.on("recon-result", onReconResult);
    socket.on("server-log-result", onServerLogResult);
    socket.on("task-replaced", onTaskReplaced);
    socket.on("vote-started", onVoteStarted);
    socket.on("vote-cast", onVoteCast);
    socket.on("vote-resolved", onVoteResolved);
    const onReturnedToLobby = (returnedRoom) => {
      navigate(`/lobby/${returnedRoom || activeRoom}`);
    };

    socket.on("game-over", onGameOver);
    socket.on("returned-to-lobby", onReturnedToLobby);

    return () => {
      if (drawTimerRef.current) window.clearTimeout(drawTimerRef.current);
      if (affordanceTimerRef.current) window.clearTimeout(affordanceTimerRef.current);
      socket.off("game-state", onGameState);
      socket.off("submit-ack", onSubmitAck);
      socket.off("discard-ack", onDiscardAck);
      socket.off("hacker-draw-ack", onHackerDrawAck);
      socket.off("turn-resolved", onTurnResolved);
      socket.off("game-error", onGameError);
      socket.off("recon-result", onReconResult);
      socket.off("server-log-result", onServerLogResult);
      socket.off("task-replaced", onTaskReplaced);
      socket.off("vote-started", onVoteStarted);
      socket.off("vote-cast", onVoteCast);
      socket.off("vote-resolved", onVoteResolved);
      socket.off("game-over", onGameOver);
      socket.off("returned-to-lobby", onReturnedToLobby);
    };
  }, [socket, name, room, setRoom, activeRoom, navigate]);

  const requestRefresh = () => {
    socket.emit("request-game-state", {
      room: activeRoom,
      playerName: name,
      participantToken: localStorage.getItem("participantToken") || "",
    });
  };


  const chooseHackerDraw = ({ security, hacker }) => {
    socket.emit("choose-hacker-draw", { room: activeRoom, playerName: name, security, hacker });
  };

  const leaveGame = () => {
    socket.emit("leave-room", activeRoom, name);
    navigate("/");
  };

  const showAffordanceWarning = (message) => {
    if (!message) return;
    setAffordanceWarning(message);
    if (affordanceTimerRef.current) window.clearTimeout(affordanceTimerRef.current);
    affordanceTimerRef.current = window.setTimeout(() => setAffordanceWarning(''), 1800);
  };

  const stageCard = (cardId) => {
    if (!canAct || mustDiscard || !cardId) return;

    if (stagedIds.includes(cardId)) {
      removeStagedCard(cardId);
      return;
    }

    const card = selectableCards.find((candidate) => candidate.id === cardId);
    if (!card) return;

    if (!canAffordCard(you, card)) {
      showAffordanceWarning(affordabilityMessage(you, card));
      return;
    }

    if (stagedIds.length >= 1) {
      setError("Core mode allows one card per turn.");
      return;
    }

    setStagedIds((current) => [...current, cardId]);
    setError("");
  };

  const removeStagedCard = (cardId) => {
    setStagedIds((current) => current.filter((id) => id !== cardId));
    setCardTargets((current) => {
      const next = { ...current };
      delete next[cardId];
      return next;
    });
  };

  const toggleDiscard = (cardId) => {
    if (!mustDiscard) return;

    setDiscardIds((current) =>
      current.includes(cardId)
        ? current.filter((id) => id !== cardId)
        : current.length < discardCount
          ? [...current, cardId]
          : current
    );
  };

  const submitCards = () => {
    if (!canAct) return;

    socket.emit("submit-cards", {
      room: activeRoom,
      playerName: name,
      cardIds: stagedIds,
      cardOptions: cardTargets,
    });
  };

  const submitDiscard = () => {
    if (discardIds.length !== discardCount) {
      setError(`Select exactly ${discardCount} card${discardCount === 1 ? "" : "s"} to discard.`);
      return;
    }

    socket.emit("discard-cards", {
      room: activeRoom,
      playerName: name,
      cardIds: discardIds,
    });
  };

  const replaceTask = () => {
    if (!canAct || you?.replacedTaskThisTurn) return;

    socket.emit("replace-task", {
      room: activeRoom,
      playerName: name,
      participantToken: localStorage.getItem("participantToken") || "",
    });
  };

  const callVote = () => {
    socket.emit("call-vote", { room: activeRoom, playerName: name });
  };

  const castVote = (accusedName) => {
    socket.emit("cast-vote", {
      room: activeRoom,
      voterName: name,
      accusedName,
    });
  };

  const closeIncidentReport = () => {
    setIncidentReportOpen(false);

    if (pendingGameOverRef.current) {
      const pendingWin = pendingGameOverRef.current;
      pendingGameOverRef.current = null;
      delayGameOverRef.current = false;
      setStatus(pendingWin?.reason || "Game over.");
      socket.emit("request-game-state", {
        room: activeRoom,
        playerName: name,
        participantToken: localStorage.getItem("participantToken") || "",
      });
    }
  };

  const returnToLobbyAfterGame = () => {
    socket.emit("return-to-lobby", { room: activeRoom, playerName: name });
    navigate(`/lobby/${activeRoom}`);
  };

  if (!gameState || !you) {
    return (
      <main className="game-page center">
        <div className="game-loading">
          <h1>Refreshhronising</h1>
          <p>Requesting private session state...</p>
          <button type="button" onClick={requestRefresh}>Retry</button>
        </div>
      </main>
    );
  }

  return (
    <main className="game-page">
      <header className="game-header">
        <div>
          <span className="header-eyebrow">live board</span>
          <h1>Room {activeRoom}</h1>
        </div>

        <div className="game-header-actions">
          <button type="button" onClick={() => setInfoOpen(true)}>Rules</button>
          <button type="button" onClick={() => setLogOpen(true)}>Reports</button>
          <button type="button" onClick={requestRefresh}>Refresh</button>
          <button type="button" className="red" onClick={leaveGame}>
            Exit
          </button>
        </div>
      </header>

      {affordanceWarning && (
        <div className="affordance-toast" role="status">
          {affordanceWarning}
        </div>
      )}

      {(error || status || isEnded || isSpectator) && (
        <section className={`game-banner ${error ? "error" : isEnded ? "ended" : ""}`}>
          {error || status || (isSpectator ? "You are spectating this session." : `${winnerTitle(gameState.winner)} recorded.`)}
        </section>
      )}

      {isEnded && <FinalResultsPanel gameState={gameState} logs={logs} />}

      <HackerDrawPanel you={you} onChoose={chooseHackerDraw} />

      <section className="game-dashboard">
        <div className="game-panel identity-panel">
          <div className="panel-heading">
            <span>// player</span>
            <strong>{displayRole(you.role)}</strong>
          </div>

          <h2>{you.name}</h2>

          <div className="skill-grid">
            <div className="skill-cell skill-time"><span>ROLE</span><strong>{displayRole(you.role)}</strong></div>
            <div className="skill-cell skill-comm"><span>EVIDENCE</span><strong>{system.evidence ?? 0}</strong></div>
            <div className="skill-cell skill-prog"><span>HAND</span><strong>{hand.length}/5</strong></div>
            {you.awaitingDrawChoice && (
              <div className="skill-cell skill-sep"><span>DRAW</span><strong>CHOOSE</strong></div>
            )}
          </div>
        </div>

        <div className="game-panel system-panel">
          <div className="panel-heading">
            <span>// system</span>
            <strong>{gameState.phase}</strong>
          </div>

          <div className="system-grid">
            <div><span>cycle</span><strong>{gameState.turnNumber}</strong></div>
            <div><span>integrity</span><strong>{system.integrityPoints ?? "?"}</strong></div>
            <div><span>tasks</span><strong>{tasksCompleted}/{tasksRequired}</strong></div>
            <div><span>evidence</span><strong>{system.evidence ?? 0}</strong></div>
          </div>

          <div className="zone-heading">Security Lanes</div>
          <LaneBoard lanes={system.lanes} onInspect={setPreviewCard} />

          <div className="zone-heading">Defence Slots</div>
          <DefenceZone slots={system.defenceSlots} onInspect={setPreviewCard} />
        </div>

        <div className="game-panel task-panel">
          <div className="panel-heading">
            <span>// task</span>
            <div className="panel-button-row">
              <button type="button" onClick={replaceTask} disabled={!canAct || you.replacedTaskThisTurn || stagedIds.includes(task?.id)}>
                Replace
              </button>
              <button type="button" onClick={() => task && stageCard(task.id)} disabled={!canAct || !task}>
                {stagedIds.includes(task?.id) ? "Unqueue Task" : "Queue Task"}
              </button>
            </div>
          </div>

          {task ? (
            <div className="task-card-row task-card-row-detailed">
              <CardTile
                card={task}
                onInspect={setPreviewCard}
                compact
                selected={stagedIds.includes(task.id)}
                draggable={canAct && !mustDiscard && !stagedIds.includes(task.id)}
                disabled={!canAct || mustDiscard}
                onClick={() => stageCard(task.id)}
                onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
              />
              <TaskDetails task={task} />
            </div>
          ) : (
            <TaskDetails task={null} />
          )}

          <TaskLeaderboard leaderboard={taskLeaderboard} />
        </div>
      </section>

      <section className="game-table">
        <section
          className={`game-panel drop-zone ${dragOver ? "drag-over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            if (canAct && !mustDiscard) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            stageCard(e.dataTransfer.getData("text/plain"));
          }}
        >
          <div className="panel-heading">
            <span>// system queue</span>
            <strong>{visibleQueueCards.length}/1</strong>
          </div>

          {visibleQueueCards.length === 0 ? (
            <div className="drop-placeholder">
              {hasSubmitted
                ? "Queue submitted."
                : mustDiscard
                  ? "Discard down to five cards."
                  : "Drag one card here, then submit — or pass."}
            </div>
          ) : (
            <div className="staged-cards">
              {visibleQueueCards.map((card) => (
                <button
                  key={card.id}
                  className={`staged-chip ${hasSubmitted ? "locked" : ""}`}
                  type="button"
                  disabled={hasSubmitted}
                  onClick={() => !hasSubmitted && removeStagedCard(card.id)}
                >
                  {card.name}{hasSubmitted ? " // queued" : " ×"}
                </button>
              ))}
            </div>
          )}

          {!hasSubmitted && stagedCards.some((card) => card.name === "Check Server Log") && (
            <div className="target-selector-row">
              <label htmlFor="log-target">Log target</label>
              <select
                id="log-target"
                value={cardTargets[stagedCards.find((card) => card.name === "Check Server Log")?.id]?.targetPlayerName || ""}
                onChange={(event) => {
                  const logCard = stagedCards.find((card) => card.name === "Check Server Log");
                  if (!logCard) return;
                  setCardTargets((current) => ({
                    ...current,
                    [logCard.id]: { targetPlayerName: event.target.value },
                  }));
                }}
              >
                <option value="">auto</option>
                {gameState.players
                  .filter((player) => player.name !== name && !player.isEliminated && !player.isSpectator)
                  .map((player) => <option key={player.name} value={player.name}>{player.name}</option>)}
              </select>
            </div>
          )}
        </section>

        <section className="game-panel players-panel">
          <div className="panel-heading">
            <span>// players</span>
            {isEngineer && !gameState.votingExpired && !isEnded && !isSpectator && (gameState.turnNumber >= (gameState.voteUnlockTurn ?? 3)) && (
              <button type="button" onClick={callVote}>Call Vote</button>
            )}
          </div>

          <div className="agent-list">
            {gameState.players.map((player) => (
              <div
                key={player.name}
                className={`agent-row ${player.name === name ? "self" : ""} ${player.isEliminated || player.isSpectator ? "eliminated" : ""}`}
              >
                <div className="agent-row-main">
                  <span>{player.name}</span>
                  <strong>
                    {player.isEliminated || player.isSpectator
                      ? "spectating"
                      : player.name === name
                        ? displayRole(player.role)
                        : `${player.handSize} cards`}
                    {player.submittedThisTurn && !player.isEliminated && !player.isSpectator ? " // locked" : ""}
                  </strong>
                </div>
                <PlayerSkillChips player={player} />
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="game-panel hand-panel">
        <div className="panel-heading">
          <span>{you?.awaitingDrawChoice ? "// choose draw" : mustDiscard ? `// discard ${discardCount}` : "// hand"}</span>

          <div className="hand-actions">
            <span className={`hand-count ${hand.length > 5 ? "over" : ""}`}>{hand.length}/5</span>
            {mustDiscard ? (
              <button type="button" onClick={submitDiscard}>Discard Selected</button>
            ) : (
              <button type="button" onClick={submitCards} disabled={!canAct}>
                {stagedIds.length === 0 ? "Pass Turn" : "Submit Card"}
              </button>
            )}
          </div>
        </div>

        <div className={`hand-capacity-shell ${hand.length > 5 ? "over-limit" : ""}`}>
          <div className="hand-slot-guide" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, index) => <span key={index} />)}
          </div>
          <div className="hand-strip">
            {hand.length === 0 ? (
            <p>No cards in hand.</p>
          ) : (
            hand.map((card) => {
              const selected = mustDiscard
                ? discardIds.includes(card.id)
                : stagedIds.includes(card.id);

              return (
                <CardTile
                  key={card.id}
                  card={card}
                  onInspect={setPreviewCard}
                  selected={selected}
                  animate={newDrawCardIds.includes(card.id)}
                  disabled={isEnded || isSpectator || (!mustDiscard && hasSubmitted)}
                  draggable={!mustDiscard && canAct}
                  onClick={() => (mustDiscard ? toggleDiscard(card.id) : stageCard(card.id))}
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", card.id)}
                />
              );
            })
            )}
          </div>
        </div>
      </section>

      <LogModal open={logOpen} onClose={() => setLogOpen(false)} logs={logs} />
      <GameInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
      <CardPreviewModal card={previewCard} onClose={() => setPreviewCard(null)} />
      <GameOverModal
        open={isEnded && gameOverOpen}
        gameState={gameState}
        logs={logs}
        onLobby={returnToLobbyAfterGame}
        onClose={() => setGameOverOpen(false)}
      />

      <IncidentReportModal
        open={incidentReportOpen}
        pages={incidentReportPages}
        index={incidentReportIndex}
        setIndex={setIncidentReportIndex}
        onClose={closeIncidentReport}
      />

      <VoteModal
        open={voteOpen}
        onClose={() => setVoteOpen(false)}
        players={gameState.players}
        name={name}
        onVote={castVote}
      />
    </main>
  );
};
