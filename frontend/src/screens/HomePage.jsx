import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Box, Button, Stack, Fade } from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import React from "react";
import { GameInfoModal } from "../components/GameInfoModal";

/* Reusable cyber button sx presets */
const cyberBase = {
  fontFamily: "'Orbitron', sans-serif",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  borderRadius: "2px",
  fontSize: "0.78rem",
  py: 1.3,
  clipPath: "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
  transition: "all 0.15s ease",
};

const primaryBtn = {
  ...cyberBase,
  background: "transparent",
  border: "1px solid rgba(0,255,136,0.6)",
  color: "#00ff88",
  "&:hover": {
    background: "rgba(0,255,136,0.1)",
    borderColor: "#00ff88",
    boxShadow: "0 0 16px rgba(0,255,136,0.25)",
    color: "#e8fff2",
  },
};

const dangerBtn = {
  ...cyberBase,
  background: "transparent",
  border: "1px solid rgba(255,51,85,0.5)",
  color: "#ff3355",
  "&:hover": {
    background: "rgba(255,51,85,0.08)",
    borderColor: "#ff3355",
    boxShadow: "0 0 14px rgba(255,51,85,0.2)",
    color: "#ff6680",
  },
};

const accentBtn = {
  ...cyberBase,
  background: "linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,212,255,0.1))",
  border: "1px solid rgba(0,255,136,0.7)",
  color: "#00ff88",
  fontWeight: 700,
  "&:hover": {
    background: "linear-gradient(135deg, rgba(0,255,136,0.25), rgba(0,212,255,0.18))",
    borderColor: "#00ff88",
    boxShadow: "0 0 20px rgba(0,255,136,0.3), 0 0 40px rgba(0,255,136,0.1)",
    color: "#e8fff2",
  },
};

export const HomePage = ({ socket, name, room, setRoom }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [onlineCount, setOnlineCount] = useState(null);
  const [tick, setTick] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (!socket) return;
    socket.on("online-players", setOnlineCount);
    return () => socket.off("online-players", setOnlineCount);
  }, [socket]);


  useEffect(() => {
    if (!socket) return;

    const handleResumeSuccess = (r, meta = {}) => {
      if (meta?.participantToken) localStorage.setItem("participantToken", meta.participantToken);
      localStorage.setItem("room", r);
      setRoom?.(r);
      navigate(meta?.started ? `/play/${r}` : `/lobby/${r}`, {
        state: { spectator: Boolean(meta?.spectator), reconnected: Boolean(meta?.reconnected) },
      });
    };

    const handleResumeFailed = (reason) => {
      if (reason === 'ended') {
        localStorage.removeItem('participantToken');
        localStorage.removeItem('room');
        setRoom?.('');
        navigate('/');
        return;
      }
      navigate("/join");
    };

    socket.on("resume-success", handleResumeSuccess);
    socket.on("resume-failed", handleResumeFailed);
    return () => {
      socket.off("resume-success", handleResumeSuccess);
      socket.off("resume-failed", handleResumeFailed);
    };
  }, [socket, navigate, setRoom]);

  const joinOrResume = () => {
    const savedName = name || localStorage.getItem("name") || "";
    const savedRoom = room || localStorage.getItem("room") || "";
    const participantToken = localStorage.getItem("participantToken") || "";

    if (socket && savedName && savedRoom && participantToken) {
      socket.emit("resume-session", { room: savedRoom, playerName: savedName, participantToken });
      return;
    }

    navigate("/join");
  };

  /* blinking cursor */
  useEffect(() => {
    const t = setInterval(() => setTick(v => !v), 530);
    return () => clearInterval(t);
  }, []);

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      px={2}
      className="home-page themed-screen"
      sx={{ background: "var(--backdrop-background, var(--bg))", position: "relative", overflow: "hidden" }}
    >
      {/* Background grid lines */}
      <Box sx={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "var(--backdrop-image)",
        backgroundSize: "var(--backdrop-size)",
        backgroundPosition: "var(--backdrop-position)",
        backgroundRepeat: "var(--backdrop-repeat)",
      }} />

      <Fade in timeout={600}>
        <Box className="home-brand-stack" mb={6} sx={{ position: "relative", zIndex: 1 }}>
          {/* Top label */}
          <Box sx={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.7rem",
            letterSpacing: "0.3em",
            color: "var(--text-muted)",
            mb: 1.5,
            textTransform: "uppercase",
          }}>
            &gt; INITIALIZING SYSTEM_
          </Box>

          {/* Main title */}
          <Box className="home-title" sx={{
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 900,
            fontSize: "clamp(2.4rem, 8vw, 5rem)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#00ff88",
            textShadow: "0 0 20px rgba(0,255,136,0.5), 0 0 60px rgba(0,255,136,0.2)",
            animation: "flicker 8s infinite",
            lineHeight: 1,
          }}>
            INTRUSION
          </Box>

          {/* Subtitle */}
          <Box sx={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.8rem",
            letterSpacing: "0.2em",
            color: "var(--text-muted)",
            mt: 1.5,
            textTransform: "uppercase",
          }}>
            a social deduction cybersecurity game
            <Box component="span" sx={{
              ml: 0.5,
              opacity: tick ? 1 : 0,
              color: "var(--green)",
              transition: "opacity 0.05s",
            }}>█</Box>
          </Box>

          {/* Divider */}
          <Box sx={{
            mt: 2,
            mx: "auto",
            width: "min(340px, 80vw)",
            height: "1px",
            background: "linear-gradient(90deg, transparent, var(--green), transparent)",
            boxShadow: "0 0 8px rgba(0,255,136,0.4)",
          }} />
        </Box>
      </Fade>

      <Fade in timeout={900}>
        <Stack className="home-menu-panel" spacing={1.5} width="100%" maxWidth="300px" alignItems="center" sx={{ position: "relative", zIndex: 1 }}>
          {step === 1 ? (
            <>
              <Button variant="outlined" fullWidth sx={accentBtn} onClick={() => setStep(2)}>
                Start Project
              </Button>
              <Button variant="outlined" fullWidth sx={primaryBtn} onClick={() => navigate("/card-list")}>
                Card Library
              </Button>
              <Button variant="outlined" fullWidth sx={primaryBtn} onClick={() => setInfoOpen(true)}>
                Rules and Lore
              </Button>
              <Button variant="outlined" fullWidth sx={primaryBtn} onClick={() => navigate("/about")}>
                About Project
              </Button>
              <Button variant="outlined" fullWidth sx={primaryBtn} onClick={() => navigate("/settings")}>
                Settings
              </Button>
            </>
          ) : (
            <>
              <Button variant="outlined" fullWidth sx={accentBtn} onClick={() => navigate("/create")}>
                Create Room
              </Button>
              <Button variant="outlined" fullWidth sx={accentBtn} onClick={joinOrResume}>
                Join / Resume Room
              </Button>
              <Button variant="outlined" fullWidth sx={dangerBtn} onClick={() => setStep(1)}>
                ← Back
              </Button>
            </>
          )}
        </Stack>
      </Fade>

      {/* Online count */}
      {onlineCount && (
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          sx={{ position: "absolute", bottom: 56, zIndex: 1 }}
        >
          <FiberManualRecordIcon sx={{ color: "#00ff88", fontSize: "10px", animation: "pulse-green 2s infinite" }} />
          <Box sx={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.75rem",
            letterSpacing: "0.12em",
            color: "var(--text-muted)",
          }}>
            {onlineCount} player{onlineCount !== 1 ? "s" : ""} online
          </Box>
        </Box>
      )}

      <Box sx={{
        position: "absolute", bottom: 16,
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: "0.6rem",
        letterSpacing: "0.18em",
        color: "var(--text-dim)",
        zIndex: 1,
      }}>
        v1.0.0 // INTRUSION BUILD
      </Box>

      <GameInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </Box>
  );
};