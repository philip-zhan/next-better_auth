import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

export const maxDuration = 60;

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const result = streamText({
        model: openai("gpt-5-mini"),
        messages: convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
}
