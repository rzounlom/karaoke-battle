"use client";

import { AlertCircle, Save, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ProtectedRoute } from "@/components/protected-route";
import { useUser } from "@clerk/nextjs";

interface UserData {
  username: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export default function ProfilePage() {
  const { user } = useUser();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Validation for display name (no special characters)
  const validateDisplayName = (name: string): string | null => {
    if (!name.trim()) {
      return "Display name is required";
    }
    if (name.length < 2) {
      return "Display name must be at least 2 characters";
    }
    if (name.length > 30) {
      return "Display name must be less than 30 characters";
    }
    // Check for special characters (only allow letters, numbers, spaces, and hyphens)
    const specialCharRegex = /[^a-zA-Z0-9\s\-]/;
    if (specialCharRegex.test(name)) {
      return "Display name can only contain letters, numbers, spaces, and hyphens";
    }
    return null;
  };

  const fetchUserData = useCallback(async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserData({
            username: data.user.username,
            email: data.user.email,
            firstName: data.user.firstName,
            lastName: data.user.lastName,
          });
          setDisplayName(data.user.username || "");
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      // Fallback to Clerk data if API fails
      setUserData({
        username: user?.username || null,
        email: user?.primaryEmailAddress?.emailAddress || "",
        firstName: user?.firstName || null,
        lastName: user?.lastName || null,
      });
      setDisplayName(user?.username || "");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // Fetch user data from API to get the most up-to-date information
      fetchUserData();
    }
  }, [user, fetchUserData]);

  const handleSave = async () => {
    const validationError = validateDisplayName(displayName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: displayName.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Display name updated successfully!");
        // Refetch user data to ensure Account Information is up to date
        await fetchUserData();
        // Reset the input field
        setDisplayName("");
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent("profileUpdated"));
      } else {
        setError(data.message || "Failed to update display name");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDisplayName = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: null }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Display name removed successfully!");
        // Refetch user data to ensure Account Information is up to date
        await fetchUserData();
        // Reset the input field
        setDisplayName("");
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent("profileUpdated"));
      } else {
        setError(data.message || "Failed to remove display name");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    setError(""); // Clear error when user starts typing
    setSuccess(""); // Clear success message
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
          <PageHeader
            title="Karaoke Battle"
            showBackButton={true}
            backHref="/songs"
            showNavigation={true}
          />
          <div className="container mx-auto px-6 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        <PageHeader
          title="Karaoke Battle"
          showBackButton={true}
          backHref="/songs"
          showNavigation={true}
        />

        {/* Main Content */}
        <div className="container mx-auto px-6 py-8">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold karaoke-text-gradient mb-2">
              Profile Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your account and display preferences
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="bg-white/80 dark:bg-white/10 rounded-xl p-8 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="text-center">
                  <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="h-10 w-10 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {userData?.firstName && userData?.lastName
                      ? `${userData.firstName} ${userData.lastName}`
                      : userData?.firstName || userData?.username || "User"}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {userData?.email}
                  </p>
                </div>

                {/* Display Name Section */}
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="displayName"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Display Name
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Choose how your name appears to other players. Only
                      letters, numbers, spaces, and hyphens are allowed.
                    </p>
                    <div className="space-y-2">
                      <input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) =>
                          handleDisplayNameChange(e.target.value)
                        }
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                          error
                            ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20"
                            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        } text-gray-900 dark:text-white`}
                        placeholder="Enter your display name"
                        maxLength={30}
                      />
                      {error && (
                        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span>{error}</span>
                        </div>
                      )}
                      {success && (
                        <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span>{success}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 space-y-3">
                    <Button
                      onClick={handleSave}
                      disabled={
                        saving ||
                        !!error ||
                        displayName.trim() === userData?.username
                      }
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>

                    {/* Remove Display Name Button - Only show if user has a username */}
                    {userData?.username && (
                      <Button
                        onClick={handleRemoveDisplayName}
                        disabled={saving}
                        variant="outline"
                        className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                            Removing...
                          </>
                        ) : (
                          <>
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Remove Display Name
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Current Info */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Account Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Username:
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {userData?.username || "Not set"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Email:
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {userData?.email}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        First Name:
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {userData?.firstName || "Not set"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Last Name:
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {userData?.lastName || "Not set"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
