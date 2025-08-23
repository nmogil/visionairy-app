import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Seed initial question cards (run this once)
export const seedQuestionCards = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const existingCards = await ctx.db
      .query("questionCards")
      .collect();
    
    if (existingCards.length > 0) {
      console.log("Question cards already seeded");
      return null;
    }
    
    const cards = [
      // Creative prompts
      { text: "Draw a superhero who", category: "creative", difficulty: 1 },
      { text: "Design a creature that", category: "creative", difficulty: 1 },
      { text: "Imagine a world where", category: "creative", difficulty: 2 },
      { text: "Create a villain who", category: "creative", difficulty: 2 },
      
      // Funny prompts
      { text: "Show what happens when", category: "funny", difficulty: 1 },
      { text: "Illustrate the worst possible", category: "funny", difficulty: 1 },
      { text: "Draw your reaction when", category: "funny", difficulty: 1 },
      { text: "Visualize the most awkward", category: "funny", difficulty: 2 },
      
      // Conceptual prompts
      { text: "Represent the feeling of", category: "conceptual", difficulty: 2 },
      { text: "Show the concept of", category: "conceptual", difficulty: 3 },
      { text: "Illustrate what it means to", category: "conceptual", difficulty: 3 },
      
      // Action prompts
      { text: "Draw someone trying to", category: "action", difficulty: 1 },
      { text: "Show the moment when", category: "action", difficulty: 2 },
      { text: "Capture the scene where", category: "action", difficulty: 2 },
      
      // Object prompts
      { text: "Design a futuristic", category: "object", difficulty: 1 },
      { text: "Create a magical", category: "object", difficulty: 1 },
      { text: "Invent a useless", category: "object", difficulty: 1 },
      { text: "Draw an impossible", category: "object", difficulty: 2 },
    ];
    
    for (const card of cards) {
      await ctx.db.insert("questionCards", {
        ...card,
        isActive: true,
      });
    }
    
    console.log(`Seeded ${cards.length} question cards`);
    return null;
  },
});