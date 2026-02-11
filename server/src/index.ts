import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import express from "express";
import cors from "cors";
import http from "http";
import { StoryRoom } from "./StoryRoom";
import { loadStories, getStoryList } from "./stories";

const PORT = Number(process.env.PORT) || 2567;

const app = express();

// CORS — allow connections from any origin (Vercel frontends, local dev, etc.)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

// Health check
app.get("/", (_req, res) => {
  res.json({
    name: "Story Party Server",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// Story list API
app.get("/api/stories", (_req, res) => {
  res.json(getStoryList());
});

// Colyseus monitor (dev only)
if (process.env.NODE_ENV !== "production") {
  app.use("/monitor", monitor());
}

// Create HTTP server
const server = http.createServer(app);

// Create Colyseus game server
const gameServer = new Server({
  transport: new WebSocketTransport({ server }),
});

// Register the story room
gameServer.define("story_room", StoryRoom);

// Load stories from JSON files
loadStories();

// Start listening
gameServer.listen(PORT).then(() => {
  console.log(`\n🎮 Story Party server running on port ${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
  console.log(`   HTTP API:  http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== "production") {
    console.log(`   Monitor:   http://localhost:${PORT}/monitor`);
  }
  console.log("");
});
