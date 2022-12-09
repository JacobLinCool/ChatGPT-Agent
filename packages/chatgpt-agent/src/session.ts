import EventEmitter from "node:events";
import type { Agent } from "./agent";
import { Conversation } from "./conversation";

export class Session extends EventEmitter {
    public id = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    public history: {
        author: "user" | "assistant";
        message: string;
        id: string;
        conversation?: Conversation;
    }[] = [];

    constructor(public agent: Agent) {
        super();
    }

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
