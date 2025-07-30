import { auth } from "@/lib/auth"
import { Liveblocks } from "@liveblocks/node"

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
})

export async function POST() {
  try {
    // Get the current user from NextAuth
    const session = await auth()
    
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 })
    }

    // Create user info for Liveblocks
    const user = {
      id: session.user.id,
      info: {
        id: session.user.id,
        name: session.user.name || "Anonymous",
        email: session.user.email || "",
        avatar: session.user.image || undefined,
      },
    }

    // Identify the user with Liveblocks
    const { status, body } = await liveblocks.identifyUser(
      { userId: user.id, groupIds: [] },
      { userInfo: user.info }
    )
    
    return new Response(body, { status })
  } catch (error) {
    console.error("Liveblocks auth error:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
} 