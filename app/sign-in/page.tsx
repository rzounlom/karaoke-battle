"use client";

import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";

function SignInContent() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") || "/";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      <PageHeader
        title="Karaoke Battle"
        showBackButton={true}
        backHref="/"
        showNavigation={true}
      />
      
      <div className="container mx-auto px-6 py-12 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold karaoke-text-gradient mb-2">
              Welcome Back!
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Sign in to continue your karaoke journey
            </p>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg relative z-10">
            <SignIn
              routing="path"
              path="/sign-in"
              redirectUrl={redirectUrl}
              appearance={{
                elements: {
                  rootBox: "w-full mx-auto",
                  card: "shadow-none bg-transparent border-none box-shadow-none",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton: "border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm dark:shadow-md",
                  socialButtonsBlockButtonText: "text-gray-700 dark:text-gray-200 font-medium",
                  socialButtonsBlockButtonArrow: "text-gray-700 dark:text-gray-200",
                  formButtonPrimary: "bg-purple-600 hover:bg-purple-700 text-white transition-colors",
                  footerActionLink: "text-purple-600 hover:text-purple-700 transition-colors",
                  formFieldInput: "border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:text-white",
                  formFieldLabel: "text-gray-700 dark:text-gray-300",
                  identityPreviewEditButton: "text-purple-600 hover:text-purple-700",
                  formResendCodeLink: "text-purple-600 hover:text-purple-700",
                },
                layout: {
                  socialButtonsPlacement: "top",
                  showOptionalFields: false,
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
          <PageHeader
            title="Karaoke Battle"
            showBackButton={true}
            backHref="/"
            showNavigation={true}
          />
          <div className="container mx-auto px-6 py-12 flex items-center justify-center min-h-[calc(100vh-80px)]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
