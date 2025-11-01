# Karaoke Battle Challenges - Implementation Plan

## Overview
Implement asynchronous karaoke battles where users can challenge friends to compete on the same song. Challenges have a 24-hour time limit, and winners receive points.

---

## Phase 1: Database Schema & Prisma Setup

### 1.1 Add Challenge Model to Prisma Schema
**File**: `prisma/schema.prisma`

```prisma
model Challenge {
  id              String        @id @default(cuid())
  challengerId    String        // User who initiated the challenge
  challengedId    String        // User being challenged
  songId          String        // Song to battle on
  status          ChallengeStatus @default(PENDING)
  
  // Scores (null until completed)
  challengerScore Int?
  challengedScore  Int?
  
  // Completion tracking
  challengerCompletedAt DateTime?
  challengedCompletedAt DateTime?
  
  // Winner (determined after both complete or timeout)
  winnerId        String?
  
  // Timing
  expiresAt       DateTime      // 24 hours after acceptance
  acceptedAt      DateTime?
  declinedAt      DateTime?
  completedAt     DateTime?     // When battle is finished (both done or timeout)
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  // Relations
  challenger      User          @relation("Challenger", fields: [challengerId], references: [id], onDelete: Cascade)
  challenged      User          @relation("Challenged", fields: [challengedId], references: [id], onDelete: Cascade)
  song            Song          @relation(fields: [songId], references: [id], onDelete: Cascade)
  winner          User?         @relation("Winner", fields: [winnerId], references: [id], onDelete: SetNull)
  
  @@map("challenges")
}

enum ChallengeStatus {
  PENDING       // Challenge sent, waiting for response
  ACCEPTED      // Challenge accepted, players can complete song
  DECLINED      // Challenge declined
  IN_PROGRESS   // At least one player has started
  COMPLETED     // Battle finished, winner determined
  EXPIRED       // Time limit expired
  CANCELLED     // Challenge cancelled by challenger
}
```

### 1.2 Update User Model
Add challenge relations to User model:
```prisma
challengesSent    Challenge[] @relation("Challenger")
challengesReceived Challenge[] @relation("Challenged")
challengesWon     Challenge[] @relation("Winner")
```

### 1.3 Update Song Model
Add challenge relation:
```prisma
challenges        Challenge[]
```

### 1.4 Run Migration
```bash
npx prisma migrate dev --name add_challenges
npx prisma generate
```

---

## Phase 2: API Routes - Core Challenge Operations

### 2.1 Create Challenge
**File**: `app/api/challenges/create/route.ts`
- Validate users are friends
- Check for existing pending challenge between users
- Create challenge with 24-hour expiration (set when accepted)
- Return challenge details

### 2.2 Accept Challenge
**File**: `app/api/challenges/[challengeId]/accept/route.ts`
- Validate challenge exists and is PENDING
- Set `acceptedAt` to now
- Set `expiresAt` to 24 hours from now
- Update status to ACCEPTED
- Trigger notification update

### 2.3 Decline Challenge
**File**: `app/api/challenges/[challengeId]/decline/route.ts`
- Validate challenge exists and is PENDING
- Set `declinedAt` to now
- Update status to DECLINED

### 2.4 Get User Challenges
**File**: `app/api/challenges/route.ts`
- GET endpoint
- Return challenges sent, received, active, completed
- Include related user and song data
- Filter by status (optional query param)

### 2.5 Get Challenge Details
**File**: `app/api/challenges/[challengeId]/route.ts`
- GET endpoint
- Return full challenge details with user and song info
- Check if current user is participant
- Include current scores if available

### 2.6 Submit Challenge Score
**File**: `app/api/challenges/[challengeId]/submit/route.ts`
- POST endpoint
- Validate user is participant
- Validate challenge is ACCEPTED or IN_PROGRESS
- Save score (challengerScore or challengedScore)
- Update status to IN_PROGRESS if first completion
- Check if both completed:
  - Determine winner (higher score)
  - Award 15,000 points to winner
  - Update experience/level
  - Set status to COMPLETED
  - Set completedAt

### 2.7 Challenge Stats
**File**: `app/api/challenges/stats/route.ts`
- GET endpoint
- Return user statistics:
  - Total challenges sent/received
  - Wins/Losses
  - Win rate
  - Average score
  - Best score
  - Challenges completed this week/month

### 2.8 Cancel Challenge
**File**: `app/api/challenges/[challengeId]/cancel/route.ts`
- POST endpoint
- Only challenger can cancel
- Only if status is PENDING
- Update status to CANCELLED

### 2.9 Process Expired Challenges (Background Job)
**File**: `app/api/challenges/process-expired/route.ts` (optional)
- Could be called by cron job
- Find challenges where expiresAt < now and status is ACCEPTED or IN_PROGRESS
- Determine winner (player who completed, or higher score if both started)
- Award points
- Set status to EXPIRED or COMPLETED

---

## Phase 3: Notification System

### 3.1 Challenge Notification Hook
**File**: `hooks/use-challenge-notifications.ts`
- Similar to `use-friend-request-notifications.ts`
- Poll for pending challenges received
- Return notifications with sender info and challenge details

### 3.2 Update Notification Bell
**File**: `components/notification-bell.tsx`
- Integrate challenge notifications
- Show badge with combined count (friend requests + challenges)
- Display challenge notifications with accept/decline buttons
- Separate tabs for friend requests and challenges

### 3.3 Challenge Notification Component
**File**: `components/challenge-notification.tsx`
- Display challenge details
- Show song name and challenger
- Accept/Decline buttons
- Link to gameplay page with challenge context

---

## Phase 4: UI Components - Challenge Creation

### 4.1 Challenge Button on Friends Page
**File**: `app/friends/page.tsx`
- Add "Challenge" button next to each friend
- Open challenge creation modal
- Select song from song list
- Create challenge via API

### 4.2 Challenge Modal Component
**File**: `components/challenge-modal.tsx`
- Song selection dropdown/search
- Display selected song info
- Confirm and send challenge
- Show success/error messages

### 4.3 Challenge from Multiplayer Mode
**File**: `app/gameplay/page.tsx` or song selection page
- When mode is "MULTIPLAYER", show friend selection
- Create challenge before starting gameplay
- Link gameplay to challenge ID

---

## Phase 5: Challenges Page

### 5.1 Create Challenges Page
**File**: `app/challenges/page.tsx`

**Sections**:
1. **Active Challenges** (PENDING, ACCEPTED, IN_PROGRESS)
   - Challenges I sent (pending acceptance)
   - Challenges I received (need to accept/decline)
   - In-progress challenges (need to complete)
   - Show countdown timer for active challenges

2. **Challenge History**
   - Completed challenges (with winner, scores)
   - Declined/Expired challenges
   - Pagination

3. **Statistics Dashboard**
   - Win/Loss record
   - Win rate percentage
   - Total challenges
   - Best score
   - Recent activity chart

4. **Quick Actions**
   - "Challenge Friend" button
   - "View All Challenges" link

### 5.2 Challenge Card Component
**File**: `components/challenge-card.tsx`
- Display challenge info
- Show both players
- Show song
- Show scores (if completed)
- Show status badge
- Show countdown timer
- "Challenge Again" button for completed challenges
- "Play Now" button for active challenges
- "View Details" link

### 5.3 Challenge Details Modal/Page
**File**: `components/challenge-details-modal.tsx` or `app/challenges/[challengeId]/page.tsx`
- Full challenge information
- Both players' scores
- Winner display
- Timeline of events
- Points awarded

---

## Phase 6: Gameplay Integration

### 6.1 Update Gameplay Page for Challenges
**File**: `app/gameplay/page.tsx`
- Accept `challengeId` query parameter
- When challengeId exists:
  - Load challenge data
  - Ensure user is participant
  - Ensure song matches challenge song
  - Show challenge context (opponent, time remaining)
  - On completion, submit score to challenge endpoint
  - Show opponent's score if they've completed

### 6.2 Challenge Context Component
**File**: `components/challenge-context.tsx`
- Display during gameplay
- Show opponent name and avatar
- Show their score (if completed)
- Show time remaining
- Motivational messages

### 6.3 Post-Game Challenge Results
**File**: `components/challenge-results.tsx`
- After completing challenge song
- Show your score
- Show opponent's score (if available)
- Show if you won/lost/pending
- Show if challenge is still waiting for opponent
- "View Challenge Details" button

---

## Phase 7: Background Jobs & Automation

### 7.1 Expiration Checker
**File**: `lib/challenge-expiration.ts`
- Function to check and process expired challenges
- Could be called:
  - On challenge submission
  - By cron job (if available)
  - On page load (lightweight check)

### 7.2 Auto-Complete Logic
- When checking expiration:
  - If one player completed: they win
  - If both started but time expired: highest score wins
  - Award points to winner
  - Update challenge status

---

## Phase 8: Points & Rewards System

### 8.1 Award Points on Win
**File**: `app/api/challenges/[challengeId]/submit/route.ts` (in completion logic)
- When challenge completes:
  - Determine winner
  - Call `/api/user/experience` with:
    - Base points: 15,000
    - Bonus for high score (optional)
    - Update user level/experience

### 8.2 Display Points in UI
- Show points awarded in challenge results
- Show in challenges page statistics
- Show in notification when challenge completes

---

## Phase 9: Polish & Edge Cases

### 9.1 Validation & Error Handling
- Prevent challenging yourself
- Prevent duplicate challenges (same users, same song, pending)
- Handle expired challenges gracefully
- Validate song exists
- Validate users are friends

### 9.2 UI/UX Enhancements
- Loading states
- Error messages
- Success confirmations
- Confirmation dialogs for decline/cancel
- Toast notifications for important actions

### 9.3 Analytics & Logging
- Log challenge creation, acceptance, completion
- Track win rates
- Track most challenged songs
- Track average completion time

---

## Implementation Order (Recommended)

1. **Phase 1** - Database schema (foundation)
2. **Phase 2** - Core API routes (create, accept, decline, submit)
3. **Phase 3** - Notification system (user awareness)
4. **Phase 4** - Challenge creation UI (Friends page, modals)
5. **Phase 5** - Challenges page (main feature hub)
6. **Phase 6** - Gameplay integration (complete the flow)
7. **Phase 7** - Expiration handling (automation)
8. **Phase 8** - Points system (rewards)
9. **Phase 9** - Polish & testing

---

## Key Considerations

### Performance
- Index `challengerId`, `challengedId`, `status`, `expiresAt` in database
- Cache challenge stats
- Lazy load challenge history

### Security
- Validate user authentication on all endpoints
- Ensure users can only submit scores for their own challenges
- Prevent score manipulation
- Rate limiting on challenge creation

### User Experience
- Clear status indicators
- Countdown timers for active challenges
- Easy "Challenge Again" flow
- Notifications for important events

### Scalability
- Background job for expiration (cron or queue)
- Batch processing for expired challenges
- Pagination for challenge history

---

## Testing Checklist

- [ ] Create challenge between friends
- [ ] Accept challenge
- [ ] Decline challenge
- [ ] Cancel pending challenge
- [ ] Complete challenge (both players)
- [ ] Handle expiration (one player)
- [ ] Handle expiration (neither player)
- [ ] Award points correctly
- [ ] Update stats accurately
- [ ] Notification bell shows challenges
- [ ] Challenges page displays correctly
- [ ] Gameplay integration works
- [ ] "Challenge Again" flow
- [ ] Edge cases (self-challenge, duplicates, etc.)

---

## Future Enhancements (Post-MVP)

- Rematch option (same song, new challenge)
- Challenge tournaments (bracket style)
- Global leaderboards for challenges
- Challenge streaks (consecutive wins)
- Special rewards for challenge achievements
- Challenge chat/messaging
- Spectator mode (view friends' challenges)
- Challenge replays (watch performance)

