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
        <strong>Intrusion</strong> was created as a Something Awesome Project for COMP6841. It is a
        multiplayer card game about insider threats, incident response, visible security posture, and the
        trade-off between technical accuracy and playable design.
      </p>
      <p>
        The game does not try to simulate every detail of real cybersecurity. Instead, it turns security
        ideas into readable table decisions: which Lanes are exposed, which defences are active, whether
        the team should push project work, and who might be using the chaos as cover.
      </p>

      <h2>Core Idea</h2>
      <p>
        One player is secretly the <strong>Hacker</strong>. Everyone else is a <strong>Security Engineer</strong>.
        The engineers need to complete enough Project Progress or identify the insider. The Hacker needs
        to reduce System Integrity to zero before the team finishes the project.
      </p>
      <p>
        The board is organised around five security Lanes: <strong>Credentials</strong>, <strong>Social</strong>,
        <strong> Web</strong>, <strong>Network</strong>, and <strong>Physical</strong>. Each Lane is either open or
        defended, so both sides can understand the system's current risk at a glance.
      </p>

      <h2>How Play Works</h2>
      <ul className="stages-list">
        <li>Security Engineers draw from the Security deck and choose one card to submit each turn.</li>
        <li>The Hacker secretly draws two cards from any mix of the Security and Hacker decks.</li>
        <li>Security Engineers submit one card or pass. The Hacker may submit up to two cards, with at most one Hacker card and one Security card. The System resolves the queue and produces an incident report.</li>
        <li>Defences are face-up, persistent, and limited to three active Lanes at a time.</li>
        <li>Tasks can only be completed when their matching Lane is defended. Each completed task grants +1 Project Progress, so the team has to build protection before rushing the project.</li>
      </ul>

      <h2>How the Game Teaches Cybersecurity</h2>
      <p>
        Attacks and defences are grouped by security concept. Phishing attacks the Social Lane and is
        stopped by Employee Awareness. XSS attacks the Web Lane and is stopped by Input Sanitisation.
        Credential attacks are stopped by Two-Factor Authentication. DDoS pressures the Network Lane
        by limiting processing power until an Anti-DDoS countermeasure is deployed, while Physical Data Theft targets physical access.
      </p>
      <p>
        When something happens, the incident report explains the cause and effect in plain language. If an
        attack is blocked, the game names the attack, the defence, and the Lane involved. That makes the
        educational moment part of normal play rather than a separate lecture.
      </p>

      <h2>Social Deduction</h2>
      <p>
        The Hacker can perform legitimate-looking work to maintain cover. They may install real defences,
        complete tasks once Lanes are defended, or draw from the Security deck when they need to look normal. Helpful behaviour is
        evidence, but it is never proof.
      </p>
      <p>
        The engineers get one formal accusation vote from cycle 3 onward. A correct vote wins the game;
        a wrong vote removes an innocent player and spends the team's best chance to identify the insider.
      </p>

      <h2>Design Philosophy</h2>
      <p>
        The current version focuses on clarity. It removes bookkeeping-heavy systems and keeps the most
        important decisions: defend Lanes, complete project work only when it is safe, watch for suspicious behaviour, and time
        attacks carefully. The result is still recognisably a cybersecurity game, but it should be easier to
        learn, teach, and actually finish.
      </p>
      <p>
        The project uses AI-generated art decoratively for card visuals. The rules, implementation, and
        game design remain the core project work.
      </p>

      <h2>Lore</h2>
      <p>
        In the world of the game, QuantumNova is a small startup racing to finish its first practical quantum
        computer and connect it to an AI-backed security system. The insider has to act before that future
        security posture comes online.
      </p>

      <button className="return-to-menu" onClick={() => navigate("/")}>← Back to Base</button>
    </div>
  );
};
