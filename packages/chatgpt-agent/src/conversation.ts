import EventEmitter from "node:events";
import type { Session } from "./session";
import { converse } from "./request";
import { log } from "./debug";

export class Conversation extends EventEmitter {
    public response: Promise<string>;

    constructor(public session: Session, public message: string) {
        super();
        this.response = this.run();
    }

    public async run(): Promise<string> {
        const result = await this.converse().catch((err) => (this.emit("error", err), ""));
        log("Conversation Result", result);
        return result;
    }

    public async converse(): Promise<string> {
        const history = this.session.history.filter((h) => h.author === "assistant");

        const stream = await converse(
            this.session.agent.token,
            this.message,
            this.session.id.startsWith("tmp-") ? undefined : this.session.id,
            history[history.length - 1]?.id,
            this.session.agent.backend,
        );

        let last: Block;
        return await new Promise<string>((resolve) => {
            let data = "";
            stream.on("data", (chunk: Buffer) => {
                data += chunk.toString();
                const split = data.indexOf("\n\n");
                if (split !== -1) {
                    const part = data.slice(0, split).replace(/^data: /, "");
                    log("Partially Received", part);
                    if (part.startsWith("[DONE]")) {
                        return;
                    }
                    try {
                        const json: Block = JSON.parse(part);
                        this.emit("partial", json.message.content.parts.join("\n"));
                        last = json;
                    } catch (err) {
                        this.emit("error", err as Error);
                    }
                    data = data.slice(split + 2);
                }
            });
            stream.on("end", () => {
                const response = last?.message.content.parts.join("\n");
                log("Received", response);
                this.session.history.push({
                    id: last?.message.id,
                    author: "assistant",
                    message: response,
                });
                this.session.rename(last?.conversation_id);
                this.emit("complete", response);
                resolve(response);
            });
        });
    }

    public on(event: "partial", listener: (partial: string) => void): this;
    public on(event: "complete", listener: (complete: string) => void): this;
    public on(event: "error", listener: (error: Error) => void): this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public on(event: string, listener: (...args: any[]) => void): this {
        return super.on(event, listener);
    }

    public once(event: "partial", listener: (partial: string) => void): this;
    public once(event: "complete", listener: (complete: string) => void): this;
    public once(event: "error", listener: (error: Error) => void): this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public once(event: string, listener: (...args: any[]) => void): this {
        return super.once(event, listener);
    }

    public off(event: "partial", listener: (partial: string) => void): this;
    public off(event: "complete", listener: (complete: string) => void): this;
    public off(event: "error", listener: (error: Error) => void): this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public off(event: string, listener: (...args: any[]) => void): this {
        return super.off(event, listener);
    }

    public emit(event: "partial", partial: string): boolean;
    public emit(event: "complete", complete: string): boolean;
    public emit(event: "error", error: Error): boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public emit(event: string, ...args: any[]): boolean {
        return super.emit(event, ...args);
    }
}

export interface Block {
    message: {
        id: string;
        role: "assistant";
        user: null;
        create_time: null;
        update_time: null;
        content: { content_type: "text"; parts: string[] };
        end_turn: null;
        weight: number;
        metadata: unknown;
        recipient: "all";
    };
    conversation_id: string;
    error: null;
}
