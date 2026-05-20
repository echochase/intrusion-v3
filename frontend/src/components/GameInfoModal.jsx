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
            <button type="button" onClick={onClose}>Close</button>
          </div>

          <div className="game-info-tabs" role="tablist" aria-label="Rules and lore sections">
            <button type="button" className={tab === 'rules' ? 'active' : ''} onClick={() => setTab('rules')}>Rules</button>
            <button type="button" className={tab === 'field' ? 'active' : ''} onClick={() => setTab('field')}>Field Notes</button>
          </div>

          {tab === 'rules' ? (
            <div className="rules-copy">
              <RuleBlock title="Premise">
                <p>One hidden Hacker is trying to compromise the system while the Security Engineers race to finish the project. The public board is built around five security Lanes: Credentials, Social, Web, Network, and Physical. A Lane is either open or defended.</p>
              </RuleBlock>

              <RuleBlock title="Players and Roles">
                <RulesList>
                  <p><strong>4 to 5 players</strong> are required. One player is secretly assigned as the Hacker. Everyone else is a Security Engineer.</p>
                  <p><strong>Security Engineers</strong> win by completing the project or correctly voting out the Hacker. Engineers always draw from the Security deck.</p>
                  <p><strong>The Hacker</strong> wins by reducing System Integrity to zero. At the start of each turn after the first, the Hacker secretly draws 2 cards in any combination from the Security and Hacker decks.</p>
                </RulesList>
              </RuleBlock>

              <RuleBlock title="Turn Structure">
                <RulesList>
                  <p>Each active player has one task and a private hand. Each turn, players discuss, then Security Engineers secretly submit <strong>one card</strong> or pass. The Hacker may submit up to <strong>two cards</strong>, with at most one Hacker card and one Security card.</p>
                  <p>When everyone has submitted, the System resolves emergency responses first, then hostile operations, defences, investigations, and tasks.</p>
                  <p>Hands are private. Players may claim, bluff, promise, and accuse, but they should not reveal screenshots or prove the exact contents of their hand.</p>
                </RulesList>
              </RuleBlock>

              <RuleBlock title="Lanes, Defences, and Tasks">
                <RulesList>
                  <p>There are five Lanes: <strong>Credentials</strong>, <strong>Social</strong>, <strong>Web</strong>, <strong>Network</strong>, and <strong>Physical</strong>.</p>
                  <p>Only three Lanes can be defended at once. Defences are face-up and persist until replaced or sabotaged. They do not deplete when they block an attack.</p>
                  <p>Tasks belong to Lanes and can only be completed when their matching Lane is defended. Each completed task grants +1 Project Progress, so the team has to protect Lanes before pushing work.</p>
                </RulesList>
              </RuleBlock>

              <RuleBlock title="Attacks, Evidence, and Logs">
                <RulesList>
                  <p>Attacks target Lanes. If the Lane is open, most attacks remove 1 Integrity. DDoS instead cancels Project Progress for that turn. Zero-Day is a rare late-game attack that cannot be blocked.</p>
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
                <p>Security is not just a pile of hidden shields. Teams need to understand which areas are protected and which areas are exposed. The visible Lane board turns that idea into a readable game state: the Hacker sees where the openings are, but the engineers see those openings too.</p>
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
