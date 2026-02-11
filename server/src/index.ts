import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import cors from "cors";
import http from "http";
import { StoryRoom } from "./StoryRoom";
import { loadStories, getStoryList } from "./stories";

const PORT = Number(process.env.PORT) || 2567;

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    name: "Story Party Server",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/stories", (_req, res) => {
  res.json(getStoryList());
});

const server = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server }),
});

gameServer.define("story_room", StoryRoom);

loadStories();

gameServer.listen(PORT).then(() => {
  console.log(`\n🎮 Story Party server running on port ${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
  console.log(`   HTTP API:  http://localhost:${PORT}`);
  console.log("");
});
