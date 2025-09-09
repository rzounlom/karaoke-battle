export interface ScoringResult {
  totalScore: number;
  accuracy: number;
  timing: number;
  pitch: number;
  breakdown: {
    wordAccuracy: number;
    timingAccuracy: number;
    pitchAccuracy: number;
  };
  feedback: string[];
}

export interface LyricWord {
  word: string;
  startTime: number;
  endTime: number;
  pitch?: number;
}

export interface UserWord {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

/**
 * Calculate accuracy score based on word-by-word comparison
 */
export function calculateAccuracyScore(
  expectedWords: string[],
  userWords: string[]
): number {
  if (expectedWords.length === 0) return 0;

  let correctWords = 0;
  const totalWords = Math.max(expectedWords.length, userWords.length);

  // Simple word-by-word comparison
  for (let i = 0; i < Math.min(expectedWords.length, userWords.length); i++) {
    const expected = expectedWords[i].toLowerCase().trim();
    const user = userWords[i].toLowerCase().trim();

    if (expected === user) {
      correctWords++;
    } else {
      // Check for partial matches (e.g., "singin'" vs "singing")
      const similarity = calculateWordSimilarity(expected, user);
      if (similarity > 0.8) {
        correctWords += similarity;
      }
    }
  }

  return (correctWords / totalWords) * 100;
}

/**
 * Calculate timing accuracy based on word timing
 */
export function calculateTimingScore(
  expectedLyrics: LyricWord[],
  userWords: UserWord[]
): number {
  if (expectedLyrics.length === 0 || userWords.length === 0) return 0;

  let totalTimingError = 0;
  let validComparisons = 0;

  for (let i = 0; i < Math.min(expectedLyrics.length, userWords.length); i++) {
    const expected = expectedLyrics[i];
    const user = userWords[i];

    // Calculate timing error in milliseconds
    const startError = Math.abs(expected.startTime - user.startTime);
    const endError = Math.abs(expected.endTime - user.endTime);
    const avgError = (startError + endError) / 2;

    // Convert to percentage (500ms = 100% error, 0ms = 0% error)
    const timingAccuracy = Math.max(0, 100 - (avgError / 500) * 100);
    totalTimingError += timingAccuracy;
    validComparisons++;
  }

  return validComparisons > 0 ? totalTimingError / validComparisons : 0;
}

/**
 * Calculate pitch accuracy using real pitch data
 */
export function calculatePitchScore(
  expectedLyrics: LyricWord[],
  userWords: UserWord[],
  detectedPitchHz: number = 0
): number {
  if (detectedPitchHz <= 0) {
    // Fallback to confidence-based scoring if no pitch detected
    const baseScore = 70;
    const confidenceBonus =
      (userWords.reduce((sum, word) => sum + word.confidence, 0) /
        userWords.length) *
      30;
    return Math.min(100, baseScore + confidenceBonus);
  }

  // For now, we'll use a simple pitch stability score
  // In a full implementation, we'd compare against expected notes from the song
  const pitchRange = { min: 80, max: 800 }; // Human voice range in Hz

  if (detectedPitchHz < pitchRange.min || detectedPitchHz > pitchRange.max) {
    return 50; // Out of human voice range
  }

  // Calculate pitch stability score (simplified)
  // In reality, we'd compare against the song's melody
  const baseScore = 80;
  const pitchQuality = Math.min(20, Math.abs(detectedPitchHz - 220) / 10); // Rough quality metric

  return Math.min(100, baseScore + pitchQuality);
}

/**
 * Calculate word similarity using Levenshtein distance
 */
function calculateWordSimilarity(word1: string, word2: string): number {
  const matrix = Array(word2.length + 1)
    .fill(null)
    .map(() => Array(word1.length + 1).fill(null));

  for (let i = 0; i <= word1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= word2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= word2.length; j++) {
    for (let i = 1; i <= word1.length; i++) {
      const indicator = word1[i - 1] === word2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  const maxLength = Math.max(word1.length, word2.length);
  return maxLength === 0
    ? 1
    : (maxLength - matrix[word2.length][word1.length]) / maxLength;
}

/**
 * Main scoring function that combines all metrics
 */
export function calculateKaraokeScore(
  expectedLyrics: LyricWord[],
  userTranscript: string,
  userWords: UserWord[],
  detectedPitchHz: number = 0
): ScoringResult {
  // Extract expected words
  const expectedWords = expectedLyrics.map((lyric) => lyric.word);

  // Extract user words from transcript
  const userWordList = userTranscript
    .split(/\s+/)
    .filter((word) => word.length > 0);

  // Calculate individual scores
  const accuracy = calculateAccuracyScore(expectedWords, userWordList);
  const timing = calculateTimingScore(expectedLyrics, userWords);
  const pitch = calculatePitchScore(expectedLyrics, userWords, detectedPitchHz);

  // Calculate weighted total score
  const totalScore = accuracy * 0.5 + timing * 0.3 + pitch * 0.2;

  // Generate feedback
  const feedback = generateFeedback(accuracy, timing, pitch);

  return {
    totalScore: Math.round(totalScore),
    accuracy: Math.round(accuracy),
    timing: Math.round(timing),
    pitch: Math.round(pitch),
    breakdown: {
      wordAccuracy: Math.round(accuracy),
      timingAccuracy: Math.round(timing),
      pitchAccuracy: Math.round(pitch),
    },
    feedback,
  };
}

/**
 * Generate feedback based on performance
 */
function generateFeedback(
  accuracy: number,
  timing: number,
  pitch: number
): string[] {
  const feedback: string[] = [];

  if (accuracy < 70) {
    feedback.push("Work on pronunciation and word clarity");
  } else if (accuracy > 90) {
    feedback.push("Excellent word accuracy!");
  }

  if (timing < 70) {
    feedback.push("Try to match the song's rhythm better");
  } else if (timing > 90) {
    feedback.push("Perfect timing!");
  }

  if (pitch < 70) {
    feedback.push("Focus on hitting the right notes");
  } else if (pitch > 90) {
    feedback.push("Great pitch control!");
  }

  if (feedback.length === 0) {
    feedback.push("Good overall performance!");
  }

  return feedback;
}

/**
 * Convert transcript to timed words
 */
export function parseTranscriptToWords(
  transcript: string,
  startTime: number,
  endTime: number
): UserWord[] {
  const words = transcript.split(/\s+/).filter((word) => word.length > 0);
  const wordCount = words.length;

  if (wordCount === 0) return [];

  const timePerWord = (endTime - startTime) / wordCount;

  return words.map((word, index) => ({
    word,
    startTime: startTime + index * timePerWord,
    endTime: startTime + (index + 1) * timePerWord,
    confidence: 0.8, // Default confidence
  }));
}
