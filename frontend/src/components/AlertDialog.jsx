import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import React from "react";
import "../styles/alert-dialog.css";

const TONE_PREFIX = {
  info: "// SYSTEM NOTICE",
  warning: "// CAUTION",
  danger: "// ACCESS INTERRUPTED",
};

export function AlertDialog({
  open,
  title = "System Notice",
  message = "",
  onClose = () => {},
  actionLabel = "Acknowledge",
  tone = "info",
}) {
  const safeTone = TONE_PREFIX[tone] ? tone : "info";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      className={`cyber-alert-dialog cyber-alert-dialog-${safeTone}`}
      PaperProps={{ className: "cyber-alert-paper" }}
    >
      <DialogTitle id="alert-dialog-title" className="cyber-alert-title">
        <span>{TONE_PREFIX[safeTone]}</span>
        {title}
      </DialogTitle>
      <DialogContent className="cyber-alert-content">
        <DialogContentText id="alert-dialog-description" className="cyber-alert-message">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions className="cyber-alert-actions">
        <Button type="button" onClick={onClose} autoFocus>
          {actionLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
