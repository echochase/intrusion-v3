import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container, IconButton, Tooltip, Avatar,
  Box, Button, Stack,
} from "@mui/material";
import Person from "@mui/icons-material/Person";
import KickIcon from "@mui/icons-material/Close";
import CheckCircle from "@mui/icons-material/CheckCircle";
import React from "react";
import { AlertDialog } from "../components/AlertDialog";

const cyberBase = {
  fontFamily: "'Orbitron', sans-serif",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  borderRadius: "2px",
  fontSize: "0.72rem",
  clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)",
  transition: "all 0.15s",
};

export const Lobby = ({ socket, name, room, setRoom }) => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [spectators, setSpectators] = useState([]);
  const [ready, setReady] = useState(false);
  const [kicked, setKicked] = useState(false);
  const [notice, setNotice] = useState(null);

  const showNotice = useCallback((details) => setNotice(details), []);
  const closeNotice = () => {
    const afterClose = notice?.afterClose;
    setNotice(null);
    afterClose?.();
  };

  const ownerName = players[0]?.name; // first player = room creator
  const isLeader = name === ownerName;
  const isSpectator = spectators.some((s) => s.name === name) && !players.some((p) => p.name === name);
  const connectedPlayerCount = players.filter((p) => p.connected !== false).length;

  const leaveLobby   = () => { socket.emit("leave-room", roomCode, name); navigate("/"); };
  const handleKick   = (n) => socket.emit("kick-player", roomCode, name, n);
  const addBot       = () => socket.emit("add-bot", roomCode, name);
  const startGame    = () => {
    if (connectedPlayerCount < 4) {
      showNotice({
        title: "Not enough players",
        message: "Need at least 4 connected players before the simulation can start.",
        tone: "warning",
      });
      return;
    }
    if (connectedPlayerCount > 5) {
      showNotice({
        title: "Room is full",
        message: "Max 5 players per room.",
        tone: "danger",
      });
      return;
    }
    socket.emit("start-game", roomCode, name);
  };
  const signalReady   = () => { socket.emit("player-ready",   roomCode, name); setReady(true); };
  const signalUnready = () => { socket.emit("player-unready", roomCode, name); setReady(false); };

  useEffect(() => {
    if (!socket || !name) { navigate("/"); return; }
    if (!room) setRoom(roomCode);

    const updatePlayers = (list, spectatorList = []) => {
      setPlayers(list || []);
      setSpectators(spectatorList || []);
      const knownPlayer = (list || []).some((p) => p.name === name);
      const knownSpectator = (spectatorList || []).some((p) => p.name === name);
      if (!knownPlayer && !knownSpectator) setKicked(true);
    };

    socket.emit("get-players", roomCode);
    socket.on("players-update", updatePlayers);
    socket.on("new-player",     updatePlayers);
    const onGameError = (message) => showNotice({
      title: "Unable to start",
      message: message || "Unable to start game.",
      tone: "danger",
    });

    socket.on("start-confirm",  () => navigate(`/play/${roomCode}`));
    socket.on("game-error", onGameError);

    return () => {
      socket.off("players-update", updatePlayers);
      socket.off("new-player",     updatePlayers);
      socket.off("start-confirm");
      socket.off("game-error", onGameError);
    };
  }, [socket, roomCode, name, navigate, room, setRoom, showNotice]);

  const mono = { fontFamily: "'Share Tech Mono', monospace" };
  const orb  = { fontFamily: "'Orbitron', sans-serif" };

  return (
    <Box className="lobby-page themed-screen" sx={{
      minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      py: 4, background: "var(--backdrop-background, var(--bg))",
      backgroundImage: "var(--backdrop-image)",
      backgroundSize: "var(--backdrop-size)",
      backgroundPosition: "var(--backdrop-position)",
      backgroundRepeat: "var(--backdrop-repeat)",
    }}>
      <Container maxWidth="sm">
        <Box className="lobby-panel themed-panel" sx={{
          background: "var(--surface)",
          border: "1px solid rgba(0,255,136,0.2)",
          borderRadius: "2px",
          p: 4,
          boxShadow: "0 0 40px rgba(0,255,136,0.06), 0 0 80px rgba(0,0,0,0.7)",
          position: "relative",
          "&::before": { content:'""', position:"absolute", top:-1, left:-1, width:18, height:18, borderTop:"2px solid #00ff88", borderLeft:"2px solid #00ff88" },
          "&::after":  { content:'""', position:"absolute", bottom:-1, right:-1, width:18, height:18, borderBottom:"2px solid #00ff88", borderRight:"2px solid #00ff88" },
        }}>

          {/* Header */}
          <Box sx={{ ...orb, fontWeight:900, fontSize:"1.3rem", letterSpacing:"0.18em", textTransform:"uppercase", color:"#00ff88", textShadow:"0 0 14px rgba(0,255,136,0.4)", mb:0.5 }}>
            INTRUSION ROOM
          </Box>
          <Box sx={{ width:60, height:1, background:"linear-gradient(90deg, transparent, var(--green), transparent)", mx:"auto", mb:2 }} />

          {/* Room code */}
          <Box sx={{ ...mono, fontSize:"0.8rem", letterSpacing:"0.1em", color:"var(--text-muted)", mb:3 }}>
            ROOM CODE :{" "}
            <Box component="span" sx={{ ...orb, color:"#00ff88", fontSize:"0.9rem", letterSpacing:"0.22em", fontWeight:700 }}>
              {roomCode}
            </Box>
          </Box>

          {/* Section label */}
          <Box sx={{ ...mono, fontSize:"0.65rem", letterSpacing:"0.25em", color:"var(--text-muted)", textTransform:"uppercase", textAlign:"left", mb:1.5 }}>
            &gt; PROJECT TEAM ({connectedPlayerCount}/5)
          </Box>

          {/* Player list */}
          <Stack spacing={0.8}>
            {players.map((player) => {
              const isOwner = player.name === ownerName;
              const isYou   = player.name === name;
              const isConnected = player.connected !== false;

              return (
                <Box key={player.name} sx={{
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                  px: 2, py: 1.2,
                  background: isYou ? "rgba(0,255,136,0.05)" : "rgba(255,255,255,0.02)",
                  border: isYou ? "1px solid rgba(0,255,136,0.3)" : "1px solid rgba(0,255,136,0.08)",
                  borderRadius:"2px",
                  transition:"all 0.15s",
                  opacity: isConnected ? 1 : 0.52,
                }}>
                  <Box sx={{ display:"flex", alignItems:"center", gap:1.5, position:"relative" }}>
                    {(player.ready || player.isBot) && player.connected !== false && (
                      <CheckCircle sx={{
                        position:"absolute", top:-4, left:-2,
                        color:"#00ff88", backgroundColor:"var(--surface)",
                        borderRadius:"50%", fontSize:"15px",
                        boxShadow:"0 0 6px rgba(0,255,136,0.6)",
                      }} />
                    )}
                    <Avatar sx={{
                      width:32, height:32,
                      background: isYou ? "linear-gradient(135deg, rgba(0,255,136,0.3), rgba(0,212,255,0.2))" : "rgba(255,255,255,0.05)",
                      border: isOwner ? "1px solid rgba(0,255,136,0.6)" : "1px solid rgba(255,255,255,0.08)",
                    }}>
                      <Person sx={{ fontSize:16, color: isYou ? "#00ff88" : "var(--text-muted)" }} />
                    </Avatar>

                    <Box sx={{ textAlign:"left" }}>
                      <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
                        {/* [HOST] badge for owner */}
                        {isOwner && (
                          <Box sx={{
                            ...mono,
                            fontSize:"0.6rem",
                            letterSpacing:"0.1em",
                            color:"#00ff88",
                            background:"rgba(0,255,136,0.1)",
                            border:"1px solid rgba(0,255,136,0.4)",
                            borderRadius:"2px",
                            px:0.7, py:0.1,
                            textShadow:"0 0 6px rgba(0,255,136,0.6)",
                          }}>
                            [HOST]
                          </Box>
                        )}
                        <Box sx={{
                          ...orb,
                          fontSize:"0.78rem",
                          letterSpacing:"0.06em",
                          color: isOwner ? "#00ff88" : isYou ? "#c8e6d0" : "var(--text-muted)",
                          fontWeight: isOwner ? 700 : 400,
                        }}>
                          {player.name}
                        </Box>
                        {isYou && (
                          <Box sx={{ ...mono, fontSize:"0.6rem", color:"var(--text-muted)", fontStyle:"italic" }}>
                            (you)
                          </Box>
                        )}
                        {player.isBot && (
                          <Box sx={{ ...mono, fontSize:"0.58rem", color:"#00d4ff", letterSpacing:"0.08em" }}>
                            [bot]
                          </Box>
                        )}
                        {!isConnected && (
                          <Box sx={{ ...mono, fontSize:"0.58rem", color:"#ffaa00", letterSpacing:"0.08em" }}>
                            [offline]
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>

                  {/* Kick button — only for owner, not self */}
                  {isLeader && player.name !== name && (
                    <Tooltip title={`Remove ${player.name}`}>
                      <IconButton size="small" onClick={() => handleKick(player.name)}
                        sx={{ color:"var(--text-dim)", "&:hover":{ color:"#ff3355", background:"rgba(255,51,85,0.1)" } }}>
                        <KickIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              );
            })}
          </Stack>

          {spectators.length > 0 && (
            <>
              <Box sx={{ ...mono, fontSize:"0.65rem", letterSpacing:"0.25em", color:"var(--text-muted)", textTransform:"uppercase", textAlign:"left", mt:3, mb:1.5 }}>
                &gt; OBSERVERS ({spectators.filter((s) => s.connected !== false).length})
              </Box>
              <Stack spacing={0.8}>
                {spectators.map((spectator) => {
                  const isYou = spectator.name === name;
                  const isConnected = spectator.connected !== false;
                  return (
                    <Box key={spectator.name} sx={{
                      display:"flex", alignItems:"center", justifyContent:"space-between",
                      px: 2, py: 1,
                      background: isYou ? "rgba(0,212,255,0.06)" : "rgba(255,255,255,0.02)",
                      border: isYou ? "1px solid rgba(0,212,255,0.3)" : "1px solid rgba(0,212,255,0.1)",
                      borderRadius:"2px",
                      opacity: isConnected ? 1 : 0.52,
                    }}>
                      <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
                        <Avatar sx={{ width:28, height:28, background:"rgba(0,212,255,0.08)", border:"1px solid rgba(0,212,255,0.2)" }}>
                          <Person sx={{ fontSize:15, color:"#00d4ff" }} />
                        </Avatar>
                        <Box sx={{ ...orb, fontSize:"0.75rem", color: isYou ? "#00d4ff" : "var(--text-muted)", letterSpacing:"0.06em" }}>
                          {spectator.name} {isYou ? <Box component="span" sx={{ ...mono, fontSize:"0.6rem", color:"var(--text-muted)" }}>(you)</Box> : null}
                        </Box>
                      </Box>
                      <Box sx={{ ...mono, fontSize:"0.6rem", color: isConnected ? "var(--text-muted)" : "#ffaa00", letterSpacing:"0.08em", textTransform:"uppercase" }}>
                        {isConnected ? "observing" : "offline"}
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            </>
          )}

          {/* Action buttons */}
          <Stack direction="row" spacing={2} justifyContent="center" mt={4}>
            {isLeader && !isSpectator && connectedPlayerCount < 5 && (
              <Button variant="outlined" onClick={addBot} sx={{
                ...cyberBase, px:3, py:1.1,
                border:"1px solid rgba(0,212,255,0.5)", color:"#00d4ff", fontWeight:700,
                "&:hover":{ border:"1px solid #00d4ff", background:"rgba(0,212,255,0.08)", boxShadow:"0 0 14px rgba(0,212,255,0.2)" },
              }}>
                Add Bot
              </Button>
            )}
            {isLeader && !isSpectator ? (
              <Button variant="outlined" onClick={startGame} sx={{
                ...cyberBase, px:3, py:1.1,
                border:"1px solid rgba(0,255,136,0.6)", color:"#00ff88", fontWeight:700,
                "&:hover":{ border:"1px solid #00ff88", background:"rgba(0,255,136,0.1)", boxShadow:"0 0 18px rgba(0,255,136,0.3)", color:"#e8fff2" },
              }}>
                Start Simulation
              </Button>
            ) : isSpectator ? (
              <Button variant="outlined" disabled sx={{
                ...cyberBase, px:3, py:1.1,
                border:"1px solid rgba(0,212,255,0.3)", color:"#00d4ff",
              }}>
                Observing
              </Button>
            ) : ready ? (
              <Button variant="outlined" onClick={signalUnready} sx={{
                ...cyberBase, px:3, py:1.1,
                border:"1px solid rgba(255,170,0,0.5)", color:"#ffaa00",
                "&:hover":{ border:"1px solid #ffaa00", background:"rgba(255,170,0,0.08)" },
              }}>
                Not Ready
              </Button>
            ) : (
              <Button variant="outlined" onClick={signalReady} sx={{
                ...cyberBase, px:3, py:1.1,
                border:"1px solid rgba(0,212,255,0.5)", color:"#00d4ff",
                "&:hover":{ border:"1px solid #00d4ff", background:"rgba(0,212,255,0.08)", boxShadow:"0 0 14px rgba(0,212,255,0.2)" },
              }}>
                Ready
              </Button>
            )}
            <Button variant="outlined" onClick={leaveLobby} sx={{
              ...cyberBase, px:3, py:1.1,
              border:"1px solid rgba(255,51,85,0.4)", color:"#ff3355",
              "&:hover":{ border:"1px solid #ff3355", background:"rgba(255,51,85,0.08)", boxShadow:"0 0 12px rgba(255,51,85,0.15)" },
            }}>
              Exit Room
            </Button>
          </Stack>
        </Box>
      </Container>

      <AlertDialog
        open={Boolean(notice)}
        title={notice?.title}
        message={notice?.message}
        tone={notice?.tone}
        onClose={closeNotice}
      />

      <AlertDialog
        open={kicked}
        title="Removed from room"
        message="You were removed from this room, or the room state changed unexpectedly."
        tone="danger"
        actionLabel="Return Home"
        onClose={() => navigate("/")}
      />
    </Box>
  );
};