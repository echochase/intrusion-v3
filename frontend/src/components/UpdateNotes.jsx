import { Box, Typography, Paper, Stack, Divider } from "@mui/material";
import { useNavigate } from "react-router-dom";
import React from "react";

const updates = [
  {
    version: "v0.2.0",
    date: "July 16, 2025",
    notes: [
      "Yes, we jumped from v0.1.1 to v0.2.0 because this was a pretty big update.",
      "Enabled spectator functionality for users that want to stalk a game that's already started.",
      "Added a player count so we all know how many people are playing.",
      "Some changes to the UI so that it looks actually decent; still probably needs further tweaks though.",
      "Fixed the animations to prevent them getting blocked by the browser.",
      "On that note: I haven't actually added the skip animations toggle yet, it remains a dummy for now.",
      "Added a few defences to make sure the site isn't <b>XSS Vulnerable (TM)</b>. Please let me know if something does fail though!",
    ],
  },
  {
    version: "v0.1.1",
    date: "July 15, 2025",
    notes: [
      "More UI revamps just to feel better about doing some work.",
      "Slight tweaks to the power-up system to favour cruelty against heals.",
    ],
  },
  {
    version: "v0.1.0",
    date: "July 14, 2025",
    notes: [
      "Added this Update Notes section so I can keep better track of my own work 😅😅😅",
      "This is the MVP release; previous versions were deployed but won't be recorded here as they're considered incomplete.",
      "In 1v1 games, selecting an attack will automatically aim it at your opponent.",
      "Reworded some in-game prompts to feel a little more natural and welcoming.",
      "Massive revamps to the UI so that it looks actually decent."
    ],
  },
];

export const UpdateNotes = () => {
  const navigate = useNavigate();
  return (
    <Box>
      <Typography
        variant="h4"
        fontWeight={600}
        gutterBottom
      >
        Update Notes 📜
      </Typography>

      <Stack spacing={4}>
        {updates.map((update, idx) => (
          <Paper
            key={idx}
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 3,
              backgroundColor: (theme) =>
                theme.palette.mode === "dark" ? "#1e1e1e" : "#f9f9f9",
              textAlign: "left",
            }}
          >
            <Typography variant="h6" fontWeight={600}>
              {update.version} —{" "}
              <Typography
                component="span"
                color="text.secondary"
              >
                {update.date}
              </Typography>
            </Typography>
            <Divider sx={{ my: 1.5 }} />
            <Stack spacing={1.5}>
              {update.notes.map((note, i) => (
                <Typography
                  key={i}
                  sx={{ lineHeight: 1.6 }}
                >
                  {note}
                </Typography>
              ))}
            </Stack>
          </Paper>
        ))}
      </Stack>
      <button className="return-to-menu" onClick={() => navigate("/")}>
        Back to Home
      </button>
    </Box>
  );
};
