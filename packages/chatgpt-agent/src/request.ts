import { randomUUID } from "node:crypto";
import fetch, { Headers } from "node-fetch";
import { log } from "./debug";

export function make_headers(token?: string): Headers {
    const headers = new Headers();
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    headers.set("Content-Type", "application/json");
    headers.set(
        "User-Agent",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36",
    );
    return headers;
}

export async function moderate(
    token: string,
    input: string,
): Promise<{ flagged: boolean; blocked: boolean; moderation_id: string }> {
    const headers = make_headers(token);
    log(headers);
    const res = await fetch("https://chat.openai.com/backend-api/moderations", {
        headers,
        body: JSON.stringify({
            input,
            model: "text-moderation-playground",
        }),
        method: "POST",
    });
    log("sent moderation request", res.status);
    if (res.status !== 200) {
        try {
            const data = await res.clone().json();
            log("moderation error", data);
            throw new Error(data?.error);
        } catch {
            const text = await res.clone().text();
            log("moderation error", text);
            throw new Error(text);
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
    const headers = make_headers(token);
    headers.set("Accept", "text/event-stream");
    log(headers);
    const res = await fetch("https://chat.openai.com/backend-api/conversation", {
        headers,
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
            const data = await res.clone().json();
            log("conversation error", data);
            throw new Error(data?.error);
        } catch {
            const text = await res.clone().text();
            log("conversation error", text);
            throw new Error(text);
        }
    }

    return res.body;
}

export async function refresh(refresh_token: string): Promise<string | undefined> {
    const headers = make_headers();
    headers.set("Cookie", `__Secure-next-auth.session-token=${refresh_token}`);
    log(headers);
    const res = await fetch("https://chat.openai.com/api/auth/session", {
        headers,
    });
    log("sent refresh request", res.status);
    if (res.status !== 200) {
        try {
            const data = await res.clone().json();
            log("refresh error", data);
            throw new Error(data?.error);
        } catch {
            const text = await res.clone().text();
            log("refresh error", text);
            throw new Error(text);
        }
    }

    const data = await res.json();
    return data?.accessToken;
}
