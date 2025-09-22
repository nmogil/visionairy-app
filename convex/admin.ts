import { mutation, internalMutation, type DatabaseWriter } from "./_generated/server";
import { v } from "convex/values";

// Define the cards array for reuse
const questionCardData = [
  // Creative prompts (6 cards)
  { text: "Draw a superhero who", category: "creative", difficulty: 1 },
  { text: "Design a creature that", category: "creative", difficulty: 1 },
  { text: "Create a robot that", category: "creative", difficulty: 1 },
  { text: "Imagine a world where", category: "creative", difficulty: 2 },
  { text: "Create a villain who", category: "creative", difficulty: 2 },
  { text: "Design an alien civilization that", category: "creative", difficulty: 3 },
  
  // Funny prompts (6 cards)
  { text: "Show what happens when", category: "funny", difficulty: 1 },
  { text: "Illustrate the worst possible", category: "funny", difficulty: 1 },
  { text: "Draw your reaction when", category: "funny", difficulty: 1 },
  { text: "Show a cat trying to", category: "funny", difficulty: 1 },
  { text: "Visualize the most awkward", category: "funny", difficulty: 2 },
  { text: "Draw what would happen if animals could", category: "funny", difficulty: 2 },
  
  // Conceptual prompts (5 cards)
  { text: "Represent the feeling of", category: "conceptual", difficulty: 2 },
  { text: "Show the concept of", category: "conceptual", difficulty: 3 },
  { text: "Illustrate what it means to", category: "conceptual", difficulty: 3 },
  { text: "Visualize the idea of time", category: "conceptual", difficulty: 3 },
  { text: "Draw what dreams look like", category: "conceptual", difficulty: 2 },
  
  // Action prompts (5 cards)
  { text: "Draw someone trying to", category: "action", difficulty: 1 },
  { text: "Show the moment when", category: "action", difficulty: 2 },
  { text: "Capture the scene where", category: "action", difficulty: 2 },
  { text: "Illustrate a person discovering", category: "action", difficulty: 2 },
  { text: "Show an epic battle between", category: "action", difficulty: 3 },
  
  // Object prompts (6 cards)
  { text: "Design a futuristic", category: "object", difficulty: 1 },
  { text: "Create a magical", category: "object", difficulty: 1 },
  { text: "Invent a useless", category: "object", difficulty: 1 },
  { text: "Draw an impossible", category: "object", difficulty: 2 },
  { text: "Design a tool that helps people", category: "object", difficulty: 2 },
  { text: "Create the ultimate", category: "object", difficulty: 2 },
];

// Public seed function for manual seeding
export const seedQuestionCards = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    return await seedQuestionCardsLogic(ctx);
  },
});

// Internal seed function for auto-seeding
export const seedQuestionCardsInternal = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    return await seedQuestionCardsLogic(ctx);
  },
});

// Shared seeding logic
async function seedQuestionCardsLogic(ctx: { db: DatabaseWriter }) {
  const existingCards = await ctx.db
    .query("questionCards")
    .collect();
  
  if (existingCards.length > 0) {
    console.log("Question cards already seeded");
    return null;
  }
  
  for (const card of questionCardData) {
    await ctx.db.insert("questionCards", {
      ...card,
      isActive: true,
    });
  }
  
  const categories = Array.from(new Set(questionCardData.map(c => c.category)));
  console.log(`Auto-seeding question cards: ${questionCardData.length} cards created`);
  console.log(`Question card categories: ${categories.join(", ")}`);
  
  return null;
}