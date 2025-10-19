export interface ScoringResult {
  totalScore: number;
  accuracy: number;
  timing: number;
  breakdown: {
    wordAccuracy: number;
    timingAccuracy: number;
  };
  feedback: string[];
}

export interface LyricWord {
  word: string;
  startTime: number;
  endTime: number;
}

export interface UserWord {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

/**
 * Calculate accuracy score based on word-by-word comparison with karaoke-friendly improvements
 */
export function calculateAccuracyScore(
  expectedWords: string[],
  userWords: string[]
): number {
  console.log("🎯 calculateAccuracyScore called:", {
    expectedWords,
    userWords,
    expectedLength: expectedWords.length,
    userLength: userWords.length,
  });

  if (expectedWords.length === 0) {
    console.log("🎯 No expected words, returning 0");
    return 0;
  }

  if (userWords.length === 0) {
    console.log("🎯 No user words, returning 0");
    return 0;
  }

  let totalScore = 0;
  const totalWords = expectedWords.length;

  // Improved word-by-word comparison with karaoke-friendly features
  for (let i = 0; i < expectedWords.length; i++) {
    const expected = expectedWords[i]
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, "");

    // Find the best matching user word (allows for word order flexibility)
    let bestMatch = 0;
    let bestUserWord = "";

    // Check words around the expected position (±2 words for flexibility)
    const searchStart = Math.max(0, i - 2);
    const searchEnd = Math.min(userWords.length, i + 3);

    for (let j = searchStart; j < searchEnd; j++) {
      if (j >= userWords.length) break;

      const user = userWords[j]
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, "");

      if (expected === user) {
        // Perfect match
        bestMatch = 1.0;
        bestUserWord = user;
        break;
      } else {
        // Check for partial matches with improved similarity
        const similarity = calculateWordSimilarity(expected, user);
        if (similarity > bestMatch) {
          bestMatch = similarity;
          bestUserWord = user;
        }
      }
    }

    // Apply karaoke-friendly scoring
    let wordScore = 0;
    if (bestMatch >= 0.9) {
      wordScore = 1.0; // Perfect or near-perfect match
    } else if (bestMatch >= 0.7) {
      wordScore = 0.8; // Good match (e.g., "singin'" vs "singing")
    } else if (bestMatch >= 0.5) {
      wordScore = 0.6; // Partial match (e.g., "love" vs "luv")
    } else if (bestMatch >= 0.3) {
      wordScore = 0.3; // Weak match (e.g., "the" vs "da")
    } else {
      wordScore = 0; // No match
    }

    // Bonus for getting the right word in the right position
    if (
      i < userWords.length &&
      expectedWords[i].toLowerCase().trim() ===
        userWords[i].toLowerCase().trim()
    ) {
      wordScore = Math.min(1.0, wordScore + 0.1);
    }

    totalScore += wordScore;

    console.log(`🎯 Word ${i} (${expected}):`, {
      bestMatch,
      bestUserWord,
      wordScore,
      finalScore: wordScore,
    });
  }

  const accuracy = (totalScore / totalWords) * 100;
  console.log("🎯 Accuracy calculation result:", {
    totalScore,
    totalWords,
    accuracy,
  });

  return Math.min(100, Math.max(0, accuracy));
}

/**
 * Calculate timing accuracy based on word timing with karaoke-friendly improvements
 */
export function calculateTimingScore(
  expectedLyrics: LyricWord[],
  userWords: UserWord[]
): number {
  if (expectedLyrics.length === 0 || userWords.length === 0) return 0;

  let totalTimingScore = 0;
  let validComparisons = 0;

  // Improved timing calculation with karaoke-friendly features
  for (let i = 0; i < Math.min(expectedLyrics.length, userWords.length); i++) {
    const expected = expectedLyrics[i];
    const user = userWords[i];

    // Calculate timing error in milliseconds
    const startError = Math.abs(expected.startTime - user.startTime);
    const endError = Math.abs(expected.endTime - user.endTime);
    const avgError = (startError + endError) / 2;

    // Karaoke-friendly timing scoring with more realistic thresholds
    let timingScore = 0;

    if (avgError <= 200) {
      // Perfect timing (within 200ms)
      timingScore = 100;
    } else if (avgError <= 400) {
      // Good timing (within 400ms) - still very good for karaoke
      timingScore = 90;
    } else if (avgError <= 600) {
      // Acceptable timing (within 600ms) - reasonable for karaoke
      timingScore = 80;
    } else if (avgError <= 800) {
      // Fair timing (within 800ms) - still decent for karaoke
      timingScore = 70;
    } else if (avgError <= 1000) {
      // Poor timing (within 1000ms) - but still some credit
      timingScore = 50;
    } else if (avgError <= 1500) {
      // Very poor timing (within 1500ms) - minimal credit
      timingScore = 30;
    } else {
      // Way off timing - no credit
      timingScore = 0;
    }

    // Bonus for being early rather than late (karaoke singers often rush)
    if (user.startTime < expected.startTime) {
      timingScore = Math.min(100, timingScore + 5);
    }

    // Bonus for maintaining rhythm (consecutive words with good timing)
    if (i > 0) {
      const prevExpected = expectedLyrics[i - 1];
      const prevUser = userWords[i - 1];
      const prevAvgError =
        (Math.abs(prevExpected.startTime - prevUser.startTime) +
          Math.abs(prevExpected.endTime - prevUser.endTime)) /
        2;

      if (prevAvgError <= 400 && avgError <= 400) {
        timingScore = Math.min(100, timingScore + 10); // Rhythm bonus
      }
    }

    totalTimingScore += timingScore;
    validComparisons++;

    console.log(`🎯 Timing word ${i}:`, {
      expectedStart: expected.startTime,
      userStart: user.startTime,
      startError,
      avgError,
      timingScore,
    });
  }

  const finalScore =
    validComparisons > 0 ? totalTimingScore / validComparisons : 0;
  console.log("🎯 Timing calculation result:", {
    totalTimingScore,
    validComparisons,
    finalScore,
  });

  return Math.min(100, Math.max(0, finalScore));
}

/**
 * Calculate word similarity using improved Levenshtein distance with karaoke-friendly features
 */
function calculateWordSimilarity(word1: string, word2: string): number {
  // Handle empty strings
  if (word1.length === 0 && word2.length === 0) return 1;
  if (word1.length === 0 || word2.length === 0) return 0;

  // Quick exact match check
  if (word1 === word2) return 1;

  // Common karaoke variations that should get high similarity scores
  const karaokeVariations = [
    ["singin", "singing"],
    ["lovin", "loving"],
    ["goin", "going"],
    ["comin", "coming"],
    ["doin", "doing"],
    ["havin", "having"],
    ["givin", "giving"],
    ["gettin", "getting"],
    ["makin", "making"],
    ["takin", "taking"],
    ["wanna", "want to"],
    ["gonna", "going to"],
    ["gotta", "got to"],
    ["kinda", "kind of"],
    ["sorta", "sort of"],
    ["lemme", "let me"],
    ["gimme", "give me"],
    ["dunno", "don't know"],
    ["ain't", "isn't"],
    ["won't", "will not"],
    ["can't", "cannot"],
    ["don't", "do not"],
    ["doesn't", "does not"],
    ["didn't", "did not"],
    ["wouldn't", "would not"],
    ["couldn't", "could not"],
    ["shouldn't", "should not"],
    ["haven't", "have not"],
    ["hasn't", "has not"],
    ["hadn't", "had not"],
    ["wasn't", "was not"],
    ["weren't", "were not"],
    ["isn't", "is not"],
    ["aren't", "are not"],
  ];

  // Check for common karaoke variations
  for (const [variation, standard] of karaokeVariations) {
    if (
      (word1 === variation && word2 === standard) ||
      (word1 === standard && word2 === variation)
    ) {
      return 0.95; // Very high similarity for common variations
    }
  }

  // Standard Levenshtein distance calculation
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
  const distance = matrix[word2.length][word1.length];
  const similarity = (maxLength - distance) / maxLength;

  // Boost similarity for shorter words (common words like "the", "and", "to")
  if (maxLength <= 3 && similarity > 0.5) {
    return Math.min(1, similarity + 0.2);
  }

  return Math.max(0, similarity);
}

/**
 * Main scoring function that combines accuracy and timing metrics
 */
export function calculateKaraokeScore(
  expectedLyrics: LyricWord[],
  userTranscript: string,
  userWords: UserWord[]
): ScoringResult {
  console.log("🎯 calculateKaraokeScore called:", {
    expectedLyrics: expectedLyrics.map((l) => ({
      word: l.word,
      startTime: l.startTime,
      endTime: l.endTime,
    })),
    userTranscript,
    userWords: userWords.map((w) => ({
      word: w.word,
      startTime: w.startTime,
      endTime: w.endTime,
    })),
  });

  // Extract expected words
  const expectedWords = expectedLyrics.map((lyric) => lyric.word);

  // Extract user words from transcript
  const userWordList = userTranscript
    .split(/\s+/)
    .filter((word) => word.length > 0);

  console.log("🎯 Extracted words:", {
    expectedWords,
    userWordList,
    expectedLyricsCount: expectedLyrics.length,
    userWordsCount: userWords.length,
  });

  // Calculate individual scores
  const accuracy = calculateAccuracyScore(expectedWords, userWordList);
  const timing = calculateTimingScore(expectedLyrics, userWords);

  // Calculate weighted total score (60% accuracy, 40% timing for backing tracks)
  const totalScore = accuracy * 0.6 + timing * 0.4;

  // Generate feedback
  const feedback = generateFeedback(accuracy, timing);

  const result = {
    totalScore: Math.round(totalScore),
    accuracy: Math.round(accuracy),
    timing: Math.round(timing),
    breakdown: {
      wordAccuracy: Math.round(accuracy),
      timingAccuracy: Math.round(timing),
    },
    feedback,
  };

  console.log("🎯 Final scoring result:", result);
  return result;
}

/**
 * Generate feedback based on performance with karaoke-friendly encouragement
 */
function generateFeedback(accuracy: number, timing: number): string[] {
  const feedback: string[] = [];

  // Accuracy feedback with karaoke-friendly messages
  if (accuracy >= 95) {
    feedback.push("🎤 Outstanding lyrics accuracy! You nailed it!");
  } else if (accuracy >= 85) {
    feedback.push("🎵 Great job on the lyrics! Very impressive!");
  } else if (accuracy >= 75) {
    feedback.push("🎶 Good lyrics accuracy! Keep it up!");
  } else if (accuracy >= 60) {
    feedback.push("🎤 Decent lyrics accuracy! Try to focus on word clarity");
  } else if (accuracy >= 40) {
    feedback.push(
      "🎵 Keep practicing! Focus on matching the lyrics more closely"
    );
  } else {
    feedback.push(
      "🎤 Don't give up! Try to sing along with the lyrics more clearly"
    );
  }

  // Timing feedback with karaoke-friendly messages
  if (timing >= 95) {
    feedback.push("⏰ Perfect rhythm! You're in perfect sync!");
  } else if (timing >= 85) {
    feedback.push("🎵 Excellent timing! You're really feeling the beat!");
  } else if (timing >= 75) {
    feedback.push("🎶 Good rhythm! You're getting the hang of it!");
  } else if (timing >= 60) {
    feedback.push("🎤 Decent timing! Try to feel the music's rhythm more");
  } else if (timing >= 40) {
    feedback.push("🎵 Keep practicing! Focus on matching the song's beat");
  } else {
    feedback.push(
      "🎤 Don't worry! Try to tap along with the music to get the rhythm"
    );
  }

  // Overall encouragement
  const totalScore = (accuracy + timing) / 2;
  if (totalScore >= 90) {
    feedback.push("🌟 Amazing performance! You're a karaoke star!");
  } else if (totalScore >= 80) {
    feedback.push("🎉 Great job! You're really getting the hang of karaoke!");
  } else if (totalScore >= 70) {
    feedback.push(
      "🎵 Good performance! Keep practicing and you'll get even better!"
    );
  } else if (totalScore >= 50) {
    feedback.push("🎤 Nice try! Karaoke takes practice - keep at it!");
  } else {
    feedback.push("🎶 Don't give up! Every karaoke star started somewhere!");
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
