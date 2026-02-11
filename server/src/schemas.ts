import { Schema, MapSchema, ArraySchema, type, filter } from "@colyseus/schema";

export class ChoiceSchema extends Schema {
  @type("string") id: string = "";
  @type("string") emoji: string = "";
  @type("string") label: string = "";
}

export class VoteResultSchema extends Schema {
  @type("string") choiceId: string = "";
  @type("string") emoji: string = "";
  @type("string") label: string = "";
  @type("number") count: number = 0;
  @type("number") percentage: number = 0;
  @type(["string"]) voters = new ArraySchema<string>();
}

export class PlayerSchema extends Schema {
  @type("string") sessionId: string = "";
  @type("string") name: string = "";
  @type("string") avatar: string = "";
  @type("boolean") isVIP: boolean = false;
  @type("boolean") isConnected: boolean = true;
  @type("boolean") hasVoted: boolean = false;
  // Note: currentVote is NOT synced to clients to keep votes secret until reveal
}

export class GameStateSchema extends Schema {
  @type("string") roomCode: string = "";
  @type("string") phase: string = "lobby"; // lobby | intro | narrative | voting | vote_result | ending | results
  @type("string") storyId: string = "";
  @type("string") storyTitle: string = "";
  @type("string") storyGenre: string = "";

  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type("number") playerCount: number = 0;

  @type("string") currentNodeId: string = "";
  @type("string") currentNarration: string = "";
  @type("string") currentTitle: string = "";
  @type("string") currentImageUrl: string = "";

  @type([ChoiceSchema]) choices = new ArraySchema<ChoiceSchema>();
  @type("number") voteTimer: number = 0;
  @type([VoteResultSchema]) voteResults = new ArraySchema<VoteResultSchema>();
  @type("string") winningChoiceId: string = "";

  @type("string") endingType: string = "";
  @type("string") endingTitle: string = "";

  @type("number") decisionsMade: number = 0;
  @type("number") totalDecisions: number = 0;
  @type(["string"]) pathHistory = new ArraySchema<string>();
}
