import {
  Box, Button, CircularProgress, Stack, TextField,
} from "@mui/material";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import React from "react"

export const EnterDetails = ({ socket, name, setName, room, setRoom, creating }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const pendingSpectatorRef = useRef(false);

  const connectSocket = (e, asSpectator = false) => {
    e.preventDefault();
    if (!socket || !name.trim()) return;
    pendingSpectatorRef.current = Boolean(asSpectator);
    if (name.length > 10) {
      alert("Handle must be 10 characters or fewer.");
      return;
    }
    if (creating) {
      setRoom(socket.id);
      socket.emit("create-room", name);
    } else {
      socket.emit("check-room", room);
    }
    setLoading(true);
  };

  useEffect(() => {
    if (!socket) return;
    const handleRoomExists     = () => socket.emit("join-room", room, name, { spectator: pendingSpectatorRef.current, participantToken: localStorage.getItem("participantToken") || "" });
    const handleJoinSuccess    = (r, meta = {}) => {
      if (meta?.participantToken) localStorage.setItem("participantToken", meta.participantToken);
      setRoom(r);
      setLoading(false);
      if (meta?.started) {
        navigate(`/play/${r}`, { state: { spectator: Boolean(meta?.spectator), reconnected: Boolean(meta?.reconnected) } });
      } else {
        navigate(`/lobby/${r}`, { state: { creating: false, spectator: Boolean(meta?.spectator), reconnected: Boolean(meta?.reconnected) } });
      }
    };
    const handleRoomCreated    = (r, meta = {}) => { if (meta?.participantToken) localStorage.setItem("participantToken", meta.participantToken); setRoom(r); navigate(`/lobby/${r}`, { state: { creating: true } }); setLoading(false); };
    const handleRoomNotFound   = () => { alert("Room not found. Check the room code."); setRoom(""); setLoading(false); };
    const handleDuplicateName  = () => { alert("That handle is already connected. If this was you, Join / Resume Room from the home page or wait a moment and try again."); navigate("/join"); setName(""); setLoading(false); };
    const handleFull           = () => { alert("Player capacity reached. You can still join as a spectator."); setRoom(""); setLoading(false); };
    const handleGameEnded      = (message) => { alert(message || "That simulation has already ended. Return to the room lobby to start another one."); localStorage.removeItem("participantToken"); setLoading(false); navigate("/"); };

    socket.on("room-exists",          handleRoomExists);
    socket.on("join-success",         handleJoinSuccess);
    socket.on("room-created",         handleRoomCreated);
    socket.on("room-not-found",       handleRoomNotFound);
    socket.on("duplicate-name-error", handleDuplicateName);
    socket.on("full-error",           handleFull);
    socket.on("game-ended-error",     handleGameEnded);
    return () => {
      socket.off("room-exists",          handleRoomExists);
      socket.off("join-success",         handleJoinSuccess);
      socket.off("room-created",         handleRoomCreated);
      socket.off("room-not-found",       handleRoomNotFound);
      socket.off("duplicate-name-error", handleDuplicateName);
      socket.off("full-error",           handleFull);
      socket.off("game-ended-error",     handleGameEnded);
    };
  }, [socket, room, name, navigate, setRoom, setName]);

  const fieldSx = {
    "& .MuiInput-root": {
      color: "#c8e6d0",
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: "1rem",
      letterSpacing: "0.08em",
    },
    "& .MuiInput-underline:before":       { borderBottomColor: "rgba(0,255,136,0.2)" },
    "& .MuiInput-underline:hover:before": { borderBottomColor: "rgba(0,255,136,0.5)" },
    "& .MuiInput-underline:after":        { borderBottomColor: "#00ff88" },
    "& .MuiInputLabel-root":              { color: "var(--text-muted)", fontFamily: "'Share Tech Mono', monospace", fontSize: "0.85rem", letterSpacing: "0.1em" },
    "& .MuiInputLabel-root.Mui-focused":  { color: "#00ff88" },
  };

  const cyberBase = {
    fontFamily: "'Orbitron', sans-serif",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    borderRadius: "2px",
    fontSize: "0.75rem",
    clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)",
    transition: "all 0.15s",
  };

  return (
    <Box
      display="flex" flexDirection="column" alignItems="center"
      justifyContent="center" minHeight="100vh" px={2}
      sx={{
        background: "var(--backdrop-background, var(--bg))",
        backgroundImage: "var(--backdrop-image)",
        backgroundSize: "var(--backdrop-size)",
        backgroundPosition: "var(--backdrop-position)",
        backgroundRepeat: "var(--backdrop-repeat)",
      }}
    >
      {/* Title */}
      <Box sx={{
        fontFamily: "'Orbitron', sans-serif",
        fontWeight: 800,
        fontSize: "1.4rem",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "#00ff88",
        textShadow: "0 0 12px rgba(0,255,136,0.4)",
        mb: 4,
      }}>
        {creating ? "// CREATE ROOM" : "// JOIN ROOM"}
      </Box>

      {loading && (
        <Stack alignItems="center" spacing={1.5} mb={3}>
          <CircularProgress size={28} sx={{ color: "#00ff88" }} />
          <Box sx={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "0.8rem", color: "var(--text-muted)", letterSpacing: "0.08em" }}>
            Contacting game server...<br />
            <Box component="span" sx={{ color: "var(--text-dim)" }}>may take ~30s on cold start ☕</Box>
          </Box>
        </Stack>
      )}

      {/* Panel */}
      <Box
        component="form"
        onSubmit={connectSocket}
        maxWidth="380px" width="100%"
        sx={{
          background: "var(--surface)",
          border: "1px solid rgba(0,255,136,0.25)",
          borderRadius: "2px",
          p: 4,
          boxShadow: "0 0 40px rgba(0,255,136,0.06), 0 0 80px rgba(0,0,0,0.7)",
          position: "relative",
          /* bracket corners */
          "&::before": {
            content: '""', position: "absolute",
            top: -1, left: -1, width: 16, height: 16,
            borderTop: "2px solid #00ff88", borderLeft: "2px solid #00ff88",
          },
          "&::after": {
            content: '""', position: "absolute",
            bottom: -1, right: -1, width: 16, height: 16,
            borderBottom: "2px solid #00ff88", borderRight: "2px solid #00ff88",
          },
        }}
      >
        <Stack spacing={3.5}>
          {!creating && (
            <TextField variant="standard" label="ROOM CODE" value={room}
              onChange={(e) => setRoom(e.target.value)}
              fullWidth inputProps={{ maxLength: 6 }} sx={fieldSx}
            />
          )}
          <TextField variant="standard" label="PLAYER HANDLE" value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth inputProps={{ maxLength: 10 }} sx={fieldSx}
          />

          <Stack direction="row" spacing={2} justifyContent="center" pt={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              onClick={() => navigate("/")}
              sx={{
                ...cyberBase, px: 3, py: 1,
                border: "1px solid rgba(255,51,85,0.4)",
                color: "#ff3355",
                "&:hover": { border: "1px solid #ff3355", background: "rgba(255,51,85,0.08)", boxShadow: "0 0 12px rgba(255,51,85,0.2)" },
              }}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="outlined"
              sx={{
                ...cyberBase, px: 3, py: 1,
                border: "1px solid rgba(0,255,136,0.6)",
                color: "#00ff88",
                fontWeight: 700,
                "&:hover": { border: "1px solid #00ff88", background: "rgba(0,255,136,0.1)", boxShadow: "0 0 16px rgba(0,255,136,0.25)", color: "#e8fff2" },
              }}
            >
              {creating ? "Create Room" : "Join as Player"}
            </Button>
            {!creating && (
              <Button
                type="button"
                variant="outlined"
                onClick={(event) => connectSocket(event, true)}
                sx={{
                  ...cyberBase, px: 3, py: 1,
                  border: "1px solid rgba(0,212,255,0.45)",
                  color: "#00d4ff",
                  "&:hover": { border: "1px solid #00d4ff", background: "rgba(0,212,255,0.08)", boxShadow: "0 0 14px rgba(0,212,255,0.2)" },
                }}
              >
                Join as Spectator
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
};