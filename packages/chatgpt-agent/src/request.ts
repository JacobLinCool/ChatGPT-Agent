import { randomUUID } from "node:crypto";
import fetch, { Headers } from "node-fetch";
import { log } from "./debug";
import { CHATGPT_BACKEND, CHATGPT_TIMEOUT, CHATGPT_RETRY } from "./config";

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
    backend = CHATGPT_BACKEND,
    timeout = CHATGPT_TIMEOUT,
): Promise<{ flagged: boolean; blocked: boolean; moderation_id: string }> {
    const headers = make_headers(token);
    log(headers);

    for (let i = 0; i <= CHATGPT_RETRY; i++) {
        try {
            const controller = new AbortController();
            const timeout_id = setTimeout(() => controller.abort(), timeout);

            const res = await fetch(`${backend}/moderations`, {
                headers,
                body: JSON.stringify({
                    input,
                    model: "text-moderation-playground",
                }),
                method: "POST",
                // @ts-expect-error signal should be compatible with AbortSignal
                signal: controller.signal,
            });
            clearTimeout(timeout_id);

            if (controller.signal.aborted) {
                throw new Error("Request timed out");
            }

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
        } catch (err) {
            if (i === CHATGPT_RETRY - 1) {
                throw err;
            }
            log("retrying moderation request", i + 1);
        }
    }

    throw new Error("Failed to moderate");
}

/**
 * Sends a request to the ChatGPT API to get a response body.
 *
 * @param token - The ChatGPT token
 * @param content - The content of the message
 * @param conversation_id - The conversation id (optional)
 * @param parent_id - The parent id (optional)
 * @param backend - The ChatGPT backend (optional)
 * @param timeout - The timeout (optional)
 * @returns The response body from the ChatGPT API
 */
export async function converse(
    token: string,
    content: string,
    conversation_id?: string,
    parent_id?: string,
    backend = CHATGPT_BACKEND,
    timeout = CHATGPT_TIMEOUT,
): Promise<NodeJS.ReadableStream> {
    const headers = make_headers(token);
    headers.set("Accept", "text/event-stream");
    log(headers);

    for (let i = 0; i <= CHATGPT_RETRY; i++) {
        try {
            const controller = new AbortController();
            const timeout_id = setTimeout(() => controller.abort(), timeout);

            const res = await fetch(`${backend}/conversation`, {
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
                // @ts-expect-error signal should be compatible with AbortSignal
                signal: controller.signal,
            });
            clearTimeout(timeout_id);

            if (controller.signal.aborted) {
                throw new Error("Request timed out");
            }

            log("sent conversation request", res.status);
            if (res.status !== 200) {
                try {
                    const data = await res.clone().json();
                    log("conversation error", data);
                    throw new Error(data?.error?.detail);
                } catch {
                    const text = await res.clone().text();
                    log("conversation error", text);
                    throw new Error(text);
                }
            }

            return res.body;
        } catch (err) {
            if (i === CHATGPT_RETRY - 1) {
                throw err;
            }
            log("retrying conversation request", i + 1);
        }
    }

    throw new Error("Failed to converse");
}

export async function refresh(refresh_token: string): Promise<{ token: string; refresh: string }> {
    const headers = make_headers();
    headers.set("Cookie", `__Secure-next-auth.session-token=${refresh_token}`);
    log(headers);

    const res = await fetch("https://chat.openai.com/api/auth/session", { headers });
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
    if (data?.error) {
        throw new Error(data.error);
    }

    const new_refresh_token = res.headers.get("set-cookie")?.split(";")[0];
    const refresh = new_refresh_token?.split("=")[1];

    if (data?.accessToken) {
        const new_refresh_token = res.headers.get("set-cookie")?.split(";")[0];
        if (new_refresh_token) {
            log("refreshed refresh token", new_refresh_token);
        }
        return {
            token: data.accessToken,
            refresh: refresh || "",
        };
    } else {
        throw new Error("No access token returned");
    }
}
