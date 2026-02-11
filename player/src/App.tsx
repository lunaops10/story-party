import React, { useState, useEffect } from "react";
import { Client, Room } from "colyseus.js";

const SERVER_URL = (import.meta as any).env?.VITE_SERVER_URL || "ws://localhost:2567";

const AVATARS = ["🕵️", "🔍", "🗡️", "💀", "🎭", "🕯️", "🔮", "🐍", "🦊", "🎩", "👻", "🌙", "⚡", "🔥", "💎", "🃏"];

export default function App() {
  const [screen, setScreen] = useState<"join" | "game">("join");
  const [room, setRoom] = useState<Room | null>(null);
  const [roomCode, setRoomCode] = useState(() => {
    // Check URL for room code (from QR code)
    const match = window.location.pathname.match(/\/join\/([A-Z]{4})/);
    return match ? match[1] : "";
  });
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  // Game state
  const [phase, setPhase] = useState("lobby");
  const [isVIP, setIsVIP] = useState(false);
  const [choices, setChoices] = useState<any[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedFor, setVotedFor] = useState("");
  const [voteTimer, setVoteTimer] = useState(0);
  const [storyTitle, setStoryTitle] = useState("");
  const [storyId, setStoryId] = useState("");
  const [stories, setStories] = useState<any[]>([]);
  const [endingType, setEndingType] = useState("");
  const [endingTitle, setEndingTitle] = useState("");
  const [playerCount, setPlayerCount] = useState(0);

  // Request wake lock to prevent phone sleep
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await (navigator as any).wakeLock.request("screen");
        }
      } catch (e) {}
    };
    if (screen === "game") requestWakeLock();
    return () => { wakeLock?.release(); };
  }, [screen]);

  const joinRoom = async () => {
    if (!roomCode || !name) {
      setError(!roomCode ? "Enter a room code" : "Enter your name");
      return;
    }
    setJoining(true);
    setError("");

    try {
      const client = new Client(SERVER_URL);
      const room = await client.joinById(roomCode.toUpperCase(), { name, avatar });

      room.onStateChange((s: any) => {
        setPhase(s.phase);
        setVoteTimer(s.voteTimer);
        setStoryTitle(s.storyTitle);
        setStoryId(s.storyId);
        setEndingType(s.endingType);
        setEndingTitle(s.endingTitle);
        setPlayerCount(s.playerCount);

        // Get our player
        const me = s.players?.get(room.sessionId);
        if (me) {
          setIsVIP(me.isVIP);
          setHasVoted(me.hasVoted);
        }

        // Get choices
        setChoices(Array.from(s.choices?.values() || []).map((c: any) => ({
          id: c.id, emoji: c.emoji, label: c.label,
        })));
      });

      room.onMessage("story_list", (list: any[]) => {
        setStories(list);
      });

      room.onError((code, msg) => setError(`Error: ${msg}`));
      room.onLeave(() => {
        setScreen("join");
        setError("Disconnected");
      });

      setRoom(room);
      setScreen("game");
    } catch (err: any) {
      setError("Could not join room. Check the code and try again.");
    }
    setJoining(false);
  };

  const vote = (choiceId: string) => {
    if (hasVoted || !room) return;
    room.send("vote", { choiceId });
    setVotedFor(choiceId);
    // Vibrate on vote
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const startGame = (sid: string) => {
    room?.send("start_game", { storyId: sid });
  };

  const advance = () => {
    room?.send("advance", {});
  };

  const restart = () => {
    room?.send("restart", {});
    setHasVoted(false);
    setVotedFor("");
  };

  // Reset vote state when phase changes to voting
  useEffect(() => {
    if (phase === "voting") {
      setHasVoted(false);
      setVotedFor("");
    }
  }, [phase]);

  // ==========================================
  // JOIN SCREEN
  // ==========================================
  if (screen === "join") {
    return (
      <div style={s.joinScreen}>
        <div style={s.joinTitle}>🎬 Story Party</div>

        <div style={s.inputGroup}>
          <label style={s.label}>Room Code</label>
          <input
            style={s.input}
            type="text"
            maxLength={4}
            placeholder="ABCD"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
            autoFocus={!roomCode}
          />
        </div>

        <div style={s.inputGroup}>
          <label style={s.label}>Your Name</label>
          <input
            style={s.input}
            type="text"
            maxLength={20}
            placeholder="Enter your name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus={!!roomCode}
          />
        </div>

        <div style={s.inputGroup}>
          <label style={s.label}>Avatar</label>
          <div style={s.avatarGrid}>
            {AVATARS.map(a => (
              <button
                key={a}
                style={{
                  ...s.avatarBtn,
                  ...(avatar === a ? s.avatarSelected : {}),
                }}
                onClick={() => setAvatar(a)}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <button
          style={{ ...s.btn, ...s.btnPrimary, opacity: joining ? 0.6 : 1 }}
          onClick={joinRoom}
          disabled={joining}
        >
          {joining ? "Joining..." : "Join Game"}
        </button>

        {error && <div style={s.error}>{error}</div>}
      </div>
    );
  }

  // ==========================================
  // GAME SCREENS
  // ==========================================

  // LOBBY — VIP picks story
  if (phase === "lobby") {
    return (
      <div style={s.gameScreen}>
        <div style={s.phaseLabel}>LOBBY</div>
        <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{avatar} {name}</div>
        <div style={{ color: "#6b7280", marginBottom: "1.5rem" }}>{playerCount} player{playerCount !== 1 ? "s" : ""} connected</div>

        {isVIP ? (
          <>
            <div style={{ color: "#fbbf24", fontSize: "1rem", marginBottom: "1rem" }}>⭐ You're the VIP — pick a story!</div>
            {stories.map(st => (
              <button key={st.id} style={s.storyCard} onClick={() => startGame(st.id)}>
                <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{st.title}</div>
                <div style={{ fontSize: "0.85rem", color: "#a78bfa" }}>{st.genre} · ~{st.estimatedMinutes} min</div>
                <div style={{ fontSize: "0.85rem", color: "#9ca3af", marginTop: "0.25rem" }}>{st.description}</div>
              </button>
            ))}
          </>
        ) : (
          <div style={{ color: "#9ca3af", fontSize: "1.1rem", textAlign: "center" }}>
            Waiting for VIP to start the game...
          </div>
        )}
      </div>
    );
  }

  // INTRO
  if (phase === "intro") {
    return (
      <div style={s.gameScreen}>
        <div style={{ fontSize: "3rem" }}>🎬</div>
        <div style={{ fontSize: "1.5rem", fontWeight: "bold", marginTop: "1rem" }}>{storyTitle}</div>
        <div style={{ color: "#6b7280", marginTop: "1rem" }}>Look at the screen...</div>
      </div>
    );
  }

  // NARRATIVE — watch the screen, VIP can advance
  if (phase === "narrative") {
    return (
      <div style={s.gameScreen}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📺</div>
        <div style={{ fontSize: "1.3rem", color: "#c4b5fd", fontWeight: "bold" }}>Watch the screen</div>
        <div style={{ color: "#6b7280", marginTop: "0.5rem", fontSize: "0.9rem" }}>A choice is coming...</div>
        {isVIP && (
          <button style={{ ...s.btn, ...s.btnPrimary, marginTop: "2rem" }} onClick={advance}>
            Continue ▶
          </button>
        )}
      </div>
    );
  }

  // VOTING — big buttons!
  if (phase === "voting") {
    return (
      <div style={s.gameScreen}>
        {!hasVoted ? (
          <>
            <div style={{ color: "#fbbf24", fontSize: "1.2rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
              ⏳ VOTE! {voteTimer}s
            </div>
            <div style={s.voteButtons}>
              {choices.map(c => (
                <button key={c.id} style={s.voteBtn} onClick={() => vote(c.id)}>
                  <span style={{ fontSize: "2.5rem" }}>{c.emoji}</span>
                  <span style={{ fontSize: "1rem", marginTop: "0.5rem" }}>{c.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: "4rem", marginBottom: "0.5rem" }}>✅</div>
            <div style={{ fontSize: "1.3rem", fontWeight: "bold" }}>Vote cast!</div>
            <div style={{ color: "#6b7280", marginTop: "0.5rem" }}>
              Waiting for others... {voteTimer}s
            </div>
          </>
        )}
      </div>
    );
  }

  // VOTE RESULT — watch screen
  if (phase === "vote_result") {
    return (
      <div style={s.gameScreen}>
        <div style={{ fontSize: "3rem" }}>📊</div>
        <div style={{ fontSize: "1.3rem", fontWeight: "bold", marginTop: "0.5rem", color: "#c4b5fd" }}>Results are in!</div>
        <div style={{ color: "#6b7280", marginTop: "0.5rem" }}>Watch the screen...</div>
      </div>
    );
  }

  // ENDING
  if (phase === "ending") {
    const icons: Record<string, string> = { good: "🎯", bad: "💀", neutral: "🔍", secret: "🏆" };
    return (
      <div style={s.gameScreen}>
        <div style={{ fontSize: "4rem" }}>{icons[endingType] || "🎬"}</div>
        <div style={{ fontSize: "1.5rem", fontWeight: "bold", marginTop: "0.5rem" }}>{endingTitle}</div>
        <div style={{ color: "#a78bfa", marginTop: "0.5rem", textTransform: "capitalize" }}>{endingType} ending</div>
        {isVIP && (
          <button style={{ ...s.btn, ...s.btnPrimary, marginTop: "2rem" }} onClick={restart}>
            🔄 Play Again
          </button>
        )}
      </div>
    );
  }

  // Fallback
  return (
    <div style={s.gameScreen}>
      <div style={{ color: "#6b7280" }}>Phase: {phase}</div>
    </div>
  );
}

// ============================================
// STYLES
// ============================================
const s: Record<string, React.CSSProperties> = {
  joinScreen: {
    minHeight: "100dvh", display: "flex", flexDirection: "column",
    padding: "2rem 1.5rem", gap: "1.25rem",
    background: "linear-gradient(180deg, #0a0a1a, #1a0a2a)",
  },
  joinTitle: {
    fontSize: "2rem", fontWeight: "bold", textAlign: "center",
    marginBottom: "0.5rem",
  },
  inputGroup: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  label: { fontSize: "0.85rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em" },
  input: {
    padding: "0.9rem 1rem", fontSize: "1.3rem", borderRadius: "0.75rem",
    border: "1px solid rgba(168,85,247,0.3)", background: "rgba(255,255,255,0.05)",
    color: "#fff", outline: "none", fontFamily: "monospace", textAlign: "center",
    letterSpacing: "0.15em",
  },
  avatarGrid: {
    display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "0.4rem",
  },
  avatarBtn: {
    fontSize: "1.5rem", padding: "0.4rem", borderRadius: "0.5rem",
    border: "1px solid transparent", background: "rgba(255,255,255,0.05)",
    cursor: "pointer", transition: "all 0.15s",
  },
  avatarSelected: {
    border: "2px solid #a78bfa", background: "rgba(168,85,247,0.2)",
    transform: "scale(1.1)",
  },
  btn: {
    padding: "1rem", fontSize: "1.2rem", borderRadius: "0.75rem",
    border: "none", cursor: "pointer", fontWeight: "bold",
    transition: "all 0.15s", fontFamily: "system-ui, sans-serif",
  },
  btnPrimary: {
    background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
    color: "#fff",
  },
  error: {
    color: "#ef4444", textAlign: "center", fontSize: "0.95rem", padding: "0.5rem",
  },
  gameScreen: {
    minHeight: "100dvh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem",
    background: "linear-gradient(180deg, #0a0a1a, #1a0a2a)",
    textAlign: "center",
  },
  phaseLabel: {
    fontSize: "0.75rem", color: "#6b7280", letterSpacing: "0.2em",
    textTransform: "uppercase", marginBottom: "1rem",
  },
  storyCard: {
    width: "100%", padding: "1rem", marginBottom: "0.75rem",
    background: "rgba(255,255,255,0.05)", borderRadius: "0.75rem",
    border: "1px solid rgba(168,85,247,0.2)", textAlign: "left",
    color: "#e8e8e8", cursor: "pointer", fontSize: "1rem",
    fontFamily: "system-ui, sans-serif",
  },
  voteButtons: {
    display: "flex", flexDirection: "column", gap: "0.75rem",
    width: "100%",
  },
  voteBtn: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "1.25rem",
    background: "rgba(168,85,247,0.1)", borderRadius: "1rem",
    border: "2px solid rgba(168,85,247,0.3)", color: "#e8e8e8",
    cursor: "pointer", transition: "all 0.15s", minHeight: "80px",
    fontFamily: "system-ui, sans-serif",
  },
};
