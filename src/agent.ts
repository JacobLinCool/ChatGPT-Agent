import { randomUUID } from "crypto";

const headers = (token: string) => ({
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    Referer: "https://chat.openai.com/chat",
});

export async function mod(
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

    if (!result.ok) {
        throw new Error(`Failed to fetch: ${result.status} ${result.statusText}`);
    }

    const data = await result.json();
    return data;
}

export async function talk(
    token: string,
    content: string,
    prev_content: string,
    reolve: (conversation_id: string, message_id: string, response: string) => void,
    conversation_id?: string,
    parent_id?: string,
): Promise<void> {
    console.log(conversation_id);
    await mod(token, prev_content + content)
        .then((data) => {
            console.log(data);
        })
        .catch((err) => {
            console.error(err);
        });

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

    if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}: ${res.statusText}`);
    }
    const text = await res.text();

    await new Promise((r) => {
        const data = text
            .split("\n\n")
            .map((x) => x.trim())
            .filter((x) => x.length > 0)
            .reverse();

        try {
            const parsed: {
                message: {
                    id: string;
                    content: {
                        content_type: "text";
                        parts: string[];
                    };
                };
                conversation_id: string;
            } = JSON.parse(data[1].replace(/^data: /, ""));

            console.log(parsed.message);
            reolve(
                parsed.conversation_id,
                parsed.message.id,
                parsed.message.content.parts.join("\n"),
            );
        } catch (e) {
            console.error(data[1]);
        }

        r(true);
    });
}
