import { Room, Client } from "@colyseus/core";
import {
  GameStateSchema,
  PlayerSchema,
  ChoiceSchema,
  VoteResultSchema,
} from "./schemas";
import { getStory, countChoiceNodes, StoryGraph, StoryNode } from "./stories";

const VOTE_DURATION = 12;
const RESULT_DISPLAY_DURATION = 4;
const NARRATIVE_AUTO_ADVANCE_DELAY = 2;
const MAX_PLAYERS = 16;

// Characters to use for room codes (excluding confusing ones)
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ";

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export class StoryRoom extends Room<GameStateSchema> {
  private story: StoryGraph | null = null;
  private votes: Map<string, string> = new Map();
  private hostSessionId: string | null = null; // sessionId -> choiceId
  private voteInterval: ReturnType<typeof setInterval> | null = null;
  private autoAdvanceTimeout: ReturnType<typeof setTimeout> | null = null;

  onCreate(options: any) {
    const roomCode = generateRoomCode();
    this.roomId = roomCode; // Use room code as the room ID for easy joining

    this.setState(new GameStateSchema());
    this.state.roomCode = roomCode;
    this.state.phase = "lobby";

    this.maxClients = MAX_PLAYERS;

    console.log(`🎬 Room created: ${roomCode}`);

    // Handle messages
    this.onMessage("start_game", (client, data) => this.handleStartGame(client, data));
    this.onMessage("vote", (client, data) => this.handleVote(client, data));
    this.onMessage("advance", (client) => this.handleAdvance(client));
    this.onMessage("restart", (client) => this.handleRestart(client));
  }

  onJoin(client: Client, options: any) {
    // Host screen joins with isHost flag - don't create a player
    if (options.isHost) {
      this.hostSessionId = client.sessionId;
      console.log(`📺 Host screen connected to room ${this.state.roomCode}`);
      return;
    }

    const player = new PlayerSchema();
    player.sessionId = client.sessionId;
    player.name = options.name || `Player ${this.state.playerCount + 1}`;
    player.avatar = options.avatar || "🕵️";
    player.isVIP = this.state.playerCount === 0; // First player is VIP
    player.isConnected = true;
    player.hasVoted = false;

    this.state.players.set(client.sessionId, player);
    this.state.playerCount++;

    console.log(`👤 ${player.name} joined room ${this.state.roomCode} (${this.state.playerCount} players)`);

    // Send story list to the new player
    client.send("story_list", require("./stories").getStoryList());
  }

  async onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    player.isConnected = false;
    console.log(`👋 ${player.name} disconnected from ${this.state.roomCode}`);

    try {
      // Allow reconnection for 60 seconds
      if (!consented) {
        await this.allowReconnection(client, 60);
        player.isConnected = true;
        console.log(`🔄 ${player.name} reconnected to ${this.state.roomCode}`);
        return;
      }
    } catch (e) {
      // Reconnection timed out
    }

    // Permanently remove player
    this.state.players.delete(client.sessionId);
    this.state.playerCount--;
    this.votes.delete(client.sessionId);

    // If VIP left, assign new VIP
    if (player.isVIP && this.state.playerCount > 0) {
      const firstPlayer = Array.from(this.state.players.values())[0];
      if (firstPlayer) firstPlayer.isVIP = true;
    }

    console.log(`❌ ${player.name} removed from ${this.state.roomCode} (${this.state.playerCount} players)`);
  }

  onDispose() {
    this.clearTimers();
    console.log(`🗑️ Room ${this.state.roomCode} disposed`);
  }

  // ==========================================
  // MESSAGE HANDLERS
  // ==========================================

  private handleStartGame(client: Client, data: { storyId: string }) {
    const player = this.state.players.get(client.sessionId);
    if (!player?.isVIP) {
      client.send("error", { message: "Only the VIP can start the game" });
      return;
    }

    if (this.state.playerCount < 1) {
      client.send("error", { message: "Need at least 1 player to start" });
      return;
    }

    const story = getStory(data.storyId);
    if (!story) {
      client.send("error", { message: "Story not found" });
      return;
    }

    this.story = story;
    this.state.storyId = story.id;
    this.state.storyTitle = story.title;
    this.state.storyGenre = story.genre;
    this.state.totalDecisions = countChoiceNodes(story);
    this.state.decisionsMade = 0;
    this.state.pathHistory.clear();

    console.log(`🎬 Starting "${story.title}" in room ${this.state.roomCode}`);

    // Show intro briefly, then advance to first node
    this.state.phase = "intro";
    this.autoAdvanceTimeout = setTimeout(() => {
      this.goToNode(story.startNodeId);
    }, 3000);
  }

  private handleVote(client: Client, data: { choiceId: string }) {
    if (this.state.phase !== "voting") return;

    const player = this.state.players.get(client.sessionId);
    if (!player || player.hasVoted) return;

    // Validate choice exists
    const validChoice = this.state.choices.find((c) => c.id === data.choiceId);
    if (!validChoice) return;

    this.votes.set(client.sessionId, data.choiceId);
    player.hasVoted = true;

    console.log(`🗳️ ${player.name} voted for ${validChoice.emoji} ${validChoice.label}`);

    // Check if all connected players have voted
    const connectedPlayers = Array.from(this.state.players.values()).filter(
      (p) => p.isConnected
    );
    const allVoted = connectedPlayers.every((p) => p.hasVoted);

    if (allVoted) {
      this.resolveVote();
    }
  }

  private handleAdvance(client: Client) {
    // VIP can manually advance narrative screens
    const player = this.state.players.get(client.sessionId);
    if (!player?.isVIP) return;

    if (this.state.phase === "narrative") {
      this.advanceFromNarrative();
    }
  }

  private handleRestart(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player?.isVIP) return;

    this.clearTimers();
    this.votes.clear();

    // Reset all players
    this.state.players.forEach((p) => {
      p.hasVoted = false;
    });

    this.state.phase = "lobby";
    this.state.currentNodeId = "";
    this.state.currentNarration = "";
    this.state.currentTitle = "";
    this.state.choices.clear();
    this.state.voteResults.clear();
    this.state.winningChoiceId = "";
    this.state.endingType = "";
    this.state.endingTitle = "";
    this.state.decisionsMade = 0;
    this.state.pathHistory.clear();

    console.log(`🔄 Room ${this.state.roomCode} restarted`);
  }

  // ==========================================
  // GAME LOGIC
  // ==========================================

  private goToNode(nodeId: string) {
    if (!this.story) return;

    const node = this.story.nodes[nodeId];
    if (!node) {
      console.error(`❌ Node not found: ${nodeId}`);
      return;
    }

    this.clearTimers();
    this.state.currentNodeId = nodeId;
    this.state.currentNarration = node.narration;
    this.state.currentTitle = node.title || "";
    this.state.currentImageUrl = node.imageUrl || "";
    this.state.pathHistory.push(nodeId);

    // Clear previous vote data
    this.state.choices.clear();
    this.state.voteResults.clear();
    this.state.winningChoiceId = "";
    this.votes.clear();
    this.state.players.forEach((p) => (p.hasVoted = false));

    if (node.type === "ending") {
      this.state.phase = "ending";
      this.state.endingType = node.endingType || "neutral";
      this.state.endingTitle = node.endingTitle || "The End";
      console.log(`🏁 Ending reached: ${node.endingTitle} (${node.endingType})`);
    } else {
      // Show narrative first
      this.state.phase = "narrative";

      // If this node has choices, auto-transition to voting after a delay
      if (node.choices && node.choices.length > 0) {
        // Populate choices (they'll be shown when phase changes to "voting")
        for (const choice of node.choices) {
          const c = new ChoiceSchema();
          c.id = choice.id;
          c.emoji = choice.emoji;
          c.label = choice.label;
          this.state.choices.push(c);
        }
      }
    }
  }

  private advanceFromNarrative() {
    if (this.state.choices.length > 0) {
      // This node has choices — start voting
      this.startVoting();
    } else {
      // Pure narrative node with no choices — shouldn't happen in our stories
      // but handle gracefully by going back to lobby
      this.state.phase = "lobby";
    }
  }

  private startVoting() {
    this.state.phase = "voting";
    this.state.voteTimer = VOTE_DURATION;
    this.state.decisionsMade++;

    console.log(`🗳️ Voting started (${VOTE_DURATION}s) — ${this.state.choices.length} choices`);

    // Countdown timer
    this.voteInterval = setInterval(() => {
      this.state.voteTimer--;

      if (this.state.voteTimer <= 0) {
        this.resolveVote();
      }
    }, 1000);
  }

  private resolveVote() {
    this.clearTimers();

    // Count votes per choice
    const voteCounts = new Map<string, { count: number; voters: string[] }>();

    for (const choice of this.state.choices) {
      voteCounts.set(choice.id, { count: 0, voters: [] });
    }

    for (const [sessionId, choiceId] of this.votes) {
      const entry = voteCounts.get(choiceId);
      const player = this.state.players.get(sessionId);
      if (entry && player) {
        entry.count++;
        entry.voters.push(player.name);
      }
    }

    // Assign random votes for players who didn't vote
    const connectedNonVoters = Array.from(this.state.players.values()).filter(
      (p) => p.isConnected && !p.hasVoted
    );
    for (const player of connectedNonVoters) {
      const randomChoice =
        this.state.choices[Math.floor(Math.random() * this.state.choices.length)];
      const entry = voteCounts.get(randomChoice.id);
      if (entry) {
        entry.count++;
        entry.voters.push(`${player.name} (random)`);
      }
    }

    const totalVotes = Array.from(voteCounts.values()).reduce(
      (sum, v) => sum + v.count,
      0
    );

    // Build vote results
    this.state.voteResults.clear();
    let maxVotes = 0;
    let winners: string[] = [];

    for (const choice of this.state.choices) {
      const entry = voteCounts.get(choice.id)!;
      const result = new VoteResultSchema();
      result.choiceId = choice.id;
      result.emoji = choice.emoji;
      result.label = choice.label;
      result.count = entry.count;
      result.percentage = totalVotes > 0 ? Math.round((entry.count / totalVotes) * 100) : 0;
      for (const voter of entry.voters) {
        result.voters.push(voter);
      }
      this.state.voteResults.push(result);

      if (entry.count > maxVotes) {
        maxVotes = entry.count;
        winners = [choice.id];
      } else if (entry.count === maxVotes) {
        winners.push(choice.id);
      }
    }

    // Resolve ties randomly
    const winningId = winners[Math.floor(Math.random() * winners.length)];
    this.state.winningChoiceId = winningId;
    this.state.phase = "vote_result";

    console.log(
      `📊 Vote resolved: ${this.state.voteResults
        .map((r) => `${r.emoji} ${r.count}`)
        .join(" | ")} → Winner: ${winningId}`
    );

    // After showing results, advance to next node
    this.autoAdvanceTimeout = setTimeout(() => {
      if (!this.story) return;

      // Find the winning choice's next node
      const currentNode = this.story.nodes[this.state.currentNodeId];
      const winningChoice = currentNode?.choices?.find((c) => c.id === winningId);

      if (winningChoice) {
        this.goToNode(winningChoice.nextNodeId);
      }
    }, RESULT_DISPLAY_DURATION * 1000);
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  private clearTimers() {
    if (this.voteInterval) {
      clearInterval(this.voteInterval);
      this.voteInterval = null;
    }
    if (this.autoAdvanceTimeout) {
      clearTimeout(this.autoAdvanceTimeout);
      this.autoAdvanceTimeout = null;
    }
  }
}
