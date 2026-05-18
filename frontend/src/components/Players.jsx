import { useMediaQuery } from "@mui/material";
import "../styles/players.css";
import React from "react";

export const Players = ({ players, you, totalDeclarations, stage, blockAnimations }) => {
  const isMobile = useMediaQuery("(max-width:600px)");
  const radiusFactor = isMobile ? 0.4 : 0.55;
  const playerCount = players.length;
  const radius = 350 + (playerCount - 2) * 10;
  const declarationsMap = Object.fromEntries(totalDeclarations);

  return (
    <div
      className="players-circle"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        marginTop: `${-270 + playerCount * 100 - (playerCount - 3) * 75 - (playerCount === 2 ? 100 : 0)}px`,
        marginBottom: `${playerCount * 20}px`,
      }}
    >
      {players.map((player, index) => {
        const { name, hp } = player;

        let angleRad = (2 * Math.PI * index) / playerCount;
        if (playerCount > 2) angleRad += Math.PI / 6;

        const x = radius * radiusFactor * Math.cos(angleRad);
        const y = radius * radiusFactor * Math.sin(angleRad);

        const className = [
          "player-tile",
          name === you ? "you" : "other",
          stage === "execution" && "dec",
          hp <= 0 && "eliminated",
        ].filter(Boolean).join(" ");

        return (
          <div
            key={name}
            className="player-wrapper"
            style={{ position: "absolute", left: "50%", top: "50%" }}
          >
            <div
              className={`${className} fade-in`}
              style={{
                transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
              }}
            >
              {blockAnimations?.[name] && (
                <div className={`animation-pulse animation-${blockAnimations[name]}`} />
              )}
              <div style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.68rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}>
                {name}
              </div>
              <div className="healthbar">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className={`hp-segment ${i < hp ? "filled" : "empty"}`} />
                ))}
              </div>
              {stage === "execution" && declarationsMap[name] && (
                <div className="player-declarations">
                  {declarationsMap[name].map((a, i) => (
                    <div key={i} style={{ color: "var(--text-muted)" }}>&gt; {a}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};