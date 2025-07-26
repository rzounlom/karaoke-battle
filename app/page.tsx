import { Mic, Trophy, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Mic className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          <h1 className="text-2xl font-bold karaoke-text-gradient">
            Karaoke Battle
          </h1>
        </div>
        <ThemeToggle />
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-12">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold karaoke-text-gradient">
              Battle it out with friends!
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              The ultimate karaoke competition platform. Sing, compete, and win
              with real-time voice recognition scoring.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/songs">
              <Button size="lg" variant="karaoke" className="text-lg px-8 py-4">
                <Mic className="mr-2 h-5 w-5" />
                Start New Battle
              </Button>
            </Link>
            <Link href="/game-mode">
              <Button size="lg" variant="outline" className="text-lg px-8 py-4">
                <Users className="mr-2 h-5 w-5" />
                Join Battle
              </Button>
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center mb-4">
                <Mic className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Voice Recognition
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Advanced AI-powered scoring that analyzes your pitch, timing,
                and accuracy in real-time.
              </p>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/50 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Multiplayer Battles
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Compete with friends in real-time battles with live leaderboards
                and instant feedback.
              </p>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center mb-4">
                <Trophy className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Tournaments
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Join tournaments, climb leaderboards, and earn achievements as
                you become a karaoke champion.
              </p>
            </div>
          </div>

          {/* How it Works */}
          <div className="mt-20">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 karaoke-text-gradient">
              How it Works
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                  1
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Choose a Song
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Pick from our extensive library of songs
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-pink-600 text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                  2
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Start Singing
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Follow the lyrics and sing your heart out
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                  3
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Get Scored
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  AI analyzes your performance in real-time
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                  4
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Compete & Win
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Battle friends and climb the leaderboards
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 py-8 border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-6 text-center text-gray-600 dark:text-gray-400">
          <p>&copy; 2024 Karaoke Battle. Made with ❤️ for music lovers.</p>
        </div>
      </footer>
    </div>
  );
}
