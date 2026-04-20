# Qazaq Cyber Tournament Platform

Production-oriented esports tournament management platform built with `Next.js 14`, `Express`, `TypeScript`, `Prisma`, `PostgreSQL`, and `Socket.IO`.

## Features

- **Tournament Management**: Create and manage esports tournaments with ease
- **Double Elimination Brackets**: Advanced bracket system with winner and loser flows
- **Realtime Updates**: Live bracket refresh through Socket.IO for instant updates
- **Admin Panel**: Comprehensive control panel for approvals, bracket generation, and score entry
- **Leaderboard & MVP**: Track performance and highlight top players
- JWT authentication with `ADMIN`, `ORGANIZER`, and `PLAYER` roles
- Team creation and team joining via invite code
- Tournament creation, listing, details, and team registration
- Single elimination brackets with automatic winner propagation
- Dashboard with active tournaments, upcoming matches, and a simple leaderboard
- Seeded demo data for local testing

## Tech Stack

- **Frontend**: `Next.js 14`, `TypeScript`, `TailwindCSS`, shadcn-style UI components, `Framer Motion`
- **Backend**: `Express`, `TypeScript`, `Socket.IO`, `Zod`
- **Database**: `PostgreSQL`, `Prisma ORM`
- **Tooling**: npm workspaces, Docker support

## Project Structure

```
.
├── apps
│   ├── api
│   │   ├── prisma
│   │   └── src
│   └── web
│       └── src
├── docker-compose.yml
├── package.json
└── README.md
```

## Local Setup

### Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/qazaq-cyber-tournament-platform.git
cd qazaq-cyber-tournament-platform
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the example environment file and configure your variables:

```bash
cp .env.example .env
```

Edit `.env` with your database URL, JWT secret, and port values.

### 4. Start PostgreSQL

With Docker:

```bash
docker compose up -d db
```

### 5. Database Setup

```bash
npm run db:setup
```

This will generate Prisma client, run migrations, and seed the database with demo data.

### 6. Start Development Servers

```bash
npm run dev
```

This will start both the API server (port 4000) and the web app (port 3000).

## Demo Credentials

- **Admin**: admin@qazaq.gg / Demo12345
- **Organizer**: organizer@qazaq.gg / Demo12345
- **Player**: player@qazaq.gg / Demo12345

## Screenshots

<!-- Add screenshots here -->

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

This project is licensed under the MIT License.
```

Or point `DATABASE_URL` at an existing PostgreSQL instance.

### 3. Install Dependencies

```bash
npm install
```

`npm install` also generates the Prisma client automatically.

### 4. Prepare the Database

```bash
npm run db:setup
```

This will:

- generate the Prisma client
- push the schema to PostgreSQL
- seed demo users, teams, tournaments, participants, and live brackets

### 5. Start the App

```bash
npm run dev
```

Apps will be available at:

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api`

## Demo Accounts

- Admin: `admin@qazaq.gg` / `Demo12345`
- Organizer: `organizer@qazaq.gg` / `Demo12345`
- Player: `aruzhan@qazaq.gg` / `Demo12345`

## Useful Scripts

- `npm run dev` - start frontend and backend in development
- `npm run build` - build both apps
- `npm run lint` - run TypeScript checks for both apps
- `npm run db:generate` - generate Prisma client
- `npm run db:push` - push Prisma schema to PostgreSQL
- `npm run db:seed` - seed demo data
- `npm run db:setup` - generate, push, and seed in one command

## Docker

You can run PostgreSQL only:

```bash
docker compose up -d db
```

Or build the full stack:

```bash
docker compose up --build
```

## Notes

- Basic double elimination currently supports `4` or `8` approved teams without byes.
- Match results are treated as final once entered.
- Auth uses an HTTP-only JWT cookie shared across the frontend and backend on `localhost`.
