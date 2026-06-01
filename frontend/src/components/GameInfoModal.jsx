import React, { useState } from "react";
import { Modal } from "@mui/material";
import "../styles/game.css";

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

export function GameInfoModal({ open, onClose }) {
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
            <button type="button" className="game-info-close-button" onClick={onClose}>Close</button>
          </div>

          <div className="game-info-tabs" role="tablist" aria-label="Rules and lore sections">
            <button type="button" className={tab === 'rules' ? 'active' : ''} onClick={() => setTab('rules')}>Rules</button>
            <button type="button" className={tab === 'field' ? 'active' : ''} onClick={() => setTab('field')}>Field Notes</button>
          </div>

          {tab === 'rules' ? (
            <div className="rules-copy">
              <RuleBlock title="Premise">
                <p>QuantumNova, a small startup chasing its first major investor demonstration, is trying to finish a practical quantum computer and pair it with an AI cyber-defence model. One hidden Hacker is a disgruntled insider trying to ruin the system before that launch becomes unstoppable.</p>
              </RuleBlock>

              <RuleBlock title="Players and Roles">
                <RulesList>
                  <p><strong>4 to 5 players</strong> are required. One player is secretly assigned as the Hacker. Everyone else is a Security Engineer.</p>
                  <p><strong>Security Engineers</strong> win by completing the project or correctly voting out the Hacker. Completing tasks means QuantumNova's quantum AI defence is ready to deploy, closing the Hacker's window of opportunity. Engineers always draw from the Security deck.</p>
                  <p><strong>The Hacker</strong> wins by reducing System Integrity to zero. They are trusted enough to blend in, but not cleared for the sensitive systems they want to destroy. At the start of each turn after the first, the Hacker secretly draws 2 cards in any combination from the Security and Hacker decks.</p>
                </RulesList>
              </RuleBlock>

              <RuleBlock title="Turn Structure">
                <RulesList>
                  <p>Each active player has one task and a private hand. Each turn, players discuss, then Security Engineers secretly submit <strong>one card</strong> or pass. The Hacker may submit up to <strong>two cards</strong>, with at most one Hacker card and one Security card.</p>
                  <p>When everyone has submitted, Rapid Incident Response resolves first. Every other submitted card is then processed in a random order, so the report shows what the system processed, not the order players clicked.</p>
                  <p>Hands are private. Players may claim, bluff, promise, and accuse, but they should not reveal screenshots or prove the exact contents of their hand.</p>
                </RulesList>
              </RuleBlock>

              <RuleBlock title="Lanes, Defences, and Tasks">
                <RulesList>
                  <p>There are five Lanes: <strong>Credentials</strong>, <strong>Social</strong>, <strong>Web</strong>, <strong>Network</strong>, and <strong>Physical</strong>.</p>
                  <p>Only three Lanes can be defended at once. Defences are face-up and behave like a queue: new defences enter the newest/rightmost slot, and if the queue is full the oldest/leftmost defence is phased out. They do not deplete when they block an attack.</p>
                  <p>Tasks list the specific Lane or Lanes that must be defended before they can be completed. Some tasks need one Lane, while larger tasks can require multiple defended Lanes at the same time.</p>
                  <p>Task rewards are not always the same. Smaller tasks usually grant 1 Project Progress, while larger multi-Lane tasks can grant more progress when the team coordinates the right defences.</p>
                </RulesList>
              </RuleBlock>

              <RuleBlock title="Attacks, Evidence, and Logs">
                <RulesList>
                  <p>Attacks target Lanes. If the Lane is open, most attacks remove 1 Integrity, but DDoS works differently: it floods the Network Lane and reduces how many queued requests the system can process each turn instead of directly damaging Integrity.</p>
                  <p>While DDoS is ongoing, the Network Lane is under attack and fewer submitted cards can resolve, so useful work may be delayed until Anti-DDoS Defence brings capacity back online. During that disruption, the Hacker's hostile Hacker card is processed immediately after any Rapid Incident Response, while their cover card remains mixed into the random queue. Zero-Day is a rare late-game attack that cannot be blocked by Lane defences.</p>
                  <p>When a defence blocks an attack, the team gains 1 Evidence. Check Server Log costs 1 Evidence and privately checks whether another player appears to have taken a hostile action this cycle. Server-log checks and False Flag plays are private; they do not appear in the public incident report. At 5 Evidence, the Hacker's identity is revealed publicly.</p>
                  <p>Rapid Incident Response blocks one attack during the current turn only. It is discarded after use and never lingers into later turns.</p>
                </RulesList>
              </RuleBlock>

              <RuleBlock title="Voting and Win Conditions">
                <RulesList>
                  <p>Security Engineers may propose the formal vote from cycle 3 onward. A 4-player game needs 2 players ready to proceed; a 5-player game needs 3. If the table delays, the vote option remains available. Once the vote begins, the Hacker may vote, but only engineer votes count when deciding who is removed.</p>
                  <p>If the engineers remove the Hacker, they win. If they remove the wrong player, that player becomes a spectator and the formal vote is spent.</p>
                  <p>The Hacker wins if Integrity reaches zero. The engineers win if the project reaches its required progress first: 12 progress in a 4-player game or 15 progress in a 5-player game.</p>
                </RulesList>
              </RuleBlock>
            </div>
          ) : (
            <div className="rules-copy field-notes-copy">
              <RuleBlock title="QuantumNova">
                <p>QuantumNova is a small company with a huge claim: practical, affordable quantum computing. Their development team is mostly fresh graduates, and because funding is thin, those same people are also carrying the security burden.</p>
                <p>Their investor pitch is bold: connect the quantum computer to an in-house AI and use that speed to anticipate cyberattacks before they fully form. If the team completes enough project work, that defence platform becomes deployable and the Hacker's chance is gone.</p>
              </RuleBlock>

              <RuleBlock title="The Insider">
                <p>The Hacker is not an outside supervillain. They are a disgruntled employee with enough social access to be trusted, enough technical knowledge to cause harm, and not enough clearance to reach the core system directly.</p>
                <p>That is why the attack is messy: stolen credentials, poisoned logs, sabotage, physical access, social pressure, and traffic overload all become ways to damage QuantumNova before the launch.</p>
              </RuleBlock>

              <RuleBlock title="Why Tasks Matter">
                <p>Tasks are the last pieces of work needed to make the quantum AI defence ready. Some are small operational steps; others join multiple parts of the company together and are worth more progress.</p>
                <p>Each task needs certain Lanes defended before it can be completed. Defending the wrong Lane may look responsible, but it will not finish the work QuantumNova actually needs. Because processing order is random after emergency responses, even honest plans can become risky when defences shift before a task resolves.</p>
              </RuleBlock>

              <RuleBlock title="DDoS and Zero-Day Pressure">
                <p>A DDoS attack does not directly break the system's integrity. It floods the Network Lane with traffic, reducing processing capacity so fewer queued requests, defences, investigations, and tasks can resolve until the team mitigates it. In that chaos, the Hacker's hostile operation gets priority, but their cover move is still lost in the random processing queue.</p>
                <p>The Zero-Day Attack represents a vulnerability the defenders have not seen before. It is rare, late-game, and unblockable by normal Lane defences.</p>
              </RuleBlock>

              <RuleBlock title="The One Vote">
                <p>From cycle 3 onward, the team gets one formal accusation vote. If they identify the Hacker, QuantumNova survives the insider threat. If they are wrong, the vote is spent and an innocent player is removed.</p>
              </RuleBlock>
            </div>
          )}
        </div>
        <button
          type="button"
          className="game-info-mobile-back"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
        >
          ← Back
        </button>
      </div>
    </Modal>
  );
}
