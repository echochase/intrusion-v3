import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Modal } from "@mui/material";
import { GameInfoModal } from "../components/GameInfoModal";
import { cardTextFor, enrichCardText } from "../data/cardText";
import "../styles/game.css";

const cardModules = import.meta.glob(
  "/src/assets/{attack-cards,defence-cards,task-cards}/*.{png,jpg,jpeg,webp}",
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
  "Rapid Incident Response",
  "Forensic Analysis",
  "Check Server Log",
  "Reconnaissance",
  "False Flag",
  "Two-Factor Authentication",
  "Anti-DDoS Defence",
  "Employee Awareness",
  "Security Detail",
  "Input Sanitisation",
  "Phishing",
  "Physical Data Theft",
  "Hazard Report",
  "Corporate Announcement",
  "Server Maintenance",
  "Company Meeting",
  "Model Training",
  "Responsible Engineer",
  "Company Mixer Event",
  "Insider Sabotage",
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

  const aliases = {
    reflectedxss: "xssattack",
    storedxss: "xssattack",
    forensicanalysis: "forensicanalysis",
  };
  if (aliases[compact] && compactCardImageMap[aliases[compact]]) {
    return compactCardImageMap[aliases[compact]];
  }

  const fuzzy = cardImageEntries.find((entry) =>
    entry.compact.includes(compact) || compact.includes(entry.compact)
  );

  return fuzzy?.src ?? null;
}



function isTaskLaneDefended(system, card) {
  if (!card || card.type !== 'task') return true;
  return (system?.lanes || []).some((lane) => lane.lane === card.lane && lane.status === 'defended');
}

function taskDomainLabel(cardOrLane) {
  const lane = typeof cardOrLane === 'string' ? cardOrLane : cardOrLane?.lane;
  if (lane === 'credentials') return 'Credential';
  if (lane === 'social') return 'Social';
  if (lane === 'web') return 'Web';
  if (lane === 'network') return 'Network';
  if (lane === 'physical') return 'Physical';
  return cardOrLane?.laneLabel || 'Matching';
}

function laneRequirementMessage(card) {
  if (!card || card.type !== 'task') return '';
  return `The ${card.laneLabel || 'matching'} Lane is undefended. ${card.name} cannot be completed yet.`;
}

function submissionKind(card) {
  if (!card) return 'security';
  if (card.submissionKind) return card.submissionKind;
  if (card.hackerOnly || card.type === 'attack' || card.sourceDeck === 'hacker') return 'hacker';
  return 'security';
}

function usesPlayerTarget(card) {
  return Boolean(card && (card.name === 'Check Server Log' || card.name === 'False Flag'));
}

function playerTargetLabel(card) {
  if (card?.name === 'False Flag') return 'Frame target';
  return 'Log target';
}

function maxSubmitCardsFor(player) {
  return player?.role === 'Hacker' ? 2 : 1;
}

function submissionRuleMessage(player, existingCards, nextCard) {
  const maxCards = maxSubmitCardsFor(player);
  if ((existingCards?.length || 0) >= maxCards) {
    return player?.role === 'Hacker'
      ? 'The Hacker can queue up to 2 cards: at most 1 Hacker card and 1 Security card.'
      : 'Security Engineers can queue 1 card per turn.';
  }

  if (player?.role === 'Hacker') {
    const nextKind = submissionKind(nextCard);
    if ((existingCards || []).some((card) => submissionKind(card) === nextKind)) {
      return nextKind === 'hacker'
        ? 'The Hacker can only queue 1 Hacker card this turn.'
        : 'The Hacker can only queue 1 Security card this turn.';
    }
  }

  return '';
}

function stateRequirementMessage(system, card, { player = null, turnNumber = null } = {}) {
  if (!card) return '';
  if (player?.role === 'Hacker' && Number(turnNumber) <= 1 && card.type === 'attack') {
    return 'The Hacker cannot submit attack cards on the first cycle.';
  }
  if (card.name === 'Check Server Log' && (system?.evidence || 0) < 1) {
    return 'Check Server Log costs 1 Evidence. The team has no Evidence yet.';
  }
  return '';
}

function CardCostChips({ card }) {
  if (!card) return null;

  const chips = [];
  if (card.type && card.type !== 'task') chips.push(card.type);
  if (card.name === 'Insider Sabotage' || card.category === 'Sabotage') {
    chips.push('Defence Slot');
  } else if (card.laneLabel) {
    chips.push(card.type === 'task' ? taskDomainLabel(card) : `${card.laneLabel} Lane`);
  }

  if (chips.length === 0) return null;

  return chips.map((chip) => (
    <span key={chip} className="cost-chip cost-free">{chip}</span>
  ));
}

function cleanEffectText(value = '') {
  return String(value).replace(/^Effect:\s*/i, '').trim();
}

function cardDescription(card) {
  const fallback = cardTextFor(card?.name);
  return (card?.description || fallback.description || '').trim();
}

function cardEffect(card) {
  const fallback = cardTextFor(card?.name);
  return cleanEffectText(card?.effectDescription || fallback.effectDescription || '');
}

function effectText(card) {
  const description = cardDescription(card);
  const effect = cardEffect(card);
  const lines = [];

  if (description) lines.push(description);
  if (effect && effect !== description) lines.push(`Effect: ${effect}`);

  return lines.join('\n') || 'No extra effect text.';
}

function hoverCardName(card) {
  if (!card?.name) return 'Card';

  const compact = compactName(card.name);
  const hoverAliases = {
    reconnaissance: 'recon',
    twofactorauthentication: 'two-factor auth',
  };

  return hoverAliases[compact] || card.name;
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
  showDetails = true,
}) {
  const src = imageFor(card);
  const holdTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);
  const [holding, setHolding] = useState(false);
  const hoverLabel = hoverCardName(card);

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
      title={showDetails ? `${hoverLabel} — click and hold for details` : undefined}
    >
      {src ? (
        <img src={src} alt={card.name} className="play-card-image" draggable={false} />
      ) : (
        <div className="play-card-fallback">
          <span>{card?.type || "card"}</span>
          <strong>{card?.name}</strong>
        </div>
      )}

      {showDetails && (
        <div className="play-card-details">
          <strong>{hoverLabel}</strong>
          <div className="cost-chip-row">
            <CardCostChips card={card} />
            {card?.deployTime > 0 && (
              <span className="cost-chip cost-delay">{card.deployTime} turn pending</span>
            )}
          </div>
          <span className="play-card-inspect-hint">Click and hold for more details.</span>
        </div>
      )}

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


function PlayerProgressChips({ player }) {
  return (
    <div className="agent-skills" aria-label={`${player.name} progress`}>
      <span className="agent-skill-chip skill-prog">TASK {player.tasksCompleted ?? 0}</span>
    </div>
  );
}

function mobileDefenceName(name = "") {
  const compact = compactName(name);
  const aliases = {
    antiddosdefence: "Anti-DDoS",
    twofactorauthentication: "2FA",
    employeeawareness: "Awareness",
    inputsanitisation: "Input Sanit.",
    securitydetail: "Security",
    rapidincidentresponse: "Rapid IR",
    checkserverlog: "Server Log",
    forensicanalysis: "Forensics",
    insidersabotage: "Sabotage",
  };
  return aliases[compact] || name;
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
            <button
              key={slot.card.id ?? index}
              type="button"
              className="defence-slot revealed text-only"
              onClick={() => onInspect?.(slot.card)}
            >
              <span className="defence-slot-label">{slot.card.name === 'Insider Sabotage' || slot.card.category === 'Sabotage' ? 'SABOTAGED' : 'DEFENDED'}</span>
              <strong><span className="defence-name-full">{slot.card.name}</span><span className="defence-name-mobile">{mobileDefenceName(slot.card.name)}</span></strong>
            </button>
          );
        }

        if (slot.state === "hidden") {
          return (
            <div key={`hidden-${index}`} className="defence-slot hidden-card text-only">
              <span className="defence-slot-label">DEFENCE</span>
              <strong><span className="defence-name-full">Face Down</span><span className="defence-name-mobile">Hidden</span></strong>
            </div>
          );
        }

        return (
          <div key={`empty-${index}`} className="defence-slot empty text-only">
            <span className="defence-slot-label">OPEN</span>
            <strong><span className="defence-name-full">Empty Slot</span><span className="defence-name-mobile">Empty</span></strong>
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
          className={`lane-row ${lane.status === 'defended' ? 'defended' : 'open'} ${lane.ddosActive ? 'ddos-active' : ''}`}
          data-lane-name={lane.label}
          data-lane-status={lane.ddosActive ? 'UNDER ATTACK' : lane.status === 'defended' ? 'DEFENDED' : 'OPEN'}
          onClick={() => lane.defence && onInspect?.(lane.defence)}
        >
          <span className="lane-initial" aria-hidden="true">{(lane.label || '?').charAt(0)}</span>
          <span className="lane-name">{lane.label}</span>
          <strong>{lane.ddosActive ? 'UNDER ATTACK' : lane.status === 'defended' ? 'DEFENDED' : 'OPEN'}</strong>
          <small>{lane.defence?.name || lane.expectedDefence}</small>
        </button>
      ))}
    </div>
  );
}

function HackerDrawPanel({ you, onChoose }) {
  if (!you?.awaitingDrawChoice) return null;

  return (
    <div className="hacker-draw-panel embedded-draw-menu">
      <div className="panel-heading compact-heading">
        <span>// private draw</span>
      </div>
      <div className="hacker-draw-options compact-draw-options">
        <button type="button" onClick={() => onChoose({ security: 2, hacker: 0 })}>2 Security</button>
        <button type="button" onClick={() => onChoose({ security: 1, hacker: 1 })}>1 Each</button>
        <button type="button" onClick={() => onChoose({ security: 0, hacker: 2 })}>2 Hacker</button>
      </div>
    </div>
  );
}



function displayRole(role) {
  if (role === "SecEng") return "Security Engineer";
  return role || "Unknown";
}

function displayRoleCompact(role) {
  if (role === "SecEng" || role === "SecurityEngineer") return "SecEng";
  return role || "Unknown";
}

function formatLogEntry(entry) {
  if (typeof entry === 'string') return entry;
  if (entry?.publicMessage) return entry.publicMessage;

  const name = entry?.name || "Unknown";
  const description = entry?.description || "resolved";
  return `${entry?.type || "card"}: ${name} (${description})`;
}


function IntroBriefingModal({ open, role, onClose, onSkipIntro }) {
  const [page, setPage] = useState(0);
  const isHacker = role === 'Hacker';

  useEffect(() => {
    if (open) setPage(0);
  }, [open]);

  const pages = [
    {
      eyebrow: 'incoming briefing',
      title: 'QuantumNova is close',
      body: (
        <>
          <p>QuantumNova is a small, underfunded tech firm trying to prove that practical quantum computing is finally within reach. Their team is tiny, inexperienced, and stretched thin, but one successful demonstration could change everything.</p>
          <p>The company plans to connect its quantum system to an AI cyber-defence model and show investors a platform that can anticipate attacks before they fully emerge. But someone inside the company wants QuantumNova to fail.</p>
        </>
      ),
    },
    {
      eyebrow: 'hacker objective',
      title: 'Hacker',
      body: (
        <>
          <p>Infiltrate the system's defences and wreak havoc without exposing your identity.</p>
          <p>Hackers cannot play attack cards during the first turn. Your goal is to reduce System Integrity to zero before QuantumNova finishes its defence system.</p>
        </>
      ),
    },
    {
      eyebrow: 'security objective',
      title: 'Security Engineer',
      body: (
        <>
          <p>Work together to defend QuantumNova's system against incoming attacks. But not everyone at the table is trustworthy.</p>
          <p>Win by voting out the Hacker, or by completing enough project progress to deploy the quantum computer security system: 12 progress in a 4-player game, or 15 in a 5-player game.</p>
          <p>Do this before System Integrity reaches zero.</p>
        </>
      ),
    },
    {
      eyebrow: 'identity confirmed',
      title: isHacker ? 'You are the Hacker' : 'You are a Security Engineer',
      body: isHacker ? (
        <>
          <p>You are a disgruntled QuantumNova employee with enough trust to move around the company, but not enough clearance to access what matters directly.</p>
          <p>Sabotage the launch, damage System Integrity, and make sure QuantumNova never gets to deploy its quantum AI defence.</p>
        </>
      ) : (
        <>
          <p>You are part of QuantumNova's small development team, doubling as security because there is no one else to do it.</p>
          <p>Defend the right lanes, complete the project, and identify the insider before they bring the company down.</p>
        </>
      ),
    },
  ];

  const current = pages[page];
  const lastPage = page >= pages.length - 1;

  return (
    <Modal open={open}>
      <div className="intro-briefing-shell">
        <div className={`intro-briefing-panel ${isHacker && lastPage ? 'hacker-identity' : 'seceng-identity'}`}>
          <div className="intro-briefing-header">
            <span className="header-eyebrow">{current.eyebrow}</span>
            <strong>{page + 1}/{pages.length}</strong>
          </div>

          <div className="intro-briefing-copy">
            <h1>{current.title}</h1>
            {current.body}
          </div>

          <div className="intro-briefing-dots" aria-label="Briefing progress">
            {pages.map((_, index) => (
              <span key={index} className={index === page ? 'active' : ''} />
            ))}
          </div>

          <div className="intro-briefing-actions">
            <button type="button" className="intro-skip-button" onClick={onSkipIntro}>Skip intro</button>
            <div className={`intro-briefing-nav-actions ${page === 0 ? 'single-action' : 'paired-actions'}`}>
              {page > 0 && <button type="button" onClick={() => setPage((value) => Math.max(0, value - 1))}>Back</button>}
              <button type="button" onClick={() => (lastPage ? onClose() : setPage((value) => value + 1))}>
                {lastPage ? 'Enter Simulation' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function VoteModal({ open, onClose, players, name, onVote }) {
  const [pendingTarget, setPendingTarget] = useState(null);
  const activeTargets = players.filter((p) => p.name !== name && !p.isEliminated && !p.isSpectator);

  useEffect(() => {
    if (!open) setPendingTarget(null);
  }, [open]);

  const chooseTarget = (targetName) => {
    if (pendingTarget === targetName) {
      onVote(targetName);
      setPendingTarget(null);
      onClose?.();
      return;
    }
    setPendingTarget(targetName);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal center vote-modal">
        <h2>Accuse Player</h2>
        <p>Select once to mark your choice. Select the same player again to confirm.</p>

        <div className="vote-grid">
          {activeTargets.map((player) => (
            <button
              key={player.name}
              type="button"
              className={pendingTarget === player.name ? 'confirming' : ''}
              onClick={() => chooseTarget(player.name)}
            >
              {pendingTarget === player.name ? `Sure? ${player.name}` : player.name}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function VoteProposalModal({ proposal, open, onRespond }) {
  if (!proposal) return null;
  const hasResponded = Boolean(proposal.hasResponded);

  return (
    <Modal open={open}>
      <div className="modal center vote-modal vote-proposal-modal">
        <h2>Vote Proposal</h2>
        <p><strong>{proposal.callerName}</strong> wants to call the hacker vote.</p>
        <p>This is the team's only formal vote. Proceed only if the table is ready.</p>
        <div className="vote-proposal-count">
          <span>ready to vote</span>
          <strong>{proposal.approvalCount}/{proposal.threshold}</strong>
        </div>
        {hasResponded ? (
          <p className="vote-response-note">You chose to {proposal.yourResponse === 'proceed' ? 'proceed' : 'delay'}. Waiting for the table.</p>
        ) : (
          <div className="vote-proposal-actions">
            <button type="button" onClick={() => onRespond(true)}>Proceed</button>
            <button type="button" onClick={() => onRespond(false)}>Delay Vote</button>
          </div>
        )}
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
  const displayCard = enrichCardText(card);
  const src = imageFor(displayCard);

  return (
    <Modal open={Boolean(card)} onClose={onClose}>
      <div className="card-preview-shell" onClick={onClose}>
        <div className="card-preview-panel" onClick={(event) => event.stopPropagation()}>
          <div className="card-preview-art">
            {src ? (
              <img src={src} alt={displayCard?.name} draggable={false} />
            ) : (
              <div className="play-card-fallback">
                <span>{displayCard?.type || 'card'}</span>
                <strong>{displayCard?.name}</strong>
              </div>
            )}
          </div>

          <div className="card-preview-copy">
            <span>{displayCard?.type}</span>
            <h2>{displayCard?.name}</h2>
            <p>{effectText(displayCard)}</p>
            <div className="cost-chip-row">
              <CardCostChips card={displayCard} />
              {displayCard?.deployTime > 0 && (
                <span className="cost-chip cost-delay">{displayCard.deployTime} turn pending</span>
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
  if (text.includes('side effect')) chips.push('SIDE EFFECT');
  if (text.includes('trigger')) chips.push('TRIGGER');
  return chips;
}

function withoutConditionPrefix(line = '') {
  const cleaned = String(line).replace(/^Condition:\s*/i, '').trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : cleaned;
}

function taskDisplayDescription(task) {
  const libraryText = cardTextFor(task?.name);
  const source = libraryText.description || task?.description || 'No task description.';
  const lines = splitLines(source).map(withoutConditionPrefix);
  return lines.find((line) => !/^to complete this card/i.test(line)) || lines[0] || 'No task description.';
}

function taskRequirementLines(task) {
  const libraryText = cardTextFor(task?.name);
  const source = libraryText.effectDescription || task?.effectDescription || 'No special requirements.';
  return splitLines(source).map(withoutConditionPrefix).filter(Boolean);
}

function TaskDetails({ task }) {
  if (!task) return <p>No task assigned.</p>;

  const detailLines = taskRequirementLines(task);
  const features = taskFeatureChips(task);
  const description = taskDisplayDescription(task);

  return (
    <div className="task-detail-card">
      <div className="task-title-row">
        <div>
          <h3>{task.name}</h3>
        </div>
        <div className="cost-chip-row">
          <CardCostChips card={task} />
        </div>
      </div>

      <p className="task-description">{description}</p>

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

function ReconReportModal({ report, onClose, onInspect }) {
  const players = report?.players || [];

  return (
    <Modal open={Boolean(report)} onClose={onClose}>
      <div className="recon-shell">
        <div className="recon-panel">
          <div className="incident-header">
            <div>
              <span className="header-eyebrow">private reconnaissance</span>
              <h2>Player hands revealed</h2>
            </div>
            <button type="button" onClick={onClose}>Close</button>
          </div>

          <p className="recon-note">Visible only to the Hacker. This end-of-turn snapshot shows each other player, not your own hand.</p>

          <div className="recon-grid">
            {players.map((player) => (
              <section key={player.name} className="recon-player-box">
                <div className="recon-player-heading">
                  <strong>{player.name}</strong>
                  <span>{(player.cards || []).length} cards</span>
                </div>

                {(player.cards || []).length === 0 ? (
                  <p className="recon-empty">empty hand</p>
                ) : (
                  <div className="recon-card-list">
                    {player.cards.map((card) => {
                      const displayCard = enrichCardText(card);
                      return (
                        <button
                          key={displayCard.id || `${player.name}-${displayCard.name}`}
                          type="button"
                          className="recon-card-chip"
                          title={effectText(displayCard)}
                          onClick={() => onInspect?.(displayCard)}
                        >
                          <strong><TextWithHighlightedCards text={displayCard.name} preferred={[displayCard.name, displayCard.rawName]} /></strong>
                          <span>{displayCard.type}{displayCard.laneLabel ? ` // ${displayCard.laneLabel}` : ''}</span>
                          <em className="recon-card-effect">{effectText(displayCard)}</em>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function IncidentReportModal({ open, pages, index, setIndex, onClose, onInspect }) {
  const page = pages[index] || pages[0];
  const card = page?.card ? enrichCardText(page.card) : null;
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
              <div className="incident-card-tile">
                <CardTile
                  card={card}
                  compact
                  onInspect={onInspect}
                  onClick={() => onInspect?.(card)}
                />
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
        <div><span>Project Progress</span><strong>{tasksCompleted}/{tasksRequired}</strong></div>
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
          <div><span>Project Progress</span><strong>{tasksCompleted}/{tasksRequired}</strong></div>
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

function TurnTimer({ gameState }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const phase = gameState?.turnPhase || 'play';
  const endsAt = gameState?.turnPhaseEndsAt ? Date.parse(gameState.turnPhaseEndsAt) : null;
  const duration = Number(gameState?.turnPhaseDurationMs || 0);
  const remainingMs = endsAt ? Math.max(0, endsAt - now) : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const progress = duration > 0 ? Math.max(0, Math.min(1, remainingMs / duration)) : 0;
  const degrees = Math.round(progress * 360);

  const labels = {
    discussion: 'Discussion',
    play: 'Play',
    discard: 'Discard',
  };

  return (
    <div className={`turn-timer turn-timer-${phase}`}>
      <div
        className="turn-timer-ring"
        style={{ '--timer-degrees': `${degrees}deg` }}
        aria-label={`${labels[phase] || 'Turn'} timer: ${remainingSeconds} seconds remaining`}
      >
        <span>{remainingSeconds}</span>
      </div>
      <div className="turn-timer-copy">
        <strong>{labels[phase] || 'Turn'} phase</strong>
        <span>{phase === 'discussion'
          ? 'Coordinate privately. The timer ends early when everyone is ready.'
          : phase === 'discard'
            ? 'Discard down to the hand limit.'
            : 'Choose your card. Idle players will pass.'}</span>
      </div>
    </div>
  );
}

export const Game = ({ socket, name, room, setRoom, skipIntro = false, setSkipIntro = () => {} }) => {
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
  const [reconReport, setReconReport] = useState(null);
  const [introOpen, setIntroOpen] = useState(false);


  const previousHandIdsRef = useRef(null);
  const drawTimerRef = useRef(null);
  const affordanceTimerRef = useRef(null);
  const delayGameOverRef = useRef(false);
  const pendingGameOverRef = useRef(null);
  const introSeenRef = useRef(false);

  const you = useMemo(
    () => gameState?.players?.find((p) => p.name === name) ?? null,
    [gameState, name]
  );

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return;
    if (!gameState || !you || introSeenRef.current) return;
    if (skipIntro) {
      introSeenRef.current = true;
      return;
    }
    if (gameState.phase !== 'playing' || Number(gameState.turnNumber || 1) > 1) return;

    const introKey = `intrusion:intro-briefing-seen:${activeRoom}:${name}`;
    if (window.localStorage.getItem(introKey) === 'true') {
      introSeenRef.current = true;
      return;
    }

    introSeenRef.current = true;
    setIntroOpen(true);
  }, [activeRoom, gameState, name, skipIntro, you]);

  const markIntroSeen = () => {
    window.localStorage.setItem(`intrusion:intro-briefing-seen:${activeRoom}:${name}`, 'true');
    setIntroOpen(false);
  };

  const closeIntroBriefing = () => {
    markIntroSeen();
  };

  const skipFutureIntroBriefings = () => {
    setSkipIntro(true);
    markIntroSeen();
  };

  const hand = useMemo(() => you?.cards ?? [], [you]);
  const task = you?.task ?? null;
  const selectableCards = useMemo(
    () => [...hand, ...(task ? [{ ...task, fromTaskSlot: true }] : [])],
    [hand, task]
  );

  const turnPhase = gameState?.turnPhase || (you?.mustDiscard ? "discard" : "play");
  const isDiscussionPhase = turnPhase === "discussion";
  const isPlayPhase = turnPhase === "play";
  const isDiscardPhase = turnPhase === "discard";
  const mustDiscard = Boolean(you?.mustDiscard) && isDiscardPhase;
  const discardCount = you?.discardCount ?? 0;
  const isEngineer = you?.role === "SecEng" || you?.role === "SecurityEngineer";
  const isSpectator = Boolean(you?.isEliminated) || you?.role === "Spectator";
  const isEnded = gameState?.phase === "ended" || Boolean(gameState?.winner);
  const hasSubmitted = Boolean(you?.submittedThisTurn);
  const submittedCards = you?.submittedCardsThisTurn ?? [];
  const canAct = Boolean(you) && !isEnded && !isSpectator && gameState?.phase === "playing" && isPlayPhase && !hasSubmitted && !you?.awaitingDrawChoice;
  const canReadyDiscussion = Boolean(you) && !isEnded && !isSpectator && gameState?.phase === "playing" && isDiscussionPhase && !gameState?.yourDiscussionReady;

  useEffect(() => {
    if (isEnded) setGameOverOpen(true);
  }, [isEnded]);

  useEffect(() => {
    if (gameState?.phase === 'voting') setVoteOpen(true);
  }, [gameState?.phase]);

  const stagedCards = stagedIds
    .map((cardId) => selectableCards.find((card) => card.id === cardId) || submittedCards.find((card) => card.id === cardId))
    .filter(Boolean);
  const visibleQueueCards = hasSubmitted && submittedCards.length > 0 ? submittedCards : stagedCards;
  const system = gameState?.system ?? {};
  const ddosOngoing = Boolean((system.lanes || []).some((lane) => lane.ddosActive));
  const tasksCompleted = system.numTasksCompleted ?? Math.max(0, (system.numTasksRequired ?? 0) - (system.numTasksRemaining ?? 0));
  const tasksRequired = system.numTasksRequired ?? "?";
  const taskDefended = isTaskLaneDefended(system, task);
  const maxSubmitCards = maxSubmitCardsFor(you);
  const voteProposal = gameState?.voteProposal ?? null;
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

    const onSubmitAck = ({ mustDiscard: needsDiscard }) => {
      setStatus(
        needsDiscard
          ? "Queue submitted. Finalise your hand before the cycle can continue."
          : "Queue submitted. Waiting for the rest of the table."
      );
    };

    const onDiscardAck = () => {
      setStatus("Discard confirmed. Waiting for the rest of the table.");
      setDiscardIds([]);
    };

    const onHackerDrawAck = () => {
      setStatus("Draw complete. Submit your operation when ready.");
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
      if (!result?.players) {
        setReports((current) => [...current, "Recon result: no player hands were available."]);
        return;
      }

      setReconReport(result);
      setReports((current) => [...current, "Recon result: other players' hands revealed privately."]);
    };

    const onServerLogResult = (result) => {
      if (!result?.checked) {
        setReports((current) => [...current, "Private server log result: no valid target was checked."]);
        return;
      }

      setReports((current) => [
        ...current,
        `Private server log result: ${result.hostile ? `${result.targetName} has played a hostile card this cycle. They are the Hacker.` : `${result.targetName} has not played a hostile card this cycle.`}`,
      ]);
    };

    const onTaskReplaced = (result) => {
      setStatus(result?.ok ? "Task replaced." : result?.error || "Could not replace task.");
    };

    const onVoteProposed = ({ callerName } = {}) => {
      setStatus(`${callerName || 'A player'} wants to call the vote.`);
    };

    const onVoteProposalUpdated = (proposal) => {
      if (proposal) setStatus(`Vote proposal: ${proposal.approvalCount}/${proposal.threshold} ready to proceed.`);
    };

    const onVoteProposalDeferred = () => {
      setStatus('Vote deferred. The option remains available.');
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
    socket.on("vote-proposed", onVoteProposed);
    socket.on("vote-proposal-updated", onVoteProposalUpdated);
    socket.on("vote-proposal-deferred", onVoteProposalDeferred);
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
      socket.off("vote-proposed", onVoteProposed);
      socket.off("vote-proposal-updated", onVoteProposalUpdated);
      socket.off("vote-proposal-deferred", onVoteProposalDeferred);
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

  const markTurnReady = () => {
    socket.emit("turn-ready", { room: activeRoom, playerName: name });
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

    if (!isTaskLaneDefended(system, card)) {
      showAffordanceWarning(laneRequirementMessage(card));
      return;
    }

    const stateMessage = stateRequirementMessage(system, card, { player: you, turnNumber: gameState?.turnNumber });
    if (stateMessage) {
      showAffordanceWarning(stateMessage);
      return;
    }

    const ruleMessage = submissionRuleMessage(you, stagedCards, card);
    if (ruleMessage) {
      setError(ruleMessage);
      return;
    }

    setStagedIds((current) => [...current, cardId]);
    if (usesPlayerTarget(card)) {
      setCardTargets((current) => ({
        ...current,
        [card.id]: {
          ...(current[card.id] || {}),
          targetPlayerName: current[card.id]?.targetPlayerName || "__random__",
        },
      }));
    }
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
    if (!mustDiscard || !cardId) return;

    setDiscardIds((current) => {
      if (discardCount <= 1) return [cardId];
      if (current.includes(cardId)) return current.filter((id) => id !== cardId);
      if (current.length < discardCount) return [...current, cardId];
      return [...current.slice(1), cardId];
    });
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
      setError("Select the required card before continuing.");
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

  const respondVoteProposal = (proceed) => {
    socket.emit("respond-vote-proposal", { room: activeRoom, playerName: name, proceed });
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

  const openLastTurnReport = () => {
    if (!incidentReportPages.length) return;
    setIncidentReportIndex(0);
    setIncidentReportOpen(true);
  };

  if (!gameState || !you) {
    return (
      <main className="game-page center">
        <div className="game-loading">
          <h1>Loading...</h1>
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
          <button type="button" onClick={() => setLogOpen(true)}>Table Log</button>
          <button type="button" onClick={openLastTurnReport} disabled={!incidentReportPages.length}>Last Report</button>
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

      {canReadyDiscussion && (
        <div className="discussion-ready-panel">
          <span>Use this time to discuss. Your ready state is private.</span>
          <button type="button" onClick={markTurnReady}>I'm Ready</button>
        </div>
      )}
      {isDiscussionPhase && gameState?.yourDiscussionReady && (
        <div className="discussion-ready-panel ready">Waiting for the discussion timer or all players to ready up.</div>
      )}

      <section className="game-dashboard">
        <div className="game-panel identity-panel">
          <div className="panel-heading">
            <span>// player</span>
            <strong>{displayRoleCompact(you.role)}</strong>
          </div>

          <h2>{you.name}</h2>

          <div className="skill-grid">
            <div className="skill-cell skill-time"><span>ROLE</span><strong>{displayRoleCompact(you.role)}</strong></div>
            <div className="skill-cell skill-prog"><span>HAND</span><strong>{hand.length}/5</strong></div>

          </div>

          {!isEnded && gameState?.phase === "playing" && (
            <div className="identity-timer-slot">
              <TurnTimer gameState={gameState} />
              {canReadyDiscussion && (
                <div className="mobile-ready-inline">
                  <button type="button" onClick={markTurnReady}><span aria-hidden="true">×</span> I'm Ready</button>
                </div>
              )}
              {isDiscussionPhase && gameState?.yourDiscussionReady && (
                <div className="mobile-ready-inline ready">Waiting for all players or the timer.</div>
              )}
            </div>
          )}
        </div>

        <div className="game-panel system-panel">
          <div className="panel-heading">
            <span className="system-heading-label">
              // system
              {ddosOngoing && <em className="ddos-status-chip">ONGOING DDoS</em>}
            </span>
            <strong>{gameState.phase} / {turnPhase}</strong>
          </div>

          <div className="system-grid">
            <div><span>cycle</span><strong>{gameState.turnNumber}</strong></div>
            <div><span>integrity</span><strong>{system.integrityPoints ?? "?"}</strong></div>
            <div><span>Project Progress</span><strong>{tasksCompleted}/{tasksRequired}</strong></div>
            <div><span>evidence</span><strong>{system.evidence ?? 0}/{system.evidenceRevealThreshold ?? 5}</strong></div>
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
              <button
                type="button"
                className={task && !taskDefended ? "task-unavailable-button" : ""}
                onClick={() => task && stageCard(task.id)}
                disabled={!canAct || !task}
              >
                {!task ? "No Task" : !taskDefended ? "Lane Undefended" : stagedIds.includes(task?.id) ? "Unqueue Task" : "Queue Task"}
              </button>
            </div>
          </div>

          {task ? (
            <div className={`task-card-row task-card-row-detailed ${taskDefended ? "task-ready" : "task-blocked"}`}>
              {!taskDefended && <div className="mobile-task-warning">Lane undefended</div>}
              <CardTile
                card={task}
                compact
                showDetails={false}
                selected={stagedIds.includes(task.id)}
                draggable={canAct && !mustDiscard && !stagedIds.includes(task.id) && taskDefended}
                disabled={!canAct || mustDiscard}
                onClick={() => stageCard(task.id)}
                onInspect={setPreviewCard}
                onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
              />
              <TaskDetails task={task} />
            </div>
          ) : (
            <TaskDetails task={null} />
          )}
        </div>
      </section>

      <section className="game-table">
        <section
          className={`game-panel command-panel drop-zone ${dragOver ? "drag-over" : ""}`}
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
          <div className="command-panel-grid">
            <div className={`queue-section ${you?.awaitingDrawChoice ? "draw-choice-pending" : ""}`}>
              <div className="panel-heading compact-heading">
                <span>// system queue</span>
                <strong>{visibleQueueCards.length}/{maxSubmitCards}</strong>
              </div>

              {visibleQueueCards.length === 0 ? (
                <div className="drop-placeholder compact-placeholder">
                  {hasSubmitted
                    ? "Queue submitted."
                    : mustDiscard
                      ? "Choose cards to discard before continuing."
                      : isDiscussionPhase
                        ? "Discussion in progress."
                        : "Drop card here — or pass."}
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

              <div className="mobile-draw-queue">
                <HackerDrawPanel you={you} onChoose={chooseHackerDraw} />
              </div>

              {!hasSubmitted && stagedCards.filter(usesPlayerTarget).map((card) => (
                <div className="target-selector-row" key={`target-${card.id}`}>
                  <label htmlFor={`player-target-${card.id}`}>{playerTargetLabel(card)}</label>
                  <select
                    id={`player-target-${card.id}`}
                    value={cardTargets[card.id]?.targetPlayerName || "__random__"}
                    onChange={(event) => setCardTargets((current) => ({
                      ...current,
                      [card.id]: { ...(current[card.id] || {}), targetPlayerName: event.target.value },
                    }))}
                  >
                    <option value="__random__">Random</option>
                    {gameState.players
                      .filter((player) => player.name !== name && !player.isEliminated && !player.isSpectator)
                      .map((player) => <option key={player.name} value={player.name}>{player.name}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="hand-section embedded-hand-section">
              <div className="panel-heading compact-heading">
                <span>// hand</span>

                <div className="hand-actions">
                  <span className={`hand-count ${hand.length > 5 ? "over" : ""}`}>{hand.length}/5</span>
                  {mustDiscard ? (
                    <button type="button" onClick={submitDiscard}>Confirm</button>
                  ) : (
                    <button type="button" onClick={submitCards} disabled={!canAct}>
                      {stagedIds.length === 0 ? "Pass Turn" : stagedIds.length > 1 ? "Submit Cards" : "Submit Card"}
                    </button>
                  )}
                </div>
              </div>

              <div className={`hand-body ${you?.awaitingDrawChoice ? "with-draw-menu" : ""}`}>
                <div className={`hand-capacity-shell ${hand.length > 5 ? "over-limit" : ""}`}>
                  <div className="hand-slot-guide" aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, index) => <span key={index} />)}
                  </div>
                  <div className="hand-strip command-hand-strip">
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
                <HackerDrawPanel you={you} onChoose={chooseHackerDraw} />
              </div>
            </div>
          </div>
        </section>

        <section className="game-panel players-panel">
          <div className="panel-heading">
            <span>// players</span>
            {isEngineer && !gameState.votingExpired && !isEnded && !isSpectator && (gameState.turnNumber >= (gameState.voteUnlockTurn ?? 3)) && (
              <button type="button" onClick={callVote} disabled={Boolean(voteProposal)}>Call Vote</button>
            )}
          </div>

          <div className="agent-list">
            {gameState.players.map((player) => (
              <div
                key={player.name}
                className={`agent-row ${player.name === name ? "self" : ""} ${player.isEliminated || player.isSpectator ? "eliminated" : ""}`}
              >
                <div className="agent-row-main">
                  <div className="agent-name-line">
                    <span>{player.name}</span>
                    <PlayerProgressChips player={player} />
                  </div>
                  <strong>
                    {player.isEliminated || player.isSpectator
                      ? "spectating"
                      : player.name === name
                        ? displayRole(player.role)
                        : player.hackerRevealed || player.role === 'Hacker'
                          ? 'Hacker revealed'
                          : "active"}

                  </strong>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>

      <LogModal open={logOpen} onClose={() => setLogOpen(false)} logs={logs} />
      <GameInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
      <IntroBriefingModal open={introOpen} role={you?.role} onClose={closeIntroBriefing} onSkipIntro={skipFutureIntroBriefings} />
      <CardPreviewModal card={previewCard} onClose={() => setPreviewCard(null)} />
      <GameOverModal
        open={isEnded && gameOverOpen}
        gameState={gameState}
        logs={logs}
        onLobby={returnToLobbyAfterGame}
        onClose={() => setGameOverOpen(false)}
      />

      <ReconReportModal report={reconReport} onClose={() => setReconReport(null)} onInspect={setPreviewCard} />

      <IncidentReportModal
        open={incidentReportOpen}
        pages={incidentReportPages}
        index={incidentReportIndex}
        setIndex={setIncidentReportIndex}
        onClose={closeIncidentReport}
        onInspect={setPreviewCard}
      />

      <VoteProposalModal
        proposal={voteProposal}
        open={Boolean(voteProposal) && !isEnded && !isSpectator}
        onRespond={respondVoteProposal}
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
