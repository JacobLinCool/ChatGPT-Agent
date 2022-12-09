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
        this.agent.sessions.delete(this.id);
        this.id = id;
        this.agent.sessions.set(this.id, this);
    }

    public replies(): Conversation[] {
        return this.history
            .filter((h) => h.author === "assistant" && h.conversation)
            .map((h) => h.conversation) as Conversation[];
    }
}
