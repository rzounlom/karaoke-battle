"use client";

import { Mic, Trophy, Users, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";

export default function Home() {
  const router = useRouter();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [tournamentCode, setTournamentCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinBattle = () => {
    setShowJoinModal(true);
  };

  const handleCloseModal = () => {
    setShowJoinModal(false);
    setTournamentCode("");
  };

  const handleSubmitCode = () => {
    if (!tournamentCode.trim()) return;

    const code = tournamentCode.trim().toUpperCase();
    router.push(`/tournament/join/${code}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      <PageHeader title="Karaoke Battle" showNavigation={true} />

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-12 min-h-[80vh] flex flex-col justify-center">
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
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-4"
              onClick={handleJoinBattle}
            >
              <Users className="mr-2 h-5 w-5" />
              Join Battle
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center mb-4 mx-auto">
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

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center">
              <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/50 rounded-lg flex items-center justify-center mb-4 mx-auto">
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

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center mb-4 mx-auto">
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

      {/* Join Battle Modal */}
      {showJoinModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Join Tournament
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Enter the tournament code
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="tournament-code"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Tournament Code
                  </label>
                  <Input
                    id="tournament-code"
                    type="text"
                    placeholder="ABC123"
                    value={tournamentCode}
                    onChange={(e) =>
                      setTournamentCode(e.target.value.toUpperCase())
                    }
                    maxLength={8}
                    className="w-full text-center text-2xl font-mono tracking-wider"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSubmitCode();
                      }
                    }}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    Enter the 6-character code provided by the tournament host
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleCloseModal}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitCode}
                    disabled={!tournamentCode.trim() || isJoining}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {isJoining ? "Joining..." : "Join Tournament"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="h-[8vh] flex items-center justify-center border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-6 text-center text-gray-600 dark:text-gray-400">
          <p>&copy; 2024 Karaoke Battle. Made with ❤️ for music lovers.</p>
        </div>
      </footer>
    </div>
  );
}
