# Solace v2 - AI Companion Workspace (UX Rebuild Checkpoint)

Solace v2 is a premium, secure, production-ready AI companion web application built on **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**, **Supabase**, and the **Groq API**. 

The application is structured to provide an immersive, responsive chat workspace where users can create, configure, and converse with distinct companion archetypes (Nova, Zephyr, Astra, Echo) with real-time text streaming, markdown rendering, theme preference selections, and comprehensive authentication systems.

---

## 🚀 Key Features

* **AI Streaming Workspace**: Implements Web Streams API (`TextDecoder`) for real-time text generation at over 50 tokens per second using Groq's LLMs. Includes **Stop Responding**, **Retry (Regeneration)**, and **Copy to Clipboard** mechanisms.
* **Provider-Agnostic AI Layer**: Decoupled using clean interface contracts (`AIProvider`). Switch between Groq, OpenAI, or Gemini via `.env.local` without touching frontend React components.
* **Supabase Auth & Route Protection**: Enforces edge-level session verification and cookie handling via a custom Next.js 16 Edge proxy. Private route groups (`/dashboard`, `/chat`, `/settings`) redirect unauthorized visitors to login.
* **Extensible Schema (Drizzle ORM)**: Relational schema management with cascade deletions on messages, profile sync triggers, and a JSONB `preferences` column for dynamic user settings.
* **Extensible UI & Themes**: Theme engine persisting dark, light, or system variables directly to `localStorage`, rendering a modern glassmorphic App Shell (Header, Collapsible Sidebar, Profile menus).
* **Bundle-Size Optimization**: Dynamically imports heavy client-side packages (e.g. `react-markdown` and `remark-gfm`) to accelerate initial paint speeds.

---

## 🏗️ Project Architecture Overview

```mermaid
graph TD
    subgraph Client [Client-Side UI]
        App[React Components / App Shell] --> Contexts[AuthContext / LayoutContext]
        App --> Providers[ThemeProvider / QueryProvider]
        App --> APICall[/api/chat Endpoint]
    end

    subgraph Edge [Next.js Edge Proxy]
        APICall --> Proxy{Edge Boundary Proxy}
        Proxy -->|Protected Redirects| App
    end

    subgraph Server [Secure Server-Side API]
        Proxy -->|Authorized POST| ChatRoute[src/app/api/chat/route.ts]
        ChatRoute --> AILayer[src/lib/ai/factory.ts]
        AILayer --> GroqProvider[src/lib/ai/groq.ts]
        GroqProvider --> GroqAPI[Groq API Services]
    end

    subgraph DB [Database & Auth]
        ChatRoute --> SupabaseServer[Supabase Server Client]
        SupabaseServer --> SupabaseDB[(PostgreSQL DB via Drizzle)]
    end
```

Solace v2 follows a **decoupled, layer-based architecture**:
1. **Presentation Layer (Client)**: Tailwind v4 variables, Framer Motion transitions, and TanStack React Query for caching.
2. **Boundary Layer (Next.js Edge Proxy)**: Captures requests, validates auth session cookies, and handles edge routing.
3. **Business Logic Layer (Server APIs)**: Server-side route handlers validating DB ownership and loading companion archetypes.
4. **Data Layer (Supabase & Drizzle)**: Extensible, type-safe Postgres operations using Drizzle ORM mapping.

---

## 📂 Folder Structure

```text
solace-v2/
├── drizzle.config.ts                # Drizzle ORM migration configuration
├── package.json                     # Scripts & project dependencies
├── postcss.config.mjs               # Tailwind PostCSS configuration
├── tsconfig.json                    # Strict TypeScript configurations
├── supabase/
│   └── migrations/                  # Generated SQL migration history
│       ├── 0000_cloudy_satana.sql   # Conversations & messages tables
│       └── 0001_yellow_triathlon.sql# Add preferences JSONB column
└── src/
    ├── proxy.ts                     # Edge-level auth validation boundary
    ├── app/
    │   ├── globals.css              # Glassmorphic card variables & styling
    │   ├── layout.tsx               # Root provider stack (Theme, Query, Auth)
    │   ├── page.tsx                 # Diagnostic verification utility page
    │   ├── forgot-password/         # Email recovery trigger page
    │   ├── login/                   # Login screen
    │   ├── register/                # Registration screen
    │   ├── reset-password/          # Password update form
    │   ├── api/
    │   │   ├── auth/callback/       # Handles secure email authentication exchanges
    │   │   ├── chat/                # Secure, authorized streaming chat endpoint
    │   │   └── test-ai/             # Diagnostic API test route
    │   └── (protected)/             # Protected Route Group
    │       ├── layout.tsx           # App Shell Layout (Sidebar / Header wrapper)
    │       ├── dashboard/           # Selection page for companion templates
    │       └── chat/
    │           ├── page.tsx         # Empty chat fallback landing page
    │           └── [chatId]/        # Streaming companion chat workspace
    ├── components/
    │   ├── layout/
    │   │   ├── Header.tsx           # Page header, theme toggle, profile menu
    │   │   └── Sidebar.tsx          # Collapsible chat list sidebar drawer
    │   └── ui/
    │       └── Markdown.tsx         # Lazy-loaded Markdown & copyable code blocks
    ├── context/
    │   ├── AuthContext.tsx          # Client-side session and profile context
    │   └── LayoutContext.tsx        # Mobile sidebar toggler states
    ├── lib/
    │   ├── ai/                      # Provider-agnostic AI abstract layer
    │   │   ├── factory.ts
    │   │   ├── groq.ts
    │   │   └── types.ts
    │   ├── db/                      # Connection client & schemas
    │   │   ├── index.ts
    │   │   └── schema.ts
    │   └── supabase/                # Supabase browser & server instantiation
    │       ├── client.ts
    │       └── server.ts
    └── providers/
        ├── QueryProvider.tsx        # TanStack query cache settings
        └── ThemeProvider.tsx        # Hydration-safe theme toggle
```

---

## 🛠️ Local Development & Installation Instructions

### Prerequisites
* **Node.js**: Version 18.18+ or 20+
* **npm**: Version 9+
* **Supabase Project**: Active cloud database instance
* **Groq API Key**: Active developer credentials

### Setup Instructions

1. **Clone and Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory (based on `.env.example`):
   ```bash
   # Supabase Public keys (safe to expose to browser)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

   # Database Connection (Used by Drizzle ORM - Keep private!)
   # Note: For pooling transactions, use port 5432 (PgBouncer)
   DATABASE_URL=postgresql://postgres:your-db-password@db.your-project.supabase.co:5432/postgres

   # AI Provider Selection
   AI_PROVIDER=groq

   # Groq API Secret Key (Keep private, Server-Side Only)
   GROQ_API_KEY=gsk_your-secret-key

   # App Settings
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Initialize Database Tables & Policies**:
   Go to your **Supabase Dashboard -> SQL Editor**, copy and run the contents of the following files:
   - Run [0000_cloudy_satana.sql](file:///C:/Users/DELL/.gemini/antigravity/scratch/solace-v2/supabase/migrations/0000_cloudy_satana.sql) to create `profiles`, `conversations`, and `messages` tables.
   - Run [0001_yellow_triathlon.sql](file:///C:/Users/DELL/.gemini/antigravity/scratch/solace-v2/supabase/migrations/0001_yellow_triathlon.sql) to add the user settings `preferences` JSONB column.
   - Set up user sync triggers and Row Level Security (RLS) policies by pasting the queries documented in [walkthrough.md](file:///C:/Users/DELL/.gemini/antigravity/brain/c03e41da-af32-4def-9b98-5bbe00943449/walkthrough.md).

4. **Launch Local Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to verify diagnostics. Log in to create companions.

---

## 🔒 Row-Level Security (RLS) SQL Script

To enforce tenant isolation, run the following SQL rules in your Supabase SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Conversations Policies
CREATE POLICY "Users can view their own conversations" 
  ON public.conversations FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" 
  ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" 
  ON public.conversations FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" 
  ON public.conversations FOR DELETE USING (auth.uid() = user_id);

-- Messages Policies
CREATE POLICY "Users can view messages in their conversations" 
  ON public.messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

-- Profile Sync Database Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 🚀 Deployment Instructions (Vercel)

1. **Push Code to GitHub**:
   Ensure all changes are committed and pushed to your repo.
2. **Create New Project on Vercel**:
   - Link your GitHub repository.
   - Choose **Next.js** framework.
   - Toggle **Environment Variables** and insert all contents of `.env.local` exactly (verify the `DATABASE_URL` password is set correctly).
3. **Build & Settings Configuration**:
   - Vercel handles Next.js builds automatically.
   - The build command is `next build`.
   - The output directory is `.next`.
4. **Post-Deployment Checks**:
   - Ensure the site loads, signups execute, and Groq streaming completes without timeouts.

---

## 🔧 Troubleshooting Section

* **Hydration Mismatch Warnings**:
  * *Cause*: Happens if the server outputs a different theme layout than the client preferences on mount.
  * *Solution*: The theme provider is wrapped in a client-side microtask tick (`setTimeout`) to defer theme adjustments until initial paint completes.
* **NextJS Turbopack Font Fetch Failures**:
  * *Cause*: Next.js attempts to query Google Fonts during compilation. In sandbox/offline networks, the query fails and halts builds.
  * *Solution*: Removed `next/font/google` and configured high-performance system font stacks directly inside `@theme` in `globals.css`.
* **Supabase API 401 Unauthorized**:
  * *Cause*: Unauthenticated fetch requests or incorrect configuration of the Next.js `proxy.ts` cookies.
  * *Solution*: Ensure you access pages through the edge handler. Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct.
