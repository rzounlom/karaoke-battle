"use client";

import { AlertCircle, CheckCircle, Mic, MicOff } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export function MicrophoneTest() {
  const [isTesting, setIsTesting] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testMicrophone = async () => {
    setIsTesting(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setHasPermission(true);

      // Stop the stream after testing
      stream.getTracks().forEach((track) => track.stop());

      console.log("Microphone test successful");
    } catch (err) {
      setHasPermission(false);
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Microphone test failed:", err);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
        Microphone Test
      </h3>

      <div className="space-y-3">
        <Button
          onClick={testMicrophone}
          disabled={isTesting}
          variant="outline"
          className="w-full"
        >
          {isTesting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
              Testing...
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 mr-2" />
              Test Microphone
            </>
          )}
        </Button>

        {hasPermission === true && (
          <div className="flex items-center text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4 mr-2" />
            Microphone access granted
          </div>
        )}

        {hasPermission === false && (
          <div className="flex items-center text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 mr-2" />
            Microphone access denied
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400">
            Error: {error}
          </div>
        )}

        <div className="text-xs text-gray-600 dark:text-gray-400">
          This will test if your browser can access your microphone. Voice
          recognition requires microphone permission.
        </div>
      </div>
    </div>
  );
}
