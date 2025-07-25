"use client"

import type React from "react"

import { useState } from "react"
import { auth } from "../../lib/supabase"
import { Mail, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error: authError } = await auth.resetPassword(email)

    if (authError) {
      setError(authError)
    } else {
      setSuccess(true)
    }

    setLoading(false)
  }

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="card">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-warm rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">Check your email</h2>
            <p className="text-muted-foreground mb-4">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-muted-foreground">Click the link in the email to reset your password.</p>
          </div>
        </div>
        <Link href="/signin" className="mt-4 inline-flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/kidoers_noBgColor-lp4nzseFjByx9uxSzOyiqX4zqX77pn.png"
          alt="Kidoers"
          className="h-12 mx-auto mb-4"
        />
        <h1 className="text-2xl font-bold text-foreground mb-2">Reset your password</h1>
        <p className="text-muted-foreground">Enter your email and we'll send you a reset link</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input pl-10"
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <Link href="/signin" className="mt-6 inline-flex items-center gap-2 text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>
    </div>
  )
} 