import * as fs from "fs";
import * as path from "path";

export interface StoryChoice {
  id: string;
  emoji: string;
  label: string;
  nextNodeId: string;
}

export interface StoryNode {
  id: string;
  type: "narrative" | "choice" | "ending";
  title?: string;
  narration: string;
  sceneDescription?: string;
  imageUrl?: string;
  choices?: StoryChoice[];
  endingType?: string;
  endingTitle?: string;
}

export interface StoryGraph {
  id: string;
  title: string;
  genre: string;
  description: string;
  estimatedMinutes: number;
  minPlayers: number;
  maxPlayers: number;
  startNodeId: string;
  nodes: Record<string, StoryNode>;
}

const stories = new Map<string, StoryGraph>();

export function loadStories(): void {
  const storiesDir = process.env.NODE_ENV === "production" ? path.join(__dirname, "../stories") : path.join(__dirname, "../../stories");

  if (!fs.existsSync(storiesDir)) {
    console.warn(`Stories directory not found: ${storiesDir}`);
    return;
  }

  const files = fs.readdirSync(storiesDir).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(storiesDir, file), "utf-8");
      const story: StoryGraph = JSON.parse(content);
      stories.set(story.id, story);
      console.log(`✅ Loaded story: "${story.title}" (${story.id}) — ${Object.keys(story.nodes).length} nodes`);
    } catch (err) {
      console.error(`❌ Failed to load story ${file}:`, err);
    }
  }

  console.log(`📚 ${stories.size} stories loaded`);
}

export function getStory(id: string): StoryGraph | undefined {
  return stories.get(id);
}

export function getAllStories(): StoryGraph[] {
  return Array.from(stories.values());
}

export function getStoryList(): Array<{ id: string; title: string; genre: string; description: string; estimatedMinutes: number }> {
  return getAllStories().map((s) => ({
    id: s.id,
    title: s.title,
    genre: s.genre,
    description: s.description,
    estimatedMinutes: s.estimatedMinutes,
  }));
}

export function countChoiceNodes(story: StoryGraph): number {
  return Object.values(story.nodes).filter(
    (n) => n.choices && n.choices.length > 0
  ).length;
}
