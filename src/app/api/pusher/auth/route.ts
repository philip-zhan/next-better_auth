import { NextResponse } from "next/server";
import { pusher, getUserChannel } from "@/lib/pusher";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const userId = session.session.userId;

    const formData = await req.formData();
    const socketId = formData.get("socket_id") as string;
    const channel = formData.get("channel_name") as string;

    if (!socketId || !channel) {
      return NextResponse.json(
        { error: "Missing socket_id or channel_name" },
        { status: 400 }
      );
    }

    // Verify the user is subscribing to their own channel
    const expectedChannel = getUserChannel(userId);
    if (channel !== expectedChannel) {
      return NextResponse.json(
        { error: "Unauthorized channel subscription" },
        { status: 403 }
      );
    }

    // Authorize the channel subscription
    const authResponse = pusher.authorizeChannel(socketId, channel);

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Error authenticating Pusher channel:", error);
    return NextResponse.json(
      { error: "Failed to authenticate channel" },
      { status: 500 }
    );
  }
}

