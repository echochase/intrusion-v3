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

      <h2>Lore</h2>
      <p>
        The game is set inside <strong>QuantumNova</strong>, a small startup with limited funding and an
        oversized ambition: becoming the first company to deliver affordable, practical quantum computing.
        Its developers are mostly fresh graduates, and because the company is stretched thin, the same team
        also doubles as its security staff.
      </p>
      <p>
        QuantumNova plans to impress investors by connecting its quantum computer to an AI cyber-defence
        model. Once deployed, that system is meant to anticipate incoming attacks and prepare defences before
        those attacks can properly land. Completing task cards represents the final project work needed to
        make that system deployable.
      </p>
      <p>
        One player is a disgruntled employee. They are not in the core technical team, but they know enough
        about the company, the people, and the systems to cause damage. They can earn trust, blend in, and
        exploit openings, but they do not have direct clearance to the most sensitive parts of the project.
      </p>

      <h2>Core Idea</h2>
      <p>
        One player is secretly the <strong>Hacker</strong>. Everyone else is a <strong>Security Engineer</strong>.
        The engineers need to complete enough Project Progress (12 in a 4-player game, 15 in a 5-player game) or identify the insider. The Hacker needs
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
        <li>Security Engineers submit one card or pass. The Hacker may submit up to two cards, with at most one Hacker card and one Security card.</li>
        <li>Rapid Incident Response resolves first. Every other card resolves in a random order, with the incident report showing the true processing sequence.</li>
        <li>Defences are face-up, persistent, and limited to three active slots. New defences join the newest/rightmost slot; if the queue is full, the oldest/leftmost defence is phased out.</li>
        <li>Tasks can only be completed when their required Lane or Lanes are defended. Some tasks need one Lane, others need multiple Lanes, and larger tasks can grant more than 1 Project Progress.</li>
      </ul>

      <h2>How the Game Teaches Cybersecurity</h2>
      <p>
        Attacks and defences are grouped by security concept. Phishing attacks the Social Lane and is
        stopped by Employee Awareness. XSS attacks the Web Lane and is stopped by Input Sanitisation.
        Credential attacks are stopped by Two-Factor Authentication. Physical Data Theft targets physical access.
      </p>
      <p>
        DDoS works differently from direct integrity attacks. It floods the Network Lane with requests, reducing
        how many queued actions the system can process each turn until an Anti-DDoS countermeasure is deployed.
        During that disruption, the Hacker's hostile card cuts ahead of the random queue, while their cover card
        remains mixed in with everyone else's actions. This makes DDoS feel less like one clean hit and more like
        the system being choked at the worst possible time.
      </p>
      <p>
        When something happens, the incident report explains the cause and effect in plain language and preserves the
        order in which actions were processed. If an attack is blocked, the game names the attack, the defence, and the Lane involved. That makes the
        educational moment part of normal play rather than a separate lecture.
      </p>

      <h2>Social Deduction</h2>
      <p>
        The Hacker can perform legitimate-looking work to maintain cover. They may install real defences,
        complete tasks once Lanes are defended, or draw from the Security deck when they need to look normal. Because non-emergency cards resolve in random order, players cannot safely infer identity from timing alone. Helpful behaviour is
        evidence, but it is never proof.
      </p>
      <p>
        The engineers get one formal accusation vote from cycle 3 onward. A correct vote wins the game;
        a wrong vote removes an innocent player and spends the team's best chance to identify the insider.
      </p>

      <h2>Design Philosophy</h2>
      <p>
        The current version focuses on clarity. It removes bookkeeping-heavy systems and keeps the most
        important decisions: defend the specific Lanes needed for the current task, choose whether to chase smaller safe progress or larger multi-Lane progress, watch for suspicious behaviour, and time
        attacks carefully. The result is still recognisably a cybersecurity game, but it should be easier to
        learn, teach, and actually finish.
      </p>
      <button className="return-to-menu" onClick={() => navigate("/")}>← Back to Base</button>
      <button className="about-mobile-back-button" onClick={() => navigate(-1)}>← Back</button>
    </div>
  );
};
