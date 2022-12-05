import { randomUUID } from "node:crypto";
import fetch from "node-fetch";

export function headers(token: string): Record<string, string> {
    return {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        referer: "https://chat.openai.com/chat",
    };
}

export async function moderate(
    token: string,
    input: string,
): Promise<{ flagged: boolean; blocked: boolean; moderation_id: string }> {
    const result = await fetch("https://chat.openai.com/backend-api/moderations", {
        headers: headers(token),
        body: JSON.stringify({
            input,
            model: "text-moderation-playground",
        }),
        method: "POST",
    });

    const data = await result.json();
    return data;
}

export async function converse(
    token: string,
    content: string,
    conversation_id?: string,
    parent_id?: string,
): Promise<NodeJS.ReadableStream> {
    const res = await fetch("https://chat.openai.com/backend-api/conversation", {
        headers: {
            ...headers(token),
            accept: "text/event-stream",
            "X-OpenAI-Assistant-App-Id": "",
        },
        body: JSON.stringify({
            action: "next",
            messages: [
                {
                    id: randomUUID(),
                    role: "user",
                    content: { content_type: "text", parts: [content] },
                },
            ],
            parent_message_id: parent_id || randomUUID(),
            conversation_id,
            model: "text-davinci-002-render",
        }),
        method: "POST",
    });

    return res.body;
}
