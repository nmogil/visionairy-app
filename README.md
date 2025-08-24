# AI Image Party

A multiplayer party game where players generate AI images to match creative prompts. Think Cards Against Humanity meets FAL AI — players submit text prompts to create images, and a rotating "Card Czar" picks the best/funniest submission each round.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Convex (reactive database, real-time functions)
- **UI**: shadcn/ui + Tailwind CSS + Radix UI
- **Auth**: Convex Auth with OAuth support
- **AI**: FAL AI Flux model integration
- **Mobile**: Capacitor for native mobile apps
- **Animations**: Framer Motion
- **State**: React Query + Convex subscriptions

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start Convex backend (separate terminal)
npx convex dev

# Run linting
npm run lint
```

## Project Structure

```
src/
├── components/
│   ├── auth/          # Authentication components
│   ├── game/          # Game-specific UI
│   ├── landing/       # Marketing/landing page
│   ├── mobile/        # Mobile-specific components
│   ├── retro/         # 8-bit themed components
│   └── ui/            # shadcn/ui base + custom variants
├── features/game/     # Game feature modules
├── hooks/             # Custom React hooks
├── pages/             # Route components
└── types/             # TypeScript definitions

convex/
├── auth.ts           # Authentication setup
├── schema.ts         # Database schema
└── users.ts          # User management functions
```

## Features Status

✅ **Authentication** - Convex Auth with email/OAuth  
✅ **Landing Page** - Marketing site with game explanation  
🚧 **Room Management** - Create/join game rooms (in progress)  
🚧 **Game Flow** - Multi-phase gameplay with timers  
🚧 **AI Integration** - FAL AI image generation  
🚧 **Real-time Updates** - Convex subscriptions for live gameplay  

## Development

**Key Commands:**
- `npm run dev` - Development server (port 8080)
- `npm run build` - Production build
- `npm run lint` - Code quality checks

**Architecture Notes:**
- Mobile-first responsive design with PWA capabilities
- Real-time multiplayer using Convex reactive subscriptions
- Component composition using shadcn/ui patterns
- Custom 8-bit/retro theming system alongside standard themes

**Path Aliases:**
- `@/` → `src/` directory

See `CLAUDE.md` for detailed development guidelines and Convex integration patterns.