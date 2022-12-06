import { randomUUID } from "node:crypto";
import fetch from "node-fetch";
import { log } from "./debug";

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
    const res = await fetch("https://chat.openai.com/backend-api/moderations", {
        headers: headers(token),
        body: JSON.stringify({
            input,
            model: "text-moderation-playground",
        }),
        method: "POST",
    });
    log("sent moderation request", res.status);
    if (res.status !== 200) {
        try {
            const data = await res.json();
            log("moderation error", data);
        } catch {
            log("moderation error", await res.text());
        }
    }

    const data = await res.json();
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
    log("sent conversation request", res.status);
    if (res.status !== 200) {
        try {
            const data = await res.json();
            log("conversation error", data);
        } catch {
            log("conversation error", await res.text());
        }
    }

    return res.body;
}

export async function refresh(refresh_token: string): Promise<string | undefined> {
    const res = await fetch("https://chat.openai.com/api/auth/session", {
        headers: {
            ...headers(""),
            authorization: "",
            cookie: `__Secure-next-auth.session-token=${refresh_token}`,
        },
    });
    log("sent refresh request", res.status);
    if (res.status !== 200) {
        try {
            const data = await res.json();
            log("refresh error", data);
        } catch {
            log("refresh error", await res.text());
        }
    }

    const data = await res.json();
    return data?.accessToken;
}
