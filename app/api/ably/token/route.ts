import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import Ably from "ably"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.ABLY_API_KEY) {
      return NextResponse.json({ error: "Ably not configured" }, { status: 503 })
    }

    const ably = new Ably.Rest({ key: process.env.ABLY_API_KEY })
    
    const token = await ably.auth.createTokenRequest({
      clientId: session.user.id,
      ttl: 60 * 60 * 1000, // 1 hour
    })

    return NextResponse.json(token)
  } catch (error) {
    console.error("Error creating Ably token:", error)
    return NextResponse.json({ error: "Token creation failed" }, { status: 500 })
  }
} 