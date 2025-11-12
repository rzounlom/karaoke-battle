# Tournament Mode Feature - Action Plan

## Overview

Create a real-time, turn-based tournament system similar to Kahoot/Jackbox Games where:

- Host creates a tournament session with a shareable link
- Players join via link with temporary usernames (must sign up/login to play)
- Turn-based gameplay: each player picks a song and sings
- Real-time score tracking and leaderboard
- Winner determined by highest total score

---

## Technical Architecture Decisions

### Real-Time Communication

**Solution: Ably (Managed WebSocket Service)**

**Why Ably:**

- ✅ **Free tier**: 3M messages/month, 200 concurrent connections (perfect for MVP)
- ✅ **Works with Vercel**: No separate server needed, works with serverless functions
- ✅ **Presence API**: Built-in "who's online" tracking for lobbies
- ✅ **Scalable**: Paid tiers available ($29/month for 10K connections, $399/month for 50K)
- ✅ **Reliable**: Message ordering, delivery guarantees, reconnection handling
- ✅ **Easy integration**: Great Next.js support, TypeScript types, React hooks

**Ably Features We'll Use:**

- **Channels**: One channel per tournament session (`tournament:{sessionCode}`)
- **Presence**: Track who's in the lobby, ready status
- **Publish/Subscribe**: Broadcast events (player joined, turn started, score submitted)
- **Channel History**: Optional replay of events for reconnection

**Pricing Tiers:**

- **Free (Sandbox)**: 200 concurrent connections, 3M messages/month - Perfect for MVP
- **Standard ($29/month)**: 10,000 concurrent connections - For growth
- **Pro ($399/month)**: 50,000 concurrent connections - For scale

### Session Management

- Unique session codes (6-8 character alphanumeric)
- Session state stored in database (source of truth)
- Ably channels for real-time state synchronization
- Session expiration (e.g., 2 hours of inactivity)

---

## Stage 1: Database Schema & Core Models

**Goal:** Set up data models for tournament sessions

### 1.1 Database Schema Updates

#### New Model: TournamentSession

```prisma
model TournamentSession {
  id            String                @id @default(cuid())
  sessionCode   String                @unique // 6-8 char code for joining
  hostId        String                // User who created (must have account)
  name          String?               // Optional session name
  status        TournamentSessionStatus @default(WAITING)
  currentTurn   Int                   @default(0) // Current turn number
  maxPlayers    Int                   @default(8)
  settings      Json?                 // Tournament settings (rounds, time limits, etc.)

  // Timing
  startedAt     DateTime?
  endedAt       DateTime?
  expiresAt     DateTime?             // Auto-expire inactive sessions

  createdAt     DateTime              @default(now())
  updatedAt     DateTime              @updatedAt

  // Relations
  host          User                  @relation("TournamentHost", fields: [hostId], references: [id], onDelete: Cascade)
  participants  TournamentParticipant[]
  turns         TournamentTurn[]

  @@index([sessionCode])
  @@index([status])
  @@index([hostId])
  @@map("tournament_sessions")
}
```

#### New Model: TournamentParticipant

```prisma
model TournamentParticipant {
  id              String   @id @default(cuid())
  sessionId       String
  userId          String?  // Null if not logged in yet (temporary username)
  temporaryName   String?  // Display name before account creation
  displayName     String   // Final display name (username or temporaryName)
  turnOrder       Int      // Order in which they play
  totalScore      Int      @default(0)
  isReady         Boolean  @default(false)
  hasAccount      Boolean  @default(false) // Whether they have an account

  // Timing
  joinedAt        DateTime @default(now())
  lastActiveAt    DateTime @default(now())

  // Relations
  session         TournamentSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user            User?             @relation("TournamentParticipant", fields: [userId], references: [id], onDelete: SetNull)
  turns           TournamentTurn[]

  @@unique([sessionId, userId]) // userId can be null, so need composite unique
  @@index([sessionId])
  @@index([userId])
  @@map("tournament_participants")
}
```

#### New Model: TournamentTurn

```prisma
model TournamentTurn {
  id              String   @id @default(cuid())
  sessionId       String
  participantId   String
  turnNumber      Int      // Which turn in the tournament (1, 2, 3...)
  songId          String?  // Song selected for this turn
  score           Int?     // Score achieved (null until completed)
  status          TurnStatus @default(PENDING) // PENDING, IN_PROGRESS, COMPLETED, SKIPPED

  // Timing
  startedAt       DateTime?
  completedAt     DateTime?
  expiresAt       DateTime? // Time limit for this turn

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  session         TournamentSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  participant     TournamentParticipant @relation(fields: [participantId], references: [id], onDelete: Cascade)
  song            Song?              @relation(fields: [songId], references: [id], onDelete: SetNull)

  @@unique([sessionId, turnNumber]) // One turn per turn number per session
  @@index([sessionId])
  @@index([participantId])
  @@index([status])
  @@map("tournament_turns")
}
```

#### New Enums

```prisma
enum TournamentSessionStatus {
  WAITING      // Waiting for players to join
  STARTING     // Countdown/ready check
  IN_PROGRESS  // Tournament active
  COMPLETED    // Tournament finished
  CANCELLED    // Host cancelled
  EXPIRED      // Session expired
}

enum TurnStatus {
  PENDING      // Turn not started yet
  IN_PROGRESS  // Player is currently playing
  COMPLETED    // Turn finished with score
  SKIPPED      // Turn skipped/timed out
}
```

#### Update User Model

```prisma
model User {
  // ... existing fields ...

  // Add relations
  tournamentSessionsHosted TournamentSession[] @relation("TournamentHost")
  tournamentParticipations TournamentParticipant[] @relation("TournamentParticipant")
}
```

#### Update Song Model

```prisma
model Song {
  // ... existing fields ...

  // Add relation
  tournamentTurns TournamentTurn[]
}
```

### 1.2 Migration Tasks

- Create migration for new models
- Generate Prisma client
- Test database relationships

**Estimated Time:** 2-3 hours

---

## Stage 2: Session Creation & Link Sharing

**Goal:** Host can create a tournament session and share a link

### 2.1 API Routes

#### POST `/api/tournament/create`

- Create new tournament session
- Generate unique session code
- Set host as first participant
- Return session code and join URL

**Request:**

```json
{
  "name": "Friday Night Karaoke",
  "maxPlayers": 8,
  "settings": {
    "rounds": 1, // Each player plays once
    "turnTimeLimit": 300, // 5 minutes per turn (gameplay time)
    "songSelectionTimeLimit": 60 // 60 seconds to select a song
  }
}
```

**Response:**

```json
{
  "success": true,
  "session": {
    "id": "...",
    "sessionCode": "ABC123",
    "joinUrl": "/tournament/join/ABC123",
    "status": "WAITING"
  }
}
```

### 2.2 UI Components

#### Tournament Creation Modal/Page

- Form to create tournament
- Settings: max players, rounds, time limits
- Display session code and shareable link
- Copy link button
- QR code for easy mobile sharing (optional)

### 2.3 Features

- Session code generation (6-8 alphanumeric, unique)
- Shareable link format: `/tournament/join/{code}`
- Session expiration handling
- Host controls (start, cancel, kick players)

**Estimated Time:** 3-4 hours

---

## Stage 3: Join Flow & Authentication

**Goal:** Players can join via link and authenticate

### 3.1 Join Page: `/tournament/join/[code]`

#### For Unauthenticated Users:

1. Display session info (host name, current players, max players)
2. Prompt for temporary username
3. Show "Sign up to play" button
4. After sign up/login, link temporary username to account

#### For Authenticated Users:

1. Display session info
2. Show "Join Tournament" button
3. Add user as participant immediately

### 3.2 API Routes

#### GET `/api/tournament/session/[code]`

- Get session details (without sensitive info)
- Check if user can join
- Return current participants (display names only)

#### POST `/api/tournament/join`

- Join session with temporary username OR authenticated user
- Validate session code
- Check max players limit
- Assign turn order
- Return participant info

**Request:**

```json
{
  "sessionCode": "ABC123",
  "temporaryName": "Player1" // Optional if authenticated
}
```

### 3.3 Temporary Username System

- Store temporary name in `TournamentParticipant.temporaryName`
- When user signs up/logs in, link to account
- Display name logic: `displayName = user.username || temporaryName`
- Prevent duplicate temporary names in same session

**Estimated Time:** 4-5 hours

---

## Stage 4: Lobby/Waiting Room

**Goal:** Players wait in lobby until host starts

### 4.1 Lobby Page: `/tournament/lobby/[code]`

#### Features:

- Real-time participant list (polling or WebSocket)
- Player avatars/display names
- Turn order display
- Ready status per player
- Host controls (start tournament, kick player)
- Leave tournament button
- Session expiration countdown

### 4.2 API Routes

#### GET `/api/tournament/lobby/[code]`

- Get full session state
- Participant list with status
- Host info
- Settings

#### POST `/api/tournament/ready`

- Toggle ready status
- Validate user is participant

#### POST `/api/tournament/start` (Host only)

- Validate all players ready (or minimum threshold)
- Change status to STARTING → IN_PROGRESS
- Initialize first turn
- Return first turn info

### 4.3 Real-Time Updates with Ably

- Subscribe to tournament channel using Ably
- Listen for `player_joined`, `player_left`, `player_ready` events
- Use Presence API to show who's online
- Show real-time updates when players join/leave/ready
- Show when host starts tournament
- No polling needed - instant updates via WebSocket

**Estimated Time:** 4-5 hours

---

## Stage 5: Turn Management System

**Goal:** Manage turn order and transitions

### 5.1 Turn Flow Logic

1. **Turn Initialization**

   - When tournament starts, create `TournamentTurn` for first player
   - Set status to PENDING
   - Display "Your turn!" to current player

2. **Turn Start**

   - Current player has 60 seconds to select a song
   - If song selected within time limit:
     - Update turn with songId
     - Update turn status to IN_PROGRESS
     - Set `startedAt` and `expiresAt` (gameplay time limit)
     - Redirect to gameplay with turn context
   - If time expires without song selection:
     - Mark turn as SKIPPED
     - Score = 0
     - Move to next turn

3. **Turn Completion**

   - Player finishes singing
   - Submit score via API
   - Update turn status to COMPLETED
   - Update participant total score
   - Move to next turn

4. **Turn Timeout**
   - If `expiresAt` passed and status still IN_PROGRESS
   - Mark as SKIPPED
   - Score = 0
   - Move to next turn

### 5.2 API Routes

#### GET `/api/tournament/turn/current`

- Get current turn info
- Check if it's user's turn
- Return song selection status

#### POST `/api/tournament/turn/select-song`

- Current player selects song for their turn
- Validate it's their turn
- Update turn with songId
- Return confirmation

#### POST `/api/tournament/turn/submit-score`

- Submit score after gameplay
- Validate turn is IN_PROGRESS
- Update turn score and status
- Update participant total score
- **Award XP to signed-in users** (`hasAccount: true`):
  - Calculate XP from score using `calculateExperienceFromScore()`
  - Update user's experience and level in database
  - Only authenticated users with accounts receive XP
  - Temporary/guest users do NOT receive XP
- Trigger next turn creation
- Return updated leaderboard

#### GET `/api/tournament/leaderboard`

- Get current leaderboard
- Sorted by total score
- Include all participants

### 5.3 Turn State Machine

```
PENDING → IN_PROGRESS → COMPLETED
         ↓
      SKIPPED (timeout)
```

**Estimated Time:** 6-8 hours

---

## Stage 6: Gameplay Integration

**Goal:** Integrate tournament turns with existing gameplay

### 6.1 Gameplay Page Updates

#### Tournament Mode Detection

- Check URL params: `?tournamentSession={code}&turnId={id}`
- Load tournament context
- Show tournament-specific UI:
  - Current turn indicator
  - Time remaining
  - Leaderboard sidebar
  - "Next player's turn" message after completion

#### Score Submission

- After gameplay, submit to tournament API
- Show "Score submitted!" confirmation
- Redirect to tournament lobby/waiting area
- Show next player's turn

### 6.2 Tournament-Specific UI

- Turn number indicator
- "Player X's Turn" banner
- Leaderboard widget
- Time limit countdown
- Skip turn button (if time expires)

**Estimated Time:** 4-5 hours

---

## Stage 7: Real-Time Updates & Synchronization with Ably

**Goal:** All players see updates in real-time using Ably

### 7.1 Ably Setup

#### Installation

```bash
npm install ably
```

#### Environment Variables

```env
ABLY_API_KEY=your_ably_api_key_here
```

#### Ably Client Setup (Server-side)

Create `lib/ably-server.ts`:

```typescript
import Ably from "ably";

let ablyClient: Ably.Realtime | null = null;

export function getAblyServer() {
  if (!ablyClient) {
    ablyClient = new Ably.Realtime(process.env.ABLY_API_KEY!);
  }
  return ablyClient;
}

export function getTournamentChannel(sessionCode: string) {
  return getAblyServer().channels.get(`tournament:${sessionCode}`);
}
```

#### Ably Client Setup (Client-side)

Create `lib/ably-client.ts`:

```typescript
import Ably from "ably";

export function getAblyClient(token: string) {
  return new Ably.Realtime({ token });
}

// Token will be generated server-side via API route
```

### 7.2 Channel Structure

#### Channel Naming

- Format: `tournament:{sessionCode}`
- Example: `tournament:ABC123`
- Each tournament session has its own channel

#### Channel Capabilities

- **Presence**: Track who's online in the lobby
- **Messages**: Broadcast events to all participants
- **History**: Optional message history for reconnection

### 7.3 Events to Broadcast

#### Event Types

```typescript
type TournamentEvent =
  | { type: "player_joined"; data: { participant: ParticipantInfo } }
  | { type: "player_left"; data: { participantId: string } }
  | { type: "player_ready"; data: { participantId: string; isReady: boolean } }
  | { type: "tournament_started"; data: { firstTurn: TurnInfo } }
  | {
      type: "turn_started";
      data: { turn: TurnInfo; participant: ParticipantInfo };
    }
  | { type: "song_selected"; data: { turnId: string; songId: string } }
  | {
      type: "score_submitted";
      data: { turnId: string; score: number; participantId: string };
    }
  | { type: "turn_completed"; data: { turnId: string; nextTurn?: TurnInfo } }
  | {
      type: "tournament_ended";
      data: { winner: ParticipantInfo; leaderboard: LeaderboardEntry[] };
    }
  | { type: "session_updated"; data: { session: TournamentSession } };
```

### 7.4 Server-Side Implementation

#### API Route: `/api/tournament/ably-token`

Generate Ably token for authenticated users:

```typescript
import { getAblyServer } from "@/lib/ably-server";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tokenRequest = await getAblyServer().auth.createTokenRequest({
    clientId: user.id,
    capability: {
      [`tournament:*`]: ["subscribe", "presence"], // Allow subscribing to any tournament channel
    },
  });

  return Response.json(tokenRequest);
}
```

#### Broadcasting Events

In API routes, publish events to Ably:

```typescript
import { getTournamentChannel } from "@/lib/ably-server";

// When player joins
const channel = getTournamentChannel(sessionCode);
await channel.publish("player_joined", {
  participant: participantData,
});

// When turn starts
await channel.publish("turn_started", {
  turn: turnData,
  participant: participantData,
});
```

### 7.5 Client-Side Implementation

#### React Hook: `useTournamentChannel`

```typescript
import { useEffect, useState } from "react";
import { getAblyClient } from "@/lib/ably-client";

export function useTournamentChannel(sessionCode: string, token: string) {
  const [channel, setChannel] = useState<any>(null);
  const [presence, setPresence] = useState<any[]>([]);

  useEffect(() => {
    const ably = getAblyClient(token);
    const channel = ably.channels.get(`tournament:${sessionCode}`);

    // Subscribe to messages
    channel.subscribe((message) => {
      // Handle event based on message.name
      handleEvent(message.name, message.data);
    });

    // Enter presence
    channel.presence.enter({ clientId: userId });

    // Subscribe to presence updates
    channel.presence.subscribe((presenceMessage) => {
      // Update presence list
      updatePresence(presenceMessage);
    });

    setChannel(channel);

    return () => {
      channel.presence.leave();
      channel.unsubscribe();
      ably.close();
    };
  }, [sessionCode, token]);

  return { channel, presence };
}
```

### 7.6 Presence Management

#### Track Who's Online

- Use Ably Presence API to show who's in the lobby
- Show ready status in presence metadata
- Update UI when players join/leave
- Handle disconnections gracefully

#### Presence Metadata

```typescript
channel.presence.enter({
  clientId: userId,
  data: {
    displayName: participant.displayName,
    isReady: participant.isReady,
    turnOrder: participant.turnOrder,
  },
});
```

### 7.7 Error Handling & Reconnection

#### Ably Built-in Features

- Automatic reconnection
- Connection state management
- Message queuing during disconnection
- Channel history for missed messages (optional)

#### Client-Side Handling

- Show connection status indicator
- Handle reconnection gracefully
- Sync state after reconnection
- Show toast notifications for connection issues

**Estimated Time:** 6-8 hours

---

## Stage 8: Tournament Completion & Results

**Goal:** Display results and winner

### 8.1 Tournament End Logic

- When all turns completed
- Calculate final scores
- Determine winner (highest total score)
- Update session status to COMPLETED
- Set `endedAt` timestamp

### 8.2 Results Page

- Final leaderboard
- Winner announcement
- Individual turn scores breakdown
- "Play Again" option
- Share results button

### 8.3 API Routes

#### GET `/api/tournament/results/[code]`

- Get final tournament results
- Leaderboard with all scores
- Winner info
- Turn-by-turn breakdown

### 8.4 Post-Tournament Actions

- Save tournament results to database (optional)
- **Award XP/points to signed-in participants only**:
  - Only users with `hasAccount: true` receive XP
  - Calculate XP from each turn's score using `calculateExperienceFromScore()`
  - Update user's total experience and level
  - Guest users (temporary names) do NOT receive XP
  - Winner bonus: Additional XP for tournament winner (optional)
- Send notifications (optional)

**Estimated Time:** 3-4 hours

---

## Stage 9: Polish & Edge Cases

**Goal:** Handle edge cases and improve UX

### 9.1 Edge Cases

- Host leaves/disconnects (transfer host or end session)
- Player disconnects mid-turn (timeout handling)
- Session expiration (cleanup)
- Duplicate session codes (regenerate)
- Max players reached
- Invalid session codes
- Player tries to join twice
- Turn timeout handling

### 9.2 UX Improvements

- Loading states
- Error handling
- Toast notifications
- Confirmation dialogs
- Mobile responsiveness
- Accessibility
- Animations/transitions

### 9.3 Testing

- Unit tests for turn logic
- Integration tests for API routes
- E2E tests for full tournament flow
- Load testing for concurrent sessions

**Estimated Time:** 6-8 hours

---

## Stage 10: Advanced Features (Future)

**Goal:** Enhance tournament experience

### 10.1 Features

- Custom tournament settings (song categories, difficulty filters)
- Spectator mode (watch without playing)
- Tournament replays/history
- Tournament templates/presets
- Private/public tournaments
- Tournament chat
- Emoji reactions
- Song voting (players vote on next song)
- Elimination rounds
- Team tournaments

**Estimated Time:** Variable

---

## Implementation Priority

### Phase 1 (MVP): Stages 1-6

- Core functionality: create, join, play, complete
- Basic turn management
- **Total: ~25-35 hours**

### Phase 2 (Real-Time & Polish): Stages 7-9

- Real-time updates with Ably
- Edge case handling
- UX improvements
- **Total: ~15-20 hours**

### Phase 3 (Enhancements): Stage 10

- Advanced features
- **Total: Variable**

---

## Technical Considerations

### Security

- Validate session codes server-side
- Prevent unauthorized turn submissions
- Rate limiting on API routes
- Input validation and sanitization
- CSRF protection

### Performance

- Database indexing on session codes
- Caching session state (Redis optional)
- Optimize queries (avoid N+1)
- Pagination for large participant lists

### Scalability

- Ably handles WebSocket scaling automatically
- Free tier: 200 concurrent connections (~20 tournaments)
- Standard tier ($29/month): 10,000 connections (~1,000 tournaments)
- Pro tier ($399/month): 50,000 connections (~5,000 tournaments)
- Database connection pooling
- Session cleanup jobs (cron)
- Load balancing considerations (handled by Vercel)

---

## Dependencies to Add

### Required

- `ably` - Ably real-time messaging SDK
  ```bash
  npm install ably
  ```

### Optional

- `qrcode` - QR code generation for easy mobile sharing
  ```bash
  npm install qrcode @types/qrcode
  ```

### Ably Account Setup

1. Sign up for free Ably account at https://ably.com
2. Create a new app
3. Copy API key from dashboard
4. Add to `.env`:
   ```env
   ABLY_API_KEY=your_api_key_here
   ```
5. Free tier includes:
   - 200 concurrent connections
   - 3M messages/month
   - Perfect for MVP and early development

---

## Database Migration Strategy

1. Create new models in schema
2. Generate migration: `npx prisma migrate dev --name add_tournament_sessions`
3. Test migration on dev database
4. Deploy migration to production

---

## Next Steps

1. **Review this plan** - Adjust priorities and scope
2. **Start with Stage 1** - Database schema
3. **Iterate** - Build and test each stage before moving on
4. **Gather feedback** - Test with real users early

---

## Questions to Resolve

1. **Turn order**: Random or join order?
2. **Song selection**: Free choice or voting?
3. **Time limits**: Per turn? Per song selection?
4. **Scoring**: Use existing scoring system or tournament-specific?
5. **Reconnection**: What if player disconnects mid-turn?
6. **Host privileges**: Can host skip turns? Kick players?
7. **Session persistence**: Save tournament history?
8. **XP/Points**: Award points for tournament participation?

---

## Ably Integration Notes

### Channel Naming Convention

- Format: `tournament:{sessionCode}`
- Example: `tournament:ABC123`
- Each tournament session = one Ably channel

### Token Authentication

- Generate Ably tokens server-side via API route
- Tokens include user ID and channel permissions
- Tokens expire (default 1 hour, configurable)
- Refresh tokens as needed

### Presence Use Cases

- Show who's in the lobby (real-time player list)
- Track ready status per player
- Show connection status (online/offline)
- Handle disconnections gracefully

### Message Publishing

- Server publishes events after database updates
- Events include relevant data (participant info, scores, etc.)
- Clients subscribe and update UI reactively
- Message ordering guaranteed by Ably

### Error Handling

- Ably handles reconnection automatically
- Show connection status to users
- Queue messages during disconnection
- Sync state after reconnection

### Performance Considerations

- Ably handles all WebSocket infrastructure
- No need for separate server
- Works seamlessly with Vercel serverless
- Scales automatically based on tier

---

This plan provides a comprehensive roadmap for building the tournament feature in manageable stages. Each stage builds on the previous one, allowing for iterative development and testing. Ably integration provides real-time capabilities from the start without requiring separate infrastructure.
