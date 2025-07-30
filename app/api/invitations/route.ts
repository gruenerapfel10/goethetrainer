import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// GET /api/invitations?token=... - Get invitation details
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        sender: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
        workspace: {
          select: {
            name: true,
            description: true,
          },
        },
      },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      )
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Invitation has already been processed" },
        { status: 400 }
      )
    }

    if (invitation.expiresAt < new Date()) {
      // Mark as expired
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      })

      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        message: invitation.message,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
        sender: invitation.sender,
        workspace: invitation.workspace,
      },
    })
  } catch (error) {
    console.error("Get invitation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/invitations?token=... - Accept or decline invitation
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    const body = await req.json()
    const { action } = body // "accept" or "decline"

    if (!["accept", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'accept' or 'decline'" },
        { status: 400 }
      )
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        workspace: true,
      },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      )
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Invitation has already been processed" },
        { status: 400 }
      )
    }

    if (invitation.expiresAt < new Date()) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      })

      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      )
    }

    // Check if invitation email matches user email
    if (invitation.email !== session.user.email) {
      return NextResponse.json(
        { error: "Invitation email does not match your account" },
        { status: 403 }
      )
    }

    if (action === "accept") {
      // Check if user is already a member
      const existingMembership = await prisma.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: session.user.id,
            workspaceId: invitation.workspaceId,
          },
        },
      })

      if (existingMembership) {
        return NextResponse.json(
          { error: "You are already a member of this workspace" },
          { status: 400 }
        )
      }

      // Create membership and update invitation
      await prisma.$transaction([
        prisma.membership.create({
          data: {
            userId: session.user.id,
            workspaceId: invitation.workspaceId,
            role: invitation.role,
          },
        }),
        prisma.invitation.update({
          where: { id: invitation.id },
          data: {
            status: "ACCEPTED",
            recipientId: session.user.id,
          },
        }),
      ])

      return NextResponse.json({
        message: "Invitation accepted successfully",
        workspace: invitation.workspace,
      })
    } else {
      // Decline invitation
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          status: "DECLINED",
          recipientId: session.user.id,
        },
      })

      return NextResponse.json({
        message: "Invitation declined",
      })
    }
  } catch (error) {
    console.error("Process invitation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 