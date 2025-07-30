import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"
import { Resend } from "resend"
import { randomUUID } from "crypto"

const prisma = new PrismaClient()
const resend = new Resend(process.env.RESEND_API_KEY)

const inviteSchema = z.object({
  email: z.string().email("Valid email is required"),
  role: z.enum(["VIEWER", "EDITOR", "OWNER"]).default("VIEWER"),
  message: z.string().optional(),
})

// POST /api/workspaces/invite?id=... - Send invitation
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('id')
    
    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 })
    }

    const body = await req.json()
    const { email, role, message } = inviteSchema.parse(body)

    // Check if user has permission to invite (must be EDITOR or OWNER)
    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: session.user.id,
          workspaceId,
        },
      },
    })

    if (!membership || membership.role === "VIEWER") {
      return NextResponse.json(
        { error: "Insufficient permissions to invite users" },
        { status: 403 }
      )
    }

    // Check if workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    })

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const existingMembership = await prisma.membership.findFirst({
      where: {
        workspaceId,
        user: {
          email,
        },
      },
    })

    if (existingMembership) {
      return NextResponse.json(
        { error: "User is already a member of this workspace" },
        { status: 400 }
      )
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        workspaceId,
        status: "PENDING",
      },
    })

    // If there's an existing invitation, check if it's expired
    if (existingInvitation) {
      if (existingInvitation.expiresAt < new Date()) {
        // Mark expired invitation as expired and continue with new invitation
        await prisma.invitation.update({
          where: { id: existingInvitation.id },
          data: { status: "EXPIRED" },
        })
      } else {
        // Resend the existing invitation by updating the expiry and regenerating token
        const newToken = randomUUID()
        const updatedInvitation = await prisma.invitation.update({
          where: { id: existingInvitation.id },
          data: {
            token: newToken,
            message: message || existingInvitation.message,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Reset to 7 days
            updatedAt: new Date(),
          },
          include: {
            sender: {
              select: {
                name: true,
                email: true,
              },
            },
            workspace: {
              select: {
                name: true,
              },
            },
          },
        })

        // Send the resent invitation email
        try {
          const inviteUrl = `${process.env.NEXTAUTH_URL}/invitations?token=${updatedInvitation.token}`
          
          if (process.env.RESEND_API_KEY) {
                         await resend.emails.send({
               from: "noreply@pacemakercolab.com", // Use your verified domain
               to: email, // Send to the actual email address entered
              subject: `Invitation to join ${workspace.name} (Resent)`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2>You've been invited to collaborate! (Resent)</h2>
                  <p>Hi there,</p>
                  <p><strong>${updatedInvitation.sender.name || updatedInvitation.sender.email}</strong> has resent you an invitation to join the workspace <strong>"${workspace.name}"</strong> as a ${role.toLowerCase()}.</p>
                  ${message ? `<p><em>Message: ${message}</em></p>` : ""}
                  <div style="margin: 30px 0;">
                    <a href="${inviteUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept Invitation</a>
                  </div>
                  <p>This invitation will expire in 7 days.</p>
                  <p>If you don't want to receive these emails, you can ignore this invitation.</p>
                  <hr>
                  <p style="color: #666; font-size: 12px;">
                                  <strong>Professional Email:</strong> Sent from your custom domain pacemakercolab.com<br>
                    <strong>Invitation link:</strong> <a href="${inviteUrl}">${inviteUrl}</a>
                  </p>
                </div>
              `,
            })
          }
        } catch (emailError) {
          console.error("Failed to resend invitation email:", emailError)
        }

        return NextResponse.json({
          message: "Invitation resent successfully",
          invitation: {
            id: updatedInvitation.id,
            email: updatedInvitation.email,
            role: updatedInvitation.role,
            status: updatedInvitation.status,
            createdAt: updatedInvitation.createdAt,
            expiresAt: updatedInvitation.expiresAt,
          },
        })
      }
    }

    // Find recipient user (if they exist)
    const recipientUser = await prisma.user.findUnique({
      where: { email },
    })

    // Generate a unique token for the invitation
    const token = randomUUID()

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        email,
        role,
        message,
        token,
        senderId: session.user.id,
        recipientId: recipientUser?.id,
        workspaceId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      include: {
        sender: {
          select: {
            name: true,
            email: true,
          },
        },
        workspace: {
          select: {
            name: true,
          },
        },
      },
    })

    // Send email invitation
    try {
      const inviteUrl = `${process.env.NEXTAUTH_URL}/invitations?token=${invitation.token}`
      
      if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: "noreply@pacemakercolab.com", // Use your verified domain
          to: email, // Send to the actual email address entered
          subject: `Invitation to join ${workspace.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>You've been invited to collaborate!</h2>
              <p>Hi there,</p>
              <p><strong>${invitation.sender.name || invitation.sender.email}</strong> has invited you to join the workspace <strong>"${workspace.name}"</strong> as a ${role.toLowerCase()}.</p>
              ${message ? `<p><em>Message: ${message}</em></p>` : ""}
              <div style="margin: 30px 0;">
                <a href="${inviteUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept Invitation</a>
              </div>
              <p>This invitation will expire in 7 days.</p>
              <p>If you don't want to receive these emails, you can ignore this invitation.</p>
              <hr>
              <p style="color: #666; font-size: 12px;">
                <strong>Professional Email:</strong> Sent from your custom domain pacemakercolab.com<br>
                <strong>Invitation link:</strong> <a href="${inviteUrl}">${inviteUrl}</a>
              </p>
            </div>
          `,
        })
      }
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      message: "Invitation sent successfully",
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Invitation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 