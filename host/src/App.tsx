import React, { useState, useEffect, useRef, useCallback } from "react";
import { Client, Room } from "colyseus.js";
import QRCode from "qrcode";

const SERVER_URL = "wss://story-party-server.fly.dev";
const PLAYER_URL = "https://story-party-player.vercel.app";

export default function App() {
  const [room, setRoom] = useState<Room | null>(null);
  const [phase, setPhase] = useState("connecting");
  const [roomCode, setRoomCode] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");
  const [players, setPlayers] = useState<any[]>([]);
  const [storyTitle, setStoryTitle] = useState("");
  const [storyGenre, setStoryGenre] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");
  const [currentNarration, setCurrentNarration] = useState("");
  const [choices, setChoices] = useState<any[]>([]);
  const [voteTimer, setVoteTimer] = useState(0);
  const [voteResults, setVoteResults] = useState<any[]>([]);
  const [winningChoiceId, setWinningChoiceId] = useState("");
  const [endingType, setEndingType] = useState("");
  const [endingTitle, setEndingTitle] = useState("");
  const [decisionsMade, setDecisionsMade] = useState(0);
  const [totalDecisions, setTotalDecisions] = useState(0);

  useEffect(() => {
    const connect = async () => {
      try {
        const client = new Client(SERVER_URL);
        const newRoom = await client.create("story_room", { isHost: true });

        newRoom.onStateChange((s: any) => {
          setPhase(s.phase);
          setRoomCode(s.roomCode);
          setStoryTitle(s.storyTitle);
          setStoryGenre(s.storyGenre);
          setCurrentTitle(s.currentTitle);
          setCurrentNarration(s.currentNarration);
          setVoteTimer(s.voteTimer);
          setWinningChoiceId(s.winningChoiceId);
          setEndingType(s.endingType);
          setEndingTitle(s.endingTitle);
          setDecisionsMade(s.decisionsMade);
          setTotalDecisions(s.totalDecisions);
          setPlayers(Array.from(s.players?.values() || []).map((p: any) => ({
            sessionId: p.sessionId, name: p.name, avatar: p.avatar,
            isVIP: p.isVIP, isConnected: p.isConnected, hasVoted: p.hasVoted,
          })));
          setChoices(Array.from(s.choices?.values() || []).map((c: any) => ({
            id: c.id, emoji: c.emoji, label: c.label,
          })));
          setVoteResults(Array.from(s.voteResults?.values() || []).map((r: any) => ({
            choiceId: r.choiceId, emoji: r.emoji, label: r.label,
            count: r.count, percentage: r.percentage,
            voters: Array.from(r.voters?.values() || []),
          })));
        });

        const joinUrl = `${PLAYER_URL}/join/${newRoom.roomId}`;
        const qr = await QRCode.toDataURL(joinUrl, {
          width: 160, margin: 1,
          color: { dark: "#c4b5fd", light: "#0a0a1a" },
        });
        setQrDataUrl(qr);
        setRoom(newRoom);

        newRoom.onError((code, msg) => setError(`Error: ${msg}`));
        newRoom.onLeave(() => setError("Disconnected from server"));
      } catch (err: any) {
        setError(`Failed to connect to server at ${SERVER_URL}`);
      }
    };
    connect();
  }, []);

  if (error) {
    return <Screen><Text size="1.5rem" color="#ef4444">{error}</Text><Text size="1rem" color="#6b7280" mt="1rem">Server: {SERVER_URL}</Text></Screen>;
  }
  if (phase === "connecting") {
    return <Screen><Text size="1.5rem" color="#6b7280">Connecting to server...</Text></Screen>;
  }

  if (phase === "lobby") {
    const playerUrl = PLAYER_URL.replace(/^https?:\/\//, "");
    return (
      <Screen>
        <Text size="4rem" bold glow>🎬 Story Party</Text>
        <Text size="1.4rem" color="#a78bfa" italic mt="0.5rem">Join on your phone to play</Text>
        <Box mt="2rem">
          <Text size="1.4rem" mono color="#c4b5fd">{playerUrl}</Text>
          <Text size="4rem" bold mono glow mt="0.5rem" letterSpacing="0.3em">{roomCode}</Text>
          {qrDataUrl && <img src={qrDataUrl} alt="QR" style={{ borderRadius: 8, marginTop: 12 }} />}
        </Box>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center", marginTop: "1.5rem" }}>
          {players.map(p => (
            <Chip key={p.sessionId} opacity={p.isConnected ? 1 : 0.4}>
              {p.avatar} {p.name} {p.isVIP && <VipBadge />}
            </Chip>
          ))}
        </div>
        <Text size="1.1rem" color="#6b7280" italic mt="1.5rem">
          {players.length === 0 ? "Waiting for players..." : `${players.length} player${players.length !== 1 ? "s" : ""} — VIP starts from their phone`}
        </Text>
      </Screen>
    );
  }

  if (phase === "intro") {
    return (
      <Screen>
        <Text size="1.2rem" color="#a78bfa" caps spacing="0.3em">{storyGenre}</Text>
        <Text size="4rem" bold glow mt="0.5rem">{storyTitle}</Text>
      </Screen>
    );
  }

  if (phase === "narrative") {
    return (
      <Screen>
        {currentTitle && <Text size="2rem" bold color="#c4b5fd" glow mb="1.5rem">{currentTitle}</Text>}
        <Text size="1.4rem" lineHeight="2" style={{ maxWidth: 900, whiteSpace: "pre-line" }}>{currentNarration}</Text>
        <Text size="0.9rem" color="#4b5563" italic style={{ position: "absolute", bottom: "2rem" }}>
          VIP: tap "Continue" on your phone
        </Text>
        <ProgressBar progress={totalDecisions > 0 ? decisionsMade / totalDecisions : 0} />
      </Screen>
    );
  }

  if (phase === "voting") {
    const voted = players.filter(p => p.hasVoted).length;
    return (
      <Screen>
        <Text size="1.6rem" color="#fbbf24" bold sans>⏳ VOTE NOW ON YOUR PHONE</Text>
        <Text size="5rem" bold mono color={voteTimer <= 3 ? "#ef4444" : "#e8e8e8"} glow mt="0.5rem">{voteTimer}</Text>
        <Text size="1rem" color="#6b7280" sans mb="1.5rem">{voted}/{players.length} voted</Text>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", justifyContent: "center" }}>
          {choices.map(c => (
            <Box key={c.id} small>
              <Text size="3rem">{c.emoji}</Text>
              <Text size="1.1rem" color="#d1d5db" mt="0.5rem">{c.label}</Text>
            </Box>
          ))}
        </div>
        <ProgressBar progress={totalDecisions > 0 ? decisionsMade / totalDecisions : 0} />
      </Screen>
    );
  }

  if (phase === "vote_result") {
    return (
      <Screen>
        <Text size="1.5rem" color="#fbbf24" sans mb="2rem">📊 THE VOTE IS IN</Text>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", justifyContent: "center" }}>
          {voteResults.map(r => {
            const isWinner = r.choiceId === winningChoiceId;
            return (
              <div key={r.choiceId} style={{
                padding: "1.5rem 2rem", borderRadius: "1rem", textAlign: "center", minWidth: 220,
                background: isWinner ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.03)",
                border: isWinner ? "2px solid #a78bfa" : "1px solid rgba(255,255,255,0.05)",
                transform: isWinner ? "scale(1.05)" : "scale(1)", opacity: isWinner ? 1 : 0.6,
                transition: "all 0.3s ease",
              }}>
                <Text size="3rem">{r.emoji}</Text>
                <Text size="1.1rem" color={isWinner ? "#fff" : "#6b7280"} mt="0.25rem">{r.label}</Text>
                <Text size="2.5rem" bold sans mt="0.25rem">{r.percentage}%</Text>
                <div style={{ height: 6, borderRadius: 3, marginTop: 8, width: `${r.percentage}%`, background: isWinner ? "#a78bfa" : "#374151", transition: "width 0.5s ease" }} />
                <Text size="0.8rem" color="#6b7280" mt="0.5rem">{r.voters.join(", ")}</Text>
              </div>
            );
          })}
        </div>
      </Screen>
    );
  }

  if (phase === "ending") {
    const icons: Record<string, string> = { good: "🎯", bad: "💀", neutral: "🔍", secret: "🏆" };
    const colors: Record<string, string> = { good: "#22c55e", bad: "#ef4444", neutral: "#eab308", secret: "#a78bfa" };
    return (
      <Screen>
        <Text size="6rem">{icons[endingType] || "🎬"}</Text>
        <Text size="3rem" bold color="#c4b5fd" glow mt="0.5rem">{endingTitle}</Text>
        <Text size="1rem" sans style={{
          padding: "0.3rem 1rem", borderRadius: "1rem", marginTop: "0.75rem", display: "inline-block",
          background: `${colors[endingType] || "#6b7280"}22`, color: colors[endingType] || "#6b7280",
          border: `1px solid ${colors[endingType] || "#6b7280"}`,
        }}>
          {endingType === "good" ? "✅ Good Ending" : endingType === "bad" ? "💀 Bad Ending" : endingType === "secret" ? "🏆 Secret Ending" : "🔍 Neutral Ending"}
        </Text>
        <Text size="1.3rem" lineHeight="1.8" mt="2rem" style={{ maxWidth: 800, whiteSpace: "pre-line" }}>{currentNarration}</Text>
        <Text size="1rem" color="#6b7280" italic mt="2rem" sans>VIP can restart from their phone</Text>
      </Screen>
    );
  }

  return <Screen><Text size="1.5rem" color="#6b7280">Phase: {phase}</Text></Screen>;
}

// ============================================
// REUSABLE UI COMPONENTS
// ============================================

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: "100vw", height: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", position: "relative",
      background: "linear-gradient(180deg, #0a0a1a 0%, #1a0a2a 50%, #0a0a1a 100%)",
      fontFamily: "'Georgia','Times New Roman',serif", color: "#e8e8e8", overflow: "hidden",
    }}>
      {children}
    </div>
  );
}

function Text({ children, size = "1rem", color = "#e8e8e8", bold, italic, mono, sans, caps, glow,
  mt, mb, lineHeight, letterSpacing, style }: any) {
  return (
    <div style={{
      fontSize: size, color, fontWeight: bold ? "bold" : "normal",
      fontStyle: italic ? "italic" : "normal",
      fontFamily: mono ? "monospace" : sans ? "system-ui, sans-serif" : "inherit",
      textTransform: caps ? "uppercase" : "none",
      textShadow: glow ? `0 0 20px ${color}44` : "none",
      textAlign: "center", marginTop: mt, marginBottom: mb, lineHeight, letterSpacing,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Box({ children, mt, small }: { children: React.ReactNode; mt?: string; small?: boolean }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: small ? "0.25rem" : "0.5rem",
      padding: small ? "1.25rem 1.5rem" : "1.5rem 3rem",
      background: "rgba(255,255,255,0.05)", borderRadius: "1rem",
      border: "1px solid rgba(168,85,247,0.2)", marginTop: mt,
    }}>
      {children}
    </div>
  );
}

function Chip({ children, opacity = 1 }: { children: React.ReactNode; opacity?: number }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.5rem",
      padding: "0.5rem 1rem", background: "rgba(168,85,247,0.15)",
      borderRadius: "2rem", border: "1px solid rgba(168,85,247,0.3)",
      fontSize: "1.1rem", opacity,
    }}>
      {children}
    </div>
  );
}

function VipBadge() {
  return (
    <span style={{
      fontSize: "0.65rem", background: "#fbbf24", color: "#000",
      padding: "0.1rem 0.4rem", borderRadius: "0.3rem", fontWeight: "bold",
      fontFamily: "sans-serif",
    }}>VIP</span>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, height: 4,
      width: `${progress * 100}%`, transition: "width 0.5s ease",
      background: "linear-gradient(90deg, #a78bfa, #c4b5fd)",
    }} />
  );
}
