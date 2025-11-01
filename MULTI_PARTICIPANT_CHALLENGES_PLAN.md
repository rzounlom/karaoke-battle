# Multi-Participant Challenges Implementation Plan

## Overview
Transform challenges from 1-to-1 battles to support multiple participants (1 or more friends). Winner gets 15,000 points per person they beat.

---

## Complexity Assessment

**Difficulty**: Medium-High
**Estimated Time**: 4-6 hours of focused development
**Breaking Changes**: Yes - requires database migration

---

## Required Changes

### 1. Database Schema Changes (High Priority)

#### New Model: ChallengeParticipant
```prisma
model ChallengeParticipant {
  id            String          @id @default(cuid())
  challengeId   String
  userId        String
  status        ParticipantStatus @default(PENDING)
  score         Int?
  completedAt   DateTime?
  acceptedAt    DateTime?
  declinedAt    DateTime?
  
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  
  // Relations
  challenge     Challenge       @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  user          User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([challengeId, userId])
  @@index([challengeId])
  @@index([userId])
  @@index([status])
  @@map("challenge_participants")
}

enum ParticipantStatus {
  PENDING
  ACCEPTED
  DECLINED
}
```

#### Updated Challenge Model
```prisma
model Challenge {
  id           String          @id @default(cuid())
  challengerId String          // Creator of challenge (always included)
  songId       String
  status       ChallengeStatus @default(PENDING)
  winnerId     String?
  
  expiresAt    DateTime?       // 24 hours after first acceptance
  completedAt  DateTime?
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
  
  // Relations
  challenger   User            @relation("Challenger", fields: [challengerId], references: [id], onDelete: Cascade)
  song         Song            @relation(fields: [songId], references: [id], onDelete: Cascade)
  winner       User?           @relation("Winner", fields: [winnerId], references: [id], onDelete: SetNull)
  participants ChallengeParticipant[]
  
  @@map("challenges")
}
```

**Changes:**
- Remove: `challengedId`, `challengerScore`, `challengedScore`, `challengerCompletedAt`, `challengedCompletedAt`, `acceptedAt`, `declinedAt`
- Keep: `challengerId` (creator), `songId`, `status`, `winnerId`, `expiresAt`, `completedAt`
- Add: `participants` relation

---

### 2. API Route Updates

#### 2.1 Create Challenge (`/api/challenges/create`)
**Current**: Accepts `friendId` (single)
**New**: Accepts `friendIds` (array)

Changes:
- Accept array of friendIds
- Create ChallengeParticipant records for each friend (excluding challenger)
- Create one ChallengeParticipant for challenger with status ACCEPTED (auto-accepted)
- Validation: At least 1 friendId required, all must be friends

#### 2.2 Accept Challenge (`/api/challenges/[challengeId]/accept`)
**Current**: Updates Challenge status to ACCEPTED
**New**: Updates participant status + challenge status if first acceptance

Changes:
- Find ChallengeParticipant for current user
- Update participant status to ACCEPTED
- If this is the first acceptance (no other ACCEPTED participants):
  - Set challenge status to ACCEPTED
  - Set expiresAt to 24 hours from now
- If challenge already has ACCEPTED participants, just update participant

#### 2.3 Decline Challenge (`/api/challenges/[challengeId]/decline`)
**Changes:**
- Update ChallengeParticipant status to DECLINED
- If all participants decline, challenge status could be CANCELLED? (optional)

#### 2.4 Submit Score (`/api/challenges/[challengeId]/submit`)
**Major Changes:**
- Update ChallengeParticipant.score for current user
- Check if all ACCEPTED participants have submitted scores
- Winner calculation:
  - Find participant with highest score
  - Calculate points: 15,000 * (number of other participants who submitted)
- Award points to winner

#### 2.5 Get Challenges (`/api/challenges`)
**Changes:**
- Include participants array with user details
- Include scores and status for each participant
- Filter challenges where user is a participant

---

### 3. UI Component Updates

#### 3.1 Challenge Modal (Friends Page)
**Changes:**
- Multi-select checkboxes instead of single selection
- Show selected count
- "Challenge X friends" button

#### 3.2 Multiplayer Friend Modal (Songs Page)
**Changes:**
- Multi-select friends
- Show selected friends at bottom
- "Challenge X friends" button

#### 3.3 Challenge Display Components
**Changes:**
- Show all participants, not just challenger/challenged
- Show participant statuses (Pending, Accepted, Completed)
- Show all scores in results

---

### 4. Business Logic Changes

#### 4.1 Challenge Status Flow
- **PENDING**: Challenge created, waiting for responses
- **ACCEPTED**: At least one participant accepted (challenge is active)
- **IN_PROGRESS**: At least one participant submitted score
- **COMPLETED**: All accepted participants submitted, winner determined
- **EXPIRED**: Time limit expired
- **CANCELLED**: Creator cancelled or all declined

#### 4.2 Acceptance Logic
- Challenger is auto-accepted (status ACCEPTED on creation)
- Any other participant can accept
- **Key**: "Only one person has to accept for challenge to take place"
  - First acceptance (after challenger) activates the challenge
  - Sets expiresAt to 24 hours from first acceptance
  - Others can still accept later (within 24 hours)

#### 4.3 Winner Calculation
```typescript
// Get all participants with scores (completed)
const completedParticipants = participants.filter(p => p.score !== null);

// Find highest score
const winner = completedParticipants.reduce((prev, curr) => 
  (curr.score || 0) > (prev.score || 0) ? curr : prev
);

// Calculate points: 15,000 per person they beat
const points = 15000 * (completedParticipants.length - 1);
```

#### 4.4 Points Awarding
- Winner gets: `15,000 * (number of other participants who completed)`
- Example: 4 participants complete
  - Winner beats 3 people
  - Winner gets: 15,000 * 3 = 45,000 points

---

## Implementation Steps

### Step 1: Database Migration
1. Create ChallengeParticipant model
2. Add ParticipantStatus enum
3. Update Challenge model (remove old fields, add participants relation)
4. Migrate data (if any existing challenges exist)
5. Update User model relations

### Step 2: Update API Routes
1. Update `/api/challenges/create` (accept array, create participants)
2. Update `/api/challenges/[challengeId]/accept` (participant-level)
3. Update `/api/challenges/[challengeId]/decline` (participant-level)
4. Update `/api/challenges/[challengeId]/submit` (participant scores, winner calc)
5. Update `/api/challenges/route.ts` (include participants)
6. Update `/api/challenges/[challengeId]/route.ts` (include participants)

### Step 3: Update UI Components
1. Update ChallengeModal (multi-select)
2. Update MultiplayerFriendModal (multi-select)
3. Create/update challenge display components
4. Update notifications to show multiple participants

### Step 4: Testing
1. Test challenge creation with multiple friends
2. Test acceptance flow (first acceptance activates)
3. Test score submission with multiple participants
4. Test winner calculation and points awarding
5. Test edge cases (all decline, expiration, etc.)

---

## Migration Strategy

### For Existing Data
If there are existing challenges in the database:
```sql
-- Migrate existing challenges to new structure
-- Create ChallengeParticipant records for existing challenger/challenged
-- Mark as ACCEPTED if challenge was ACCEPTED
-- Set scores from challengerScore/challengedScore
```

### Zero-Downtime Approach
1. Add new fields/tables
2. Update code to write to both old and new structure temporarily
3. Migrate existing data
4. Remove old fields/tables

---

## Considerations

### Edge Cases
1. **All participants decline**: Challenge status = CANCELLED?
2. **Only challenger accepts**: Challenge still active, they win by default if no one else accepts/completes?
3. **Partial completion**: Some participants complete, some don't - how to handle expiration?
4. **Ties**: Multiple participants with same highest score - split points?

### User Experience
1. **Notifications**: Each participant gets a notification when challenge is created
2. **Display**: Show participant list, statuses, scores clearly
3. **Countdown**: Show time remaining from first acceptance (not creation)
4. **Progress**: Show how many participants have accepted/completed

---

## Estimated Effort Breakdown

- **Database Schema**: 30 minutes
- **API Route Updates**: 2-3 hours
- **UI Component Updates**: 1-2 hours
- **Testing & Edge Cases**: 1 hour
- **Total**: ~4-6 hours

---

## Recommendation

This is definitely doable! The hardest part is the database migration, but since you're in development, that's manageable. The logic changes are straightforward - mostly refactoring from 1-to-1 to many-to-many relationships.

**Suggested Approach:**
1. Start with database schema changes
2. Update API routes incrementally (test as you go)
3. Update UI components last (they depend on API)
4. Test thoroughly with multiple participants

Would you like me to start implementing this? I'd recommend doing it in phases similar to the original plan.

