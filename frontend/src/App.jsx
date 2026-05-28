import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./styles/common.css";
import "./App.css";
import { HomePage } from "./screens/HomePage";
import { EnterDetails } from "./screens/EnterDetails";
import { Lobby } from "./screens/Lobby";
import { Game } from "./screens/Game";
import { io } from "socket.io-client";
import { useEffect, useMemo, useState } from "react";
import { Settings } from "./components/Settings";
import { About } from "./components/About";
import { UpdateNotes } from "./components/UpdateNotes";
import { CardList } from "./screens/CardList";
import React from "react";

const THEME_STORAGE_KEY = "zeroDayTheme";
const BACKGROUND_STORAGE_KEY = "zeroDayBackground";
const LEGACY_BACKDROP_STORAGE_KEY = "zeroDayBackdrop";
const VALID_THEMES = new Set(["default", "futuristic", "simple"]);
const VALID_BACKGROUNDS = new Set(["default", "grand", "pencil"]);

const backgroundModules = import.meta.glob("/src/assets/background/**/*.{png,jpg,jpeg,webp,avif}", {
  eager: true,
  import: "default",
});

const backgroundAssets = Object.entries(backgroundModules).map(([path, src]) => {
  const parts = path.split("/");
  const fileKey = parts.at(-1).replace(/\.[^/.]+$/, "").toLowerCase();
  const folderKey = parts.at(-2)?.toLowerCase();
  const key = VALID_BACKGROUNDS.has(fileKey) ? fileKey : folderKey;
  return { key, src };
}).filter((asset) => VALID_BACKGROUNDS.has(asset.key));

function backgroundAssetFor(background) {
  return backgroundAssets.find((asset) => asset.key === background)?.src || null;
}

function savedTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY)
    || localStorage.getItem(LEGACY_BACKDROP_STORAGE_KEY)
    || "default";
  return VALID_THEMES.has(saved) ? saved : "default";
}

function savedBackground() {
  const saved = localStorage.getItem(BACKGROUND_STORAGE_KEY) || "default";
  return VALID_BACKGROUNDS.has(saved) ? saved : "default";
}

export default function App() {
  const [socket, setSocket] = useState(null);
  const [name, setName] = useState(localStorage.getItem("name") || "");
  const [room, setRoom] = useState(localStorage.getItem("room") || "");
  const [theme, setTheme] = useState(savedTheme);
  const [background, setBackground] = useState(savedBackground);

  const backend = useMemo(() => import.meta.env.VITE_BACKEND_URL, []);

  useEffect(() => {
    const newSocket = io(backend);
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [backend]);

  useEffect(() => { localStorage.setItem("name", name); }, [name]);
  useEffect(() => { localStorage.setItem("room", room); }, [room]);
  useEffect(() => {
    const safeTheme = VALID_THEMES.has(theme) ? theme : "default";
    localStorage.setItem(THEME_STORAGE_KEY, safeTheme);
    document.documentElement.dataset.theme = safeTheme;
    delete document.documentElement.dataset.backdrop;
  }, [theme]);
  useEffect(() => {
    const safeBackground = VALID_BACKGROUNDS.has(background) ? background : "default";
    const asset = backgroundAssetFor(safeBackground);
    localStorage.setItem(BACKGROUND_STORAGE_KEY, safeBackground);
    document.documentElement.dataset.background = safeBackground;

    if (asset) {
      document.documentElement.style.setProperty("--active-background-image", `url("${asset}")`);
    } else {
      document.documentElement.style.removeProperty("--active-background-image");
    }
  }, [background]);

  const sharedProps = { socket, name, setName, room, setRoom };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"               element={<HomePage socket={socket} name={name} room={room} setRoom={setRoom} />} />
        <Route path="/create"         element={<EnterDetails {...sharedProps} creating={true} />} />
        <Route path="/join"           element={<EnterDetails {...sharedProps} creating={false} />} />
        <Route path="/lobby/:roomCode" element={<Lobby {...sharedProps} />} />
        <Route path="/play/:roomCode"  element={<Game {...sharedProps} />} />
        <Route path="/settings"       element={<Settings theme={theme} setTheme={setTheme} background={background} setBackground={setBackground} />} />
        <Route path="/about"          element={<About />} />
        <Route path="/card-list"      element={<CardList />} />
        <Route path="/update-notes"   element={<UpdateNotes />} />
      </Routes>
    </BrowserRouter>
  );
}
