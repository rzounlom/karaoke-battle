import { Difficulty, PrismaClient, Rarity } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Seed Songs
  const songs = [
    {
      title: "Bohemian Rhapsody",
      artist: "Queen",
      genre: "Rock",
      difficulty: Difficulty.HARD,
      duration: "5:55",
      year: 1975,
      lyrics: [
        { time: 0, text: "Is this the real life?" },
        { time: 3, text: "Is this just fantasy?" },
        { time: 6, text: "Caught in a landslide" },
        { time: 9, text: "No escape from reality" },
        { time: 12, text: "Open your eyes" },
        { time: 15, text: "Look up to the skies and see" },
        { time: 18, text: "I'm just a poor boy" },
        { time: 21, text: "I need no sympathy" },
        { time: 24, text: "Because I'm easy come, easy go" },
        { time: 27, text: "Little high, little low" },
      ],
    },
    {
      title: "Imagine",
      artist: "John Lennon",
      genre: "Pop",
      difficulty: Difficulty.MEDIUM,
      duration: "3:03",
      year: 1971,
      lyrics: [
        { time: 0, text: "Imagine there's no heaven" },
        { time: 3, text: "It's easy if you try" },
        { time: 6, text: "No hell below us" },
        { time: 9, text: "Above us only sky" },
        { time: 12, text: "Imagine all the people" },
        { time: 15, text: "Living for today" },
      ],
    },
    {
      title: "Hotel California",
      artist: "Eagles",
      genre: "Rock",
      difficulty: Difficulty.MEDIUM,
      duration: "6:30",
      year: 1976,
      lyrics: [
        { time: 0, text: "On a dark desert highway" },
        { time: 4, text: "Cool wind in my hair" },
        { time: 8, text: "Warm smell of colitas" },
        { time: 12, text: "Rising up through the air" },
        { time: 16, text: "Up ahead in the distance" },
        { time: 20, text: "I saw a shimmering light" },
      ],
    },
    {
      title: "Wonderwall",
      artist: "Oasis",
      genre: "Rock",
      difficulty: Difficulty.EASY,
      duration: "4:18",
      year: 1995,
      lyrics: [
        { time: 0, text: "Today is gonna be the day" },
        { time: 4, text: "That they're gonna throw it back to you" },
        { time: 8, text: "By now you should've somehow" },
        { time: 12, text: "Realized what you gotta do" },
        { time: 16, text: "I don't believe that anybody" },
        { time: 20, text: "Feels the way I do" },
      ],
    },
    {
      title: "Shape of You",
      artist: "Ed Sheeran",
      genre: "Pop",
      difficulty: Difficulty.MEDIUM,
      duration: "3:53",
      year: 2017,
      lyrics: [
        { time: 0, text: "The club isn't the best place to find a lover" },
        { time: 4, text: "So the bar is where I go" },
        { time: 8, text: "Me and my friends at the table doing shots" },
        { time: 12, text: "Drinking fast and then we talk slow" },
        {
          time: 16,
          text: "You come over and start up a conversation with just me",
        },
        { time: 20, text: "And trust me I'll give it a chance now" },
      ],
    },
    {
      title: "Sweet Child O' Mine",
      artist: "Guns N' Roses",
      genre: "Rock",
      difficulty: Difficulty.HARD,
      duration: "5:56",
      year: 1987,
      lyrics: [
        { time: 0, text: "She's got a smile that it seems to me" },
        { time: 4, text: "Reminds me of childhood memories" },
        {
          time: 8,
          text: "Where everything was as fresh as the bright blue sky",
        },
        { time: 12, text: "Now and then when I see her face" },
        { time: 16, text: "She takes me away to that special place" },
        {
          time: 20,
          text: "And if I stared too long, I'd probably break down and cry",
        },
      ],
    },
    {
      title: "Billie Jean",
      artist: "Michael Jackson",
      genre: "Pop",
      difficulty: Difficulty.MEDIUM,
      duration: "4:54",
      year: 1982,
      lyrics: [
        {
          time: 0,
          text: "She was more like a beauty queen from a movie scene",
        },
        {
          time: 4,
          text: "I said don't mind, but what do you mean, I am the one",
        },
        { time: 8, text: "Who will dance on the floor in the round" },
        {
          time: 12,
          text: "She said I am the one, who will dance on the floor in the round",
        },
        { time: 16, text: "She told me her name was Billie Jean" },
        { time: 20, text: "As she caused a scene" },
      ],
    },
    {
      title: "Stairway to Heaven",
      artist: "Led Zeppelin",
      genre: "Rock",
      difficulty: Difficulty.HARD,
      duration: "8:02",
      year: 1971,
      lyrics: [
        {
          time: 0,
          text: "There's a lady who's sure all that glitters is gold",
        },
        { time: 5, text: "And she's buying a stairway to heaven" },
        {
          time: 10,
          text: "When she gets there she knows, if the stores are all closed",
        },
        { time: 15, text: "With a word she can get what she came for" },
        { time: 20, text: "Ooh, ooh, and she's buying a stairway to heaven" },
      ],
    },
    {
      title: "Uptown Funk",
      artist: "Mark Ronson ft. Bruno Mars",
      genre: "Pop",
      difficulty: Difficulty.EASY,
      duration: "3:57",
      year: 2014,
      lyrics: [
        { time: 0, text: "This hit, that ice cold" },
        { time: 3, text: "Michelle Pfeiffer, that white gold" },
        { time: 6, text: "This one for them hood girls" },
        { time: 9, text: "Them good girls straight masterpieces" },
        { time: 12, text: "Stylin', whilen, livin' it up in the city" },
        { time: 15, text: "Got Chucks on with Saint Laurent" },
      ],
    },
    {
      title: "Smells Like Teen Spirit",
      artist: "Nirvana",
      genre: "Rock",
      difficulty: Difficulty.MEDIUM,
      duration: "5:01",
      year: 1991,
      lyrics: [
        { time: 0, text: "Load up on guns, bring your friends" },
        { time: 4, text: "It's fun to lose and to pretend" },
        { time: 8, text: "She's over-bored and self-assured" },
        { time: 12, text: "Oh no, I know a dirty word" },
        { time: 16, text: "Hello, hello, hello, how low" },
        { time: 20, text: "Hello, hello, hello, how low" },
      ],
    },
    {
      title: "Rolling in the Deep",
      artist: "Adele",
      genre: "Pop",
      difficulty: Difficulty.HARD,
      duration: "3:48",
      year: 2010,
      lyrics: [
        { time: 0, text: "There's a fire starting in my heart" },
        {
          time: 4,
          text: "Reaching a fever pitch and it's bringing me out the dark",
        },
        { time: 8, text: "Finally, I can see you crystal clear" },
        {
          time: 12,
          text: "Go ahead and sell me out and I'll lay your ship bare",
        },
        { time: 16, text: "See how I leave, with every piece of you" },
        { time: 20, text: "Don't underestimate the things that I will do" },
      ],
    },
    {
      title: "Hey Jude",
      artist: "The Beatles",
      genre: "Pop",
      difficulty: Difficulty.EASY,
      duration: "7:11",
      year: 1968,
      lyrics: [
        { time: 0, text: "Hey Jude, don't be afraid" },
        { time: 4, text: "You were made to go out and get her" },
        { time: 8, text: "The minute you let her under your skin" },
        { time: 12, text: "Then you begin to make it better" },
        { time: 16, text: "And anytime you feel the pain, hey Jude, refrain" },
        { time: 20, text: "Don't carry the world upon your shoulders" },
      ],
    },
  ];

  for (const song of songs) {
    await prisma.song.upsert({
      where: { title_artist: { title: song.title, artist: song.artist } },
      update: {},
      create: song,
    });
  }

  // Seed Achievements
  const achievements = [
    {
      name: "Perfect Timing",
      description: "Hit 10 notes in perfect timing",
      icon: "🎯",
      rarity: Rarity.RARE,
      points: 100,
      criteria: { perfectNotes: 10 },
    },
    {
      name: "Word Master",
      description: "95% lyrics accuracy",
      icon: "📝",
      rarity: Rarity.COMMON,
      points: 50,
      criteria: { lyricsAccuracy: 95 },
    },
    {
      name: "Streak Master",
      description: "18 note streak",
      icon: "🔥",
      rarity: Rarity.EPIC,
      points: 200,
      criteria: { maxStreak: 18 },
    },
    {
      name: "First Victory",
      description: "Win your first multiplayer battle",
      icon: "🏆",
      rarity: Rarity.COMMON,
      points: 25,
      criteria: { firstWin: true },
    },
    {
      name: "Song Collector",
      description: "Sing 50 different songs",
      icon: "🎵",
      rarity: Rarity.RARE,
      points: 150,
      criteria: { songsSung: 50 },
    },
    {
      name: "Pitch Perfect",
      description: "Achieve 100% pitch accuracy",
      icon: "🎼",
      rarity: Rarity.LEGENDARY,
      points: 500,
      criteria: { pitchAccuracy: 100 },
    },
  ];

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { name: achievement.name },
      update: {},
      create: achievement,
    });
  }

  console.log("✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
