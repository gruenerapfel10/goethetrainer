"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MatrixRainBackground } from "@/components/landing/matrix-rain-background"
import { MuaLogo } from "@/components/mua-logo"
import { cn } from "@/lib/utils"
import { Chrome } from "lucide-react"
import { useAuth } from "@/context/firebase-auth-context"
import { toast } from "sonner"

export default function LoginPage() {
  const [isLoginView, setIsLoginView] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const { signIn, signUp, signInWithGoogle } = useAuth()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      if (isLoginView) {
        await signIn(email, password)
      } else {
        await signUp(email, password)
      }
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        toast.error("User not found")
      } else if (error.code === 'auth/wrong-password') {
        toast.error("Invalid password")
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error("Email already in use")
      } else if (error.code === 'auth/weak-password') {
        toast.error("Password should be at least 6 characters")
      } else if (error.code === 'auth/invalid-email') {
        toast.error("Invalid email address")
      } else {
        toast.error(error.message || "An error occurred")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignIn = async () => {
    try {
      setIsLoading(true)
      await signInWithGoogle()
    } catch (error: any) {
      toast.error(error.message || "Authentication failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <div className="relative hidden items-center justify-center bg-gray-900 text-white lg:flex">
        <MatrixRainBackground />
        <div className="relative z-10 text-center">
          <MuaLogo className="mx-auto mb-8 h-20 w-auto text-white" />
          <h1 className="text-5xl font-bold">Unlock a World of Universities.</h1>
          <p className="mt-4 text-lg text-blue-200">Your future campus is just a click away.</p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-black p-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-center text-4xl font-bold text-white">
              {isLoginView ? "Welcome Back" : "Create an Account"}
            </h2>
            <p className="mt-2 text-center text-gray-400">
              {isLoginView ? "Sign in to access your dashboard." : "Join MUA to start your journey."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-1 rounded-full bg-gray-900 p-1">
            <button
              onClick={() => setIsLoginView(true)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                isLoginView ? "bg-blue-600" : "text-gray-400 hover:bg-gray-800",
              )}
            >
              Login
            </button>
            <button
              onClick={() => setIsLoginView(false)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                !isLoginView ? "bg-blue-600" : "text-gray-400 hover:bg-gray-800",
              )}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-400">
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-400">
                  Password
                </Label>
                {isLoginView && (
                  <a href="#" className="text-sm text-blue-500 hover:underline">
                    Forgot password?
                  </a>
                )}
              </div>
              <Input 
                id="password" 
                name="password"
                type="password" 
                required 
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500" 
                disabled={isLoading}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-6"
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : isLoginView ? "Log In" : "Create Account"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-black px-2 text-gray-500">Or continue with</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full bg-gray-900 border-gray-700 text-white hover:bg-gray-800"
            onClick={handleOAuthSignIn}
            disabled={isLoading}
          >
            <Chrome className="mr-2 h-5 w-5" />
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  )
}