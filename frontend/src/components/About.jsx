import { useNavigate } from "react-router-dom";
import "../styles/about.css";
import React from "react";

export const About = () => {
  const navigate = useNavigate();

  return (
    <div className="about-description">
      <h1 className="title">INTRUSION</h1>
      <div className="subtitle">// a social deduction cybersecurity card game</div>

      <h2>About the Project</h2>
      <p>
        <strong>Intrusion</strong> is a multiplayer social deduction card game about protecting a fragile
        system while a hidden intruder tries to bring it down from within. It turns cybersecurity-inspired
        attacks, defences, and team decisions into a tense simulation of trust under pressure.
      </p>
      <p>
        The game is designed to be approachable first and technical second. Instead of recreating every
        detail of real incident response, it uses readable card effects, visible system states, and hidden
        motives to make security ideas easier to discuss, recognise, and remember.
      </p>

      <h2>The Premise</h2>
      <p>
        Players are placed inside <strong>QuantumNova</strong>, a startup racing to finish an ambitious
        cyber-defence project before its systems collapse. Most players are Security Engineers trying to keep
        the project alive. One player is secretly working against them, using the confusion of the simulation
        to damage the system from within.
      </p>
      <p>
        The result is a game about trust under pressure: every helpful move might be genuine, every mistake
        might be suspicious, and every round asks the team to decide whether to repair the system, progress
        the project, or question the people sitting beside them.
      </p>

      <h2>Design Goal</h2>
      <p>
        Intrusion aims to teach through play. It translates ideas like phishing, credential attacks, web
        vulnerabilities, DDoS disruption, physical security, layered defences, insider threats, and incident
        reporting into decisions that players can see and argue about during the game.
      </p>
      <p>
        The focus is not on memorising terminology. The focus is on understanding relationships: attacks need
        openings, defences reduce risk, systems can fail under pressure, and human behaviour is often just as
        important as technical control.
      </p>

      <h2>Project Identity</h2>
      <ul className="stages-list">
        <li>A cybersecurity-themed card game built around social deduction and collaborative defence.</li>
        <li>A playable teaching tool for discussing common security concepts in a low-pressure setting.</li>
        <li>A stylised simulation where clarity, atmosphere, and learnability matter more than dense realism.</li>
      </ul>

      <h2>How to Play</h2>
      <p>
        For setup, turn flow, card types, win conditions, and the world behind the simulation, see the
        <strong> Rules &amp; Lore</strong> section.
      </p>

      <button className="return-to-menu" onClick={() => navigate("/")}>← Back to Base</button>
      <button className="about-mobile-back-button" onClick={() => navigate(-1)}>← Back</button>
    </div>
  );
};
