export interface LrcLine {
  time: number; // time in milliseconds
  text: string;
}

export interface ParsedLrc {
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  lines: LrcLine[];
}

/**
 * Parse LRC format time string to milliseconds
 * Format: [mm:ss.xx] where mm = minutes, ss = seconds, xx = hundredths
 */
function parseTime(timeString: string): number {
  const match = timeString.match(/\[(\d{2}):(\d{2})\.(\d{2})\]/);
  if (!match) return 0;

  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  const hundredths = parseInt(match[3], 10);

  return (minutes * 60 + seconds) * 1000 + hundredths * 10;
}

/**
 * Parse LRC file content into structured data
 */
export function parseLrc(lrcContent: string): ParsedLrc {
  const lines = lrcContent.split("\n");
  const result: ParsedLrc = {
    lines: [],
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Check for metadata tags
    if (trimmedLine.startsWith("[ti:")) {
      result.title = trimmedLine.slice(4, -1);
      continue;
    }
    if (trimmedLine.startsWith("[ar:")) {
      result.artist = trimmedLine.slice(4, -1);
      continue;
    }
    if (trimmedLine.startsWith("[al:")) {
      result.album = trimmedLine.slice(4, -1);
      continue;
    }

    // Parse timed lyrics
    const timeMatch = trimmedLine.match(/^\[(\d{2}:\d{2}\.\d{2})\]/);
    if (timeMatch) {
      const time = parseTime(timeMatch[0]);
      const text = trimmedLine.slice(timeMatch[0].length).trim();

      result.lines.push({
        time,
        text,
      });
    }
  }

  // Sort lines by time
  result.lines.sort((a, b) => a.time - b.time);

  return result;
}

/**
 * Get the current lyric line based on current time
 */
export function getCurrentLyric(
  parsedLrc: ParsedLrc,
  currentTime: number
): LrcLine | null {
  if (!parsedLrc.lines.length) return null;

  // Find the most recent line that has passed
  let currentLine: LrcLine | null = null;

  for (const line of parsedLrc.lines) {
    if (line.time <= currentTime && line.text.trim() !== "") {
      currentLine = line;
    } else if (line.time > currentTime) {
      break;
    }
  }

  return currentLine;
}

/**
 * Get upcoming lyric lines
 */
export function getUpcomingLyrics(
  parsedLrc: ParsedLrc,
  currentTime: number,
  count: number = 3
): LrcLine[] {
  if (!parsedLrc.lines.length) return [];

  return parsedLrc.lines
    .filter((line) => line.time > currentTime && line.text.trim() !== "")
    .slice(0, count);
}

/**
 * Get previous lyric lines
 */
export function getPreviousLyrics(
  parsedLrc: ParsedLrc,
  currentTime: number,
  count: number = 3
): LrcLine[] {
  if (!parsedLrc.lines.length) return [];

  return parsedLrc.lines
    .filter((line) => line.time < currentTime && line.text.trim() !== "")
    .slice(-count);
}

/**
 * Convert LRC lines to word-level timing for scoring
 * This is a simplified approach - splits text by spaces and estimates timing
 */
export function lrcToWords(
  parsedLrc: ParsedLrc
): Array<{ word: string; startTime: number; endTime: number }> {
  const words: Array<{ word: string; startTime: number; endTime: number }> = [];

  for (let i = 0; i < parsedLrc.lines.length; i++) {
    const line = parsedLrc.lines[i];
    const nextLine = parsedLrc.lines[i + 1];

    if (!line.text.trim()) continue;

    const lineWords = line.text.split(/\s+/).filter((word) => word.trim());
    if (lineWords.length === 0) continue;

    // Calculate duration for this line
    const lineDuration = nextLine
      ? Math.max(1000, nextLine.time - line.time) // At least 1 second
      : 3000; // Default 3 seconds for last line

    // Distribute time evenly across words in the line
    const timePerWord = lineDuration / lineWords.length;

    lineWords.forEach((word, wordIndex) => {
      const startTime = line.time + wordIndex * timePerWord;
      const endTime = startTime + timePerWord;

      words.push({
        word: word.replace(/[^\w\s]/g, ""), // Remove punctuation for matching
        startTime,
        endTime,
      });
    });
  }

  return words;
}

/**
 * Get the duration of a song from its LRC content
 * Returns the timestamp of the last lyric line in seconds
 */
export function getLrcDuration(lrcContent: string): number {
  const parsedLrc = parseLrc(lrcContent);
  if (parsedLrc.lines.length === 0) return 0;

  // Get the last line with actual text (non-empty)
  const linesWithText = parsedLrc.lines.filter(
    (line) => line.text.trim() !== ""
  );

  if (linesWithText.length === 0) {
    // If no lines with text, use the very last timestamp
    const lastLine = parsedLrc.lines[parsedLrc.lines.length - 1];
    return lastLine ? Math.ceil(lastLine.time / 1000) : 0;
  }

  // Use the last line with actual lyrics
  const lastLineWithText = linesWithText[linesWithText.length - 1];

  // Add a small buffer (3-5 seconds) after the last lyric for song outro
  const durationWithBuffer = Math.ceil(lastLineWithText.time / 1000) + 4;

  return durationWithBuffer;
}

/**
 * Fetch and get duration from an LRC file URL
 */
export async function fetchLrcDuration(lrcUrl: string): Promise<number> {
  try {
    const response = await fetch(lrcUrl);
    if (!response.ok) return 0;

    const lrcContent = await response.text();
    return getLrcDuration(lrcContent);
  } catch (error) {
    console.error("Failed to fetch LRC duration:", error);
    return 0;
  }
}
