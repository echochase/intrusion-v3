import { Menu, MenuItem, Modal, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { ACTION_NAME_MAP } from "../utils";
import React from "react";

const mono = { fontFamily: "'Share Tech Mono', monospace" };
const orb  = { fontFamily: "'Orbitron', sans-serif" };

export const WinningModal = ({ end, setEnd, winner }) => (
  <Modal open={end} onClose={() => setEnd(false)}>
    <div className="modal center">
      {winner ? (
        <div className="center">
          <h2 style={{ color: "#00ff88", fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.12em" }}>
            SYSTEM COMPROMISED
          </h2>
          <p style={mono}>Agent <strong>{winner}</strong> has achieved full network dominance.</p>
        </div>
      ) : (
        <div className="center">
          <h2 style={{ color: "#ff3355", fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.12em" }}>
            MUTUAL DESTRUCTION
          </h2>
          <p style={mono}>All agents eliminated. No victor recorded.</p>
        </div>
      )}
      <div className="horizontal-box" style={{ marginTop: 16 }}>
        <button onClick={() => setEnd(false)}>Acknowledge</button>
      </div>
    </div>
  </Modal>
);

export const LogModal = ({
  openLog, setOpenLog, room, name, turnLogs, turnCount, stage, winner, isSpectator,
}) => {
  const logEndRef = useRef(null);

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollTop = logEndRef.current.scrollHeight;
  }, [turnLogs, openLog]);

  return (
    <Modal open={openLog} onClose={() => setOpenLog(false)}>
      <div className="modal center">
        <h3 style={{ ...orb, color: "#00ff88", fontSize: "0.85rem", letterSpacing: "0.15em" }}>
          SESSION: {room}
        </h3>
        <strong style={{ ...mono, color: "var(--text-muted)", fontSize: "0.8rem" }}>
          CYCLE {turnCount} // PHASE: {stage.toUpperCase()}
        </strong>
        <strong style={{ ...mono, color: "var(--text-muted)", fontSize: "0.8rem" }}>
          AGENT: {name} {isSpectator && <span style={{ color: "#ffaa00" }}>[OBSERVER]</span>}
        </strong>
        <div className="mobile-log" ref={logEndRef} style={{ ...mono, fontSize: "0.82rem" }}>
          {turnLogs.map((log, i) => (
            <div key={i} style={{ color: "var(--text)", borderBottom: "1px solid rgba(0,255,136,0.05)", padding: "2px 0" }}>
              <span style={{ color: "var(--text-muted)" }}>&gt;&nbsp;</span>{log}
            </div>
          ))}
        </div>
        {winner !== "" && (
          <div className="center">
            {winner
              ? <h3 style={{ color: "#00ff88", ...orb }}>RESULT: {winner} WINS</h3>
              : <h3 style={{ color: "#ff3355", ...orb }}>RESULT: DRAW</h3>}
          </div>
        )}
      </div>
    </Modal>
  );
};

export const TargetMenu = ({ anchorEl, open, closeTargetMenu, players, name }) => (
  <Menu
    anchorEl={anchorEl}
    open={open}
    onClose={() => closeTargetMenu()}
    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    transformOrigin={{ vertical: "top", horizontal: "right" }}
    slotProps={{
      paper: {
        sx: {
          backgroundColor: "#0a1018",
          border: "1px solid rgba(0,255,136,0.3)",
          borderRadius: "2px",
          boxShadow: "0 0 20px rgba(0,255,136,0.12)",
        },
      },
    }}
  >
    {players
      .filter((p) => p.name !== name)
      .map((p) => (
        <MenuItem
          key={p.name}
          onClick={() => closeTargetMenu(p.name)}
          sx={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "0.72rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#00d4ff",
            "&:hover": { background: "rgba(0,212,255,0.08)", color: "#e8fff2" },
            transition: "all 0.15s ease",
          }}
        >
          {p.name}
        </MenuItem>
      ))}
  </Menu>
);

export const ActionButtons = ({ you, selectAction }) => {
  const numSpecial = you?.powerUps.special;
  const numCruelty = you?.powerUps.cruelty;
  const numProwess = you?.powerUps.prowess;
  const numHeal    = you?.powerUps.heal;

  return (
    <>
      <div className="action-buttons">
        <div className="tooltip-wrapper">
          <button className="action-button" onClick={(e) => selectAction(e, "attack")}>Breach</button>
          <div className="tooltip">Physical intrusion. Deals 1 integrity damage. Countered by Firewall.</div>
        </div>
        <div className="tooltip-wrapper">
          <button className="action-button" onClick={(e) => selectAction(e, "defend")}>Firewall</button>
          <div className="tooltip">Blocks all physical vectors. Useless against energy exploits.</div>
        </div>
        <div className="tooltip-wrapper">
          <button className="action-button" onClick={(e) => selectAction(e, "energy-shield")}>Countermeasure</button>
          <div className="tooltip">Blocks all energy-based exploits including Overload and Wipeout.</div>
        </div>
      </div>

      <hr style={{ width: "100%", borderColor: "rgba(0,255,136,0.12)", margin: "8px 0" }} />

      <div className="powerup-buttons">
        <div className="power-up-wrapper tooltip-wrapper">
          <button className={numSpecial >= 0 ? "action-button" : "action-button bluff"} onClick={(e) => selectAction(e, "special")}>
            Overload
          </button>
          {numSpecial >= 0 && <div className="power-up-badge">{numSpecial}</div>}
          <div className="tooltip">Energy-based intrusion. Deals 2 damage. Blockable by Countermeasure. Deflectable.</div>
        </div>

        <div className="power-up-wrapper tooltip-wrapper">
          <button className={numCruelty >= 0 ? "action-button" : "action-button bluff"} onClick={(e) => selectAction(e, "cruelty")}>
            Wipeout
          </button>
          {numCruelty >= 0 && <div className="power-up-badge">{numCruelty}</div>}
          <div className="tooltip">Catastrophic exploit. Instantly zeroes target integrity. Countermeasure only defense.</div>
        </div>

        <div className="power-up-wrapper tooltip-wrapper">
          <button className={numProwess >= 0 ? "action-button" : "action-button bluff"} onClick={(e) => selectAction(e, "prowess")}>
            Deflect
          </button>
          {numProwess >= 0 && <div className="power-up-badge">{numProwess}</div>}
          <div className="tooltip">Reflects all incoming attacks from a single target back to the aggressor.</div>
        </div>

        <div className="power-up-wrapper tooltip-wrapper">
          <button className={numHeal >= 0 ? "action-button" : "action-button bluff"} onClick={(e) => selectAction(e, "heal")}>
            Patch
          </button>
          {numHeal >= 0 && <div className="power-up-badge">{numHeal}</div>}
          <div className="tooltip">Restores 2 integrity. Cannot exceed maximum integrity.</div>
        </div>
      </div>
    </>
  );
};

export const ChooseDeclarations = ({ confirmed, declaredActions, declareAction, deleteAction, name }) => (
  <div className={`declared-actions ${confirmed ? "confirmed" : "unconfirmed"}`}>
    <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.75rem", letterSpacing: "0.15em", color: "#00d4ff" }}>
      DECLARED OPERATIONS:
    </h3>
    <div className="horizontal-box">
      {declaredActions.map((act, idx) => (
        <button
          className={`declared-action ${act.bluff ? "bluff" : ""}`}
          key={idx}
          onClick={() => deleteAction(idx)}
        >
          {ACTION_NAME_MAP[act.actionType]} {act.target !== name && `→ ${act.target}`}
        </button>
      ))}
    </div>
    <br />
    {!confirmed && declaredActions.length === 3 && (
      <button className="declared-action" onClick={declareAction}>Commit</button>
    )}
    {confirmed && (
      <>
        <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          // Operations queued for execution:
        </p>
        {declaredActions.map((act, idx) => (
          <div key={idx} className={act.bluff ? "bluff" : ""} onClick={() => deleteAction(idx)}>
            {ACTION_NAME_MAP[act.actionType]} {act.target !== name && `→ ${act.target}`}
          </div>
        ))}
      </>
    )}
    <br />
  </div>
);

export const ChooseExecutions = ({ confirmed, declaredActions, selectedExecutions, confirmExecution, executeAction }) => (
  <div
    className="choose-execution"
    style={{ border: confirmed ? "1px solid rgba(0,255,136,0.5)" : "1px solid rgba(255,51,85,0.5)" }}
  >
    {!confirmed ? (
      <>
        <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.72rem", letterSpacing: "0.15em", color: "#ff3355" }}>
          SELECT 2 OPERATIONS TO EXECUTE:
        </h3>
        <div className="horizontal-box">
          {declaredActions.map((act, idx) => {
            const isSelected = selectedExecutions.includes(idx);
            return (
              <button
                className={`declared-action ${isSelected ? "selected" : "declared-action-choose"} ${act.bluff ? "bluff" : ""}`}
                key={idx}
                onClick={() => executeAction(idx)}
                disabled={act.bluff}
              >
                {ACTION_NAME_MAP[act.actionType]} → {act.target}
              </button>
            );
          })}
        </div>
      </>
    ) : (
      <>
        <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.72rem", letterSpacing: "0.15em", color: "#00ff88" }}>
          EXECUTING THIS CYCLE:
        </h3>
        <div className="horizontal-box">
          {declaredActions
            .map((act, idx) => ({ act, idx }))
            .filter(({ idx }) => selectedExecutions.includes(idx))
            .map(({ act, idx }) => (
              <button className="declared-action selected" key={idx} onClick={() => executeAction(idx)}>
                {ACTION_NAME_MAP[act.actionType]} → {act.target}
              </button>
            ))}
        </div>
      </>
    )}
    {!confirmed && (
      <button className="menu-button" style={{ marginTop: "15px" }} onClick={confirmExecution}>
        Confirm Execute
      </button>
    )}
  </div>
);

export const SpectatorsPanel = ({ spectators }) => (
  <div className="spectators-panel">
    <Typography variant="subtitle2" gutterBottom sx={{
      fontFamily: "'Orbitron', sans-serif",
      fontSize: "0.6rem",
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: "#00d4ff",
      fontWeight: 600,
    }}>
      // OBSERVERS
    </Typography>
    {spectators && spectators.length > 0 ? (
      <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
        {spectators.map((n, i) => (
          <li key={i} style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            marginBottom: "4px",
            letterSpacing: "0.05em",
          }}>
            &gt; {n}
          </li>
        ))}
      </ul>
    ) : (
      <Typography variant="body2" sx={{
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: "0.75rem",
        color: "var(--text-dim)",
        fontStyle: "italic",
      }}>
        no observers connected
      </Typography>
    )}
  </div>
);