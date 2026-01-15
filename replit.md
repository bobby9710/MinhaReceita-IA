# MinhaReceita - Recipe Management Application

## Overview

MinhaReceita is a full-stack recipe management application built for Portuguese-speaking users. It enables users to create, import, and organize recipes, plan weekly meals, and generate shopping lists. The application features AI-powered recipe import capabilities that can extract recipes from URLs or media content.

**Core Features:**
- Complete CRUD operations for recipes with ingredients, spices (strictly separated), and cooking steps
- AI-assisted recipe import with mandatory pre-visualization before saving
- Weekly meal planner with drag-and-drop interface
- Automated shopping list generation from recipes
- User-scoped data persistence with Replit Auth

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Build Tool**: Vite with custom Replit plugins for development

The frontend follows a page-based architecture with shared components. Key architectural decisions:
- Custom hooks (`use-recipes`, `use-meal-plans`, `use-shopping-list`, `use-auth`) encapsulate all API interactions
- `PageLayout` component handles authentication checks and redirects
- Strict separation between UI components and business logic

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Authentication**: Replit Auth via OpenID Connect with session storage
- **API Design**: RESTful endpoints with Zod schema validation

The server uses a modular integration pattern:
- `replit_integrations/` contains reusable modules for auth, chat, audio, and image generation
- Route handlers are registered centrally in `routes.ts`
- Storage layer (`storage.ts`) abstracts all database operations

### Data Model Design
Core entities with strict business rules:
- **Recipes**: Title, description, prep time, difficulty, category, with user ownership
- **Ingredients**: Strictly separated from spices (enforced rule), linked to recipes
- **Spices**: Separate table with optional quantities, linked to recipes
- **Steps**: Ordered cooking instructions per recipe
- **Meal Plans**: Date + category + recipe mappings per user
- **Shopping List**: Items with bought status, optionally linked to recipes

### Authentication Flow
- Replit OAuth2/OIDC integration with automatic session management
- Sessions stored in PostgreSQL via `connect-pg-simple`
- `isAuthenticated` middleware protects all API routes
- User data automatically upserted on login

### AI Integration Points
- Recipe import from URLs using OpenAI for content extraction
- Image generation for recipes via `gpt-image-1` model
- Audio transcription for voice-based recipe input
- All AI features use Replit's AI Integrations proxy endpoints

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, provisioned via Replit
- **Drizzle ORM**: Schema management and query building
- **connect-pg-simple**: Session storage in PostgreSQL

### AI Services (via Replit AI Integrations)
- **OpenAI API**: Recipe import, image generation, voice processing
- **Environment Variables**:
  - `AI_INTEGRATIONS_OPENAI_API_KEY`: API key for OpenAI access
  - `AI_INTEGRATIONS_OPENAI_BASE_URL`: Replit's proxy endpoint

### Authentication
- **Replit Auth**: OAuth2/OIDC provider
- **Environment Variables**:
  - `ISSUER_URL`: OIDC discovery endpoint (defaults to Replit)
  - `SESSION_SECRET`: Secret for session encryption
  - `REPL_ID`: Replit environment identifier

### Media Processing
- **yt-dlp**: External CLI tool for downloading audio from URLs (recipe import from videos)
- **ffmpeg**: Audio format conversion for voice processing

### UI Components
- **Radix UI**: Headless UI primitives (dialogs, menus, tooltips, etc.)
- **Lucide React**: Icon library
- **date-fns**: Date manipulation for meal planner
- **react-hook-form** + **Zod**: Form handling with validation