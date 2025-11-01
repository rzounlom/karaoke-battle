export interface ScoringResult {
  totalScore: number;
  accuracy: number;
  timing: number;
  breakdown: {
    wordAccuracy: number;
    timingAccuracy: number;
  };
  feedback: string[];
  bonusPoints?: number;
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
 * Now supports ad-libbing - rewards correct lyrics without penalizing extra words
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
  let matchedWords = 0;
  const totalWords = expectedWords.length;

  // Ad-libbing friendly word-by-word comparison
  // This approach finds expected words in the user's transcript without penalizing extra words
  const usedUserWords = new Set<number>(); // Track which user words we've matched

  for (let i = 0; i < expectedWords.length; i++) {
    const expected = expectedWords[i]
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, "");

    // Find the best matching user word (allows for ad-libbing and word order flexibility)
    let bestMatch = 0;
    let bestUserWord = "";
    let bestUserIndex = -1;

    // Search through all user words to find the best match
    for (let j = 0; j < userWords.length; j++) {
      // Skip words we've already matched to avoid double-counting
      if (usedUserWords.has(j)) continue;

      const user = userWords[j]
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, "");

      if (expected === user) {
        // Perfect match
        bestMatch = 1.0;
        bestUserWord = user;
        bestUserIndex = j;
        break;
      } else {
        // Check for partial matches with improved similarity
        const similarity = calculateWordSimilarity(expected, user);
        if (similarity > bestMatch) {
          bestMatch = similarity;
          bestUserWord = user;
          bestUserIndex = j;
        }
      }
    }

    // Apply ad-libbing friendly scoring
    let wordScore = 0;
    if (bestMatch >= 0.8) {
      wordScore = 1.0; // Perfect or near-perfect match
    } else if (bestMatch >= 0.6) {
      wordScore = 0.9; // Very good match
    } else if (bestMatch >= 0.4) {
      wordScore = 0.7; // Good match (e.g., "singin'" vs "singing")
    } else if (bestMatch >= 0.2) {
      wordScore = 0.5; // Partial match (e.g., "love" vs "luv")
    } else if (bestMatch >= 0.1) {
      wordScore = 0.3; // Weak match (e.g., "the" vs "da")
    } else {
      wordScore = 0; // No match - but this doesn't penalize ad-libbing
    }

    // Bonus for getting the right word in approximately the right position
    if (bestUserIndex >= 0) {
      const positionBonus = Math.max(0, 1 - Math.abs(i - bestUserIndex) * 0.1);
      wordScore = Math.min(1.0, wordScore + positionBonus * 0.2);
    }

    totalScore += wordScore;

    // Mark this user word as used if we found a match
    if (bestMatch > 0 && bestUserIndex >= 0) {
      usedUserWords.add(bestUserIndex);
      matchedWords++;
    }

    console.log(`🎯 Word ${i} (${expected}):`, {
      bestMatch,
      bestUserWord,
      wordScore,
      finalScore: wordScore,
    });
  }

  // Calculate accuracy with ad-libbing bonus
  const baseAccuracy = (totalScore / totalWords) * 100;

  // Bonus for ad-libbing: if user sang more words than expected, give a small bonus
  const adLibBonus =
    userWords.length > expectedWords.length
      ? Math.min(10, (userWords.length - expectedWords.length) * 2)
      : 0;

  // Bonus for matching a high percentage of expected words
  const matchRateBonus = matchedWords >= totalWords * 0.8 ? 5 : 0;

  const accuracy = baseAccuracy + adLibBonus + matchRateBonus;

  console.log("🎯 Accuracy calculation result:", {
    totalScore,
    totalWords,
    matchedWords,
    baseAccuracy,
    adLibBonus,
    matchRateBonus,
    finalAccuracy: accuracy,
  });

  return Math.min(100, Math.max(0, accuracy));
}

/**
 * Calculate timing accuracy based on word timing with karaoke-friendly improvements
 * Now supports ad-libbing by focusing on timing of matched words
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

    // More lenient karaoke-friendly timing scoring
    let timingScore = 0;

    if (avgError <= 500) {
      // Perfect timing (within 500ms)
      timingScore = 100;
    } else if (avgError <= 800) {
      // Excellent timing (within 800ms)
      timingScore = 95;
    } else if (avgError <= 1200) {
      // Good timing (within 1200ms) - very good for karaoke
      timingScore = 85;
    } else if (avgError <= 1800) {
      // Acceptable timing (within 1800ms) - reasonable for karaoke
      timingScore = 75;
    } else if (avgError <= 2500) {
      // Fair timing (within 2500ms) - still decent for karaoke
      timingScore = 60;
    } else if (avgError <= 3500) {
      // Poor timing (within 3500ms) - but still some credit
      timingScore = 40;
    } else if (avgError <= 5000) {
      // Very poor timing (within 5000ms) - minimal credit
      timingScore = 20;
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

  // Expanded karaoke variations that should get high similarity scores
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
    // Common singing variations
    ["yeah", "yes"],
    ["nah", "no"],
    ["gonna", "going to"],
    ["wanna", "want to"],
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
    // Phonetic variations
    ["da", "the"],
    ["dat", "that"],
    ["dis", "this"],
    ["dem", "them"],
    ["dey", "they"],
    ["wit", "with"],
    ["bout", "about"],
    ["cause", "because"],
    ["til", "until"],
    ["em", "them"],
    ["im", "i'm"],
    ["ur", "your"],
    ["u", "you"],
    ["r", "are"],
    ["2", "to"],
    ["4", "for"],
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

  // Overall encouragement with ad-libbing support
  const totalScore = (accuracy + timing) / 2;
  if (totalScore >= 90) {
    feedback.push(
      "🌟 Amazing performance! Your ad-libbing skills are incredible!"
    );
  } else if (totalScore >= 80) {
    feedback.push(
      "🎉 Great job! You're mastering both lyrics and creative expression!"
    );
  } else if (totalScore >= 70) {
    feedback.push(
      "🎵 Good performance! Keep mixing the lyrics with your own style!"
    );
  } else if (totalScore >= 50) {
    feedback.push(
      "🎤 Nice try! Don't be afraid to add your own flair to the song!"
    );
  } else {
    feedback.push(
      "🎶 Don't give up! Try adding some personal touches to make it yours!"
    );
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
