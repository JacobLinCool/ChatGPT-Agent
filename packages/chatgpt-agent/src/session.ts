import EventEmitter from "node:events";
import type { Agent } from "./agent";
import { Conversation } from "./conversation";

export class Session extends EventEmitter {
    /**
     * Session id.
     */
    public id = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    /**
     * The conversation history, including the user's messages and the assistant's replies.
     * Only the assistant's replies have a conversation property.
     */
    public history: {
        author: "user" | "assistant";
        message: string;
        id: string;
        conversation?: Conversation;
    }[] = [];

    constructor(public agent: Agent) {
        super();
    }

    /**
     * Sends a message to the session.
     * @param message The message to send.
     * @returns A new conversation.
     */
    public talk(message: string): Conversation {
        this.history.push({
            author: "user",
            message,
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        });
        return new Conversation(this, message);
    }

    public rename(id: string): void {
        this.emit("rename", { old: this.id, new: id });
        this.id = id;
    }

    /**
     * Get all the replies from the session.
     * @returns An array of conversations.
     */
    public replies(): Conversation[] {
        return this.history
            .filter((h) => h.author === "assistant" && h.conversation)
            .map((h) => h.conversation) as Conversation[];
    }

    public on(event: "rename", listener: (data: { old: string; new: string }) => void): this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public on(event: string, listener: (...args: any[]) => void): this {
        return super.on(event, listener);
    }
}
