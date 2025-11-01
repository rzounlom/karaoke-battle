"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Clock, Search, UserPlus, Users, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";

interface Friend {
  id: string;
  friendId: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string;
  level: number;
  experience: number;
  status: string;
  createdAt: string;
  isReceived: boolean;
}

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string;
  level: number;
  experience: number;
  joinedAt: string;
  friendshipStatus: string | null;
  displayName: string;
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<{
    acceptedFriends: Friend[];
    pendingSent: Friend[];
    pendingReceived: Friend[];
    totalFriends: number;
    pendingRequestsCount: number;
  } | null>(null);

  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("friends");

  // Load friends data
  useEffect(() => {
    loadFriends();
  }, []);

  // Load suggested users when Discover tab is opened
  useEffect(() => {
    if (
      activeTab === "discover" &&
      searchResults.length === 0 &&
      !isSearching
    ) {
      searchUsers(""); // Load suggested users
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadFriends = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/friends");
      const data = await response.json();

      if (data.success) {
        setFriends(data);
      } else {
        console.error("Failed to load friends:", data.message);
      }
    } catch (error) {
      console.error("Error loading friends:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    setIsSearching(true);
    try {
      const url = query.trim()
        ? `/api/users/search?search=${encodeURIComponent(query)}&limit=20`
        : `/api/users/search?limit=10`; // Load suggested users when no query

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.users);
      } else {
        console.error("Failed to search users:", data.message);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    try {
      const response = await fetch("/api/friends/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh search results to update friendship status
        searchUsers(searchQuery);
        loadFriends(); // Refresh friends list
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
      alert("Failed to send friend request");
    }
  };

  const respondToFriendRequest = async (
    friendshipId: string,
    action: "accept" | "reject"
  ) => {
    try {
      const response = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId, action }),
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        loadFriends(); // Refresh friends list
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Error responding to friend request:", error);
      alert("Failed to respond to friend request");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return (
          <Badge variant="default" className="bg-green-500">
            Friends
          </Badge>
        );
      case "PENDING":
        return <Badge variant="secondary">Pending</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return null;
    }
  };

  const getFriendshipButton = (user: User) => {
    switch (user.friendshipStatus) {
      case "ACCEPTED":
        return (
          <Badge variant="default" className="bg-green-500">
            Friends
          </Badge>
        );
      case "PENDING":
        return <Badge variant="secondary">Request Sent</Badge>;
      case "REJECTED":
        return (
          <Button
            size="sm"
            onClick={() => sendFriendRequest(user.id)}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Send Request
          </Button>
        );
      default:
        return (
          <Button
            size="sm"
            onClick={() => sendFriendRequest(user.id)}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Add Friend
          </Button>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading friends...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      <PageHeader title="Friends" showNavigation={true} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Friends
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Connect with other karaoke enthusiasts and challenge them to
            battles!
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="friends" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Friends ({friends?.totalFriends || 0})
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Requests (
              {(friends?.pendingReceived?.length || 0) +
                (friends?.pendingSent?.length || 0)}
              )
            </TabsTrigger>
            <TabsTrigger value="discover" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Discover
            </TabsTrigger>
          </TabsList>

          {/* Friends Tab */}
          <TabsContent value="friends" className="space-y-4">
            {!friends?.acceptedFriends ||
            friends.acceptedFriends.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No Friends Yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Start by discovering and adding friends!
                  </p>
                  <Button onClick={() => setActiveTab("discover")}>
                    <Search className="h-4 w-4 mr-2" />
                    Discover Users
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {friends?.acceptedFriends?.map((friend) => (
                  <Card key={friend.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={friend.avatar} />
                          <AvatarFallback>
                            {friend.username?.charAt(0) ||
                              friend.firstName?.charAt(0) ||
                              "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {friend.username ||
                              `${friend.firstName} ${friend.lastName}`.trim()}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Level {friend.level} • {friend.experience} XP
                          </p>
                        </div>
                        {getStatusBadge(friend.status)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-4">
            {/* Pending Received */}
            {friends?.pendingReceived && friends.pendingReceived.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Friend Requests
                </h3>
                <div className="space-y-3">
                  {friends?.pendingReceived?.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={request.avatar} />
                              <AvatarFallback>
                                {request.username?.charAt(0) ||
                                  request.firstName?.charAt(0) ||
                                  "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {request.username ||
                                  `${request.firstName} ${request.lastName}`.trim()}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Level {request.level} • {request.experience} XP
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                respondToFriendRequest(request.id, "accept")
                              }
                              className="bg-green-500 hover:bg-green-600"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                respondToFriendRequest(request.id, "reject")
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Sent */}
            {friends?.pendingSent && friends.pendingSent.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Sent Requests
                </h3>
                <div className="space-y-3">
                  {friends?.pendingSent?.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={request.avatar} />
                            <AvatarFallback>
                              {request.username?.charAt(0) ||
                                request.firstName?.charAt(0) ||
                                "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {request.username ||
                                `${request.firstName} ${request.lastName}`.trim()}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Level {request.level} • {request.experience} XP
                            </p>
                          </div>
                          <Badge variant="secondary">Pending</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {(!friends?.pendingReceived ||
              friends.pendingReceived.length === 0) &&
              (!friends?.pendingSent || friends.pendingSent.length === 0) && (
                <Card>
                  <CardContent className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No Pending Requests
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      You don&apos;t have any pending friend requests.
                    </p>
                  </CardContent>
                </Card>
              )}
          </TabsContent>

          {/* Discover Tab */}
          <TabsContent value="discover" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Find Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Search by username, name, or email..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        searchUsers(e.target.value);
                      }}
                      className="flex-1"
                    />
                  </div>

                  {isSearching && (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {searchQuery.trim()
                          ? "Search Results"
                          : "Suggested Users"}
                      </h3>
                      {searchResults.map((user) => (
                        <Card key={user.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={user.avatar} />
                                  <AvatarFallback>
                                    {user.username?.charAt(0) ||
                                      user.firstName?.charAt(0) ||
                                      "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {user.displayName}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Level {user.level} • {user.experience} XP
                                  </p>
                                </div>
                              </div>
                              {getFriendshipButton(user)}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {searchQuery &&
                    !isSearching &&
                    searchResults.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-600 dark:text-gray-300">
                          No users found matching &quot;{searchQuery}&quot;
                        </p>
                      </div>
                    )}

                  {!searchQuery &&
                    !isSearching &&
                    searchResults.length === 0 && (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          No Users Found
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300">
                          There are no other users on the platform yet. Be the
                          first to invite friends!
                        </p>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
