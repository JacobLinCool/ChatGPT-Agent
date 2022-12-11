import EventEmitter from "node:events";
import { Session } from "./session";
import { refresh } from "./request";
import { CHATGPT_BACKEND, CHATGPT_TIMEOUT } from "./config";

export class Agent extends EventEmitter {
    public sessions = new Map<string, Session>();
    public backend: string;
    public timeout: number;

    /**
     * @param token - The token to use.
     * @param refresh_token - Optional refresh token.
     * @param options - Options, including the api backend and timeout.
     */
    constructor(
        public token: string,
        public refresh_token?: string,
        {
            backend = CHATGPT_BACKEND,
            timeout = CHATGPT_TIMEOUT,
        }: { backend?: string; timeout?: number } = {},
    ) {
        super();
        this.backend = backend;
        this.timeout = timeout;
    }

    /**
     * Creates a new session.
     */
    public session(): Session {
        const sess = new Session(this);
        this.sessions.set(sess.id, sess);
        sess.on("rename", (data) => {
            this.sessions.delete(data.old);
            this.sessions.set(data.new, sess);
        });
        return sess;
    }

    /**
     * Refreshes the token using the refresh token.
     *
     * @throws Error if no refresh token is set.
     * @throws Error if the token could not be refreshed.
     */
    public async refresh(): Promise<void> {
        if (!this.refresh_token) {
            throw new Error("No refresh token");
        }

        const result = await refresh(this.refresh_token);

        this.token = result.token;
        this.refresh_token = result.refresh;
        this.emit("refresh", result);
    }

    /**
     * Validates the token
     * @returns true if the token is valid, false otherwise.
     */
    public validate(): boolean {
        try {
            const [header, payload, signature] = this.token.split(".");

            if (!header || !payload || !signature) {
                return false;
            }

            const payloadJSON = JSON.parse(Buffer.from(payload, "base64").toString());
            if (payloadJSON.exp < Date.now() / 1000) {
                return false;
            }

            return true;
        } catch {
            return false;
        }
    }

    public on(event: "refresh", listener: (data: { token: string; refresh: string }) => void): this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public on(event: string, listener: (...args: any[]) => void): this {
        return super.on(event, listener);
    }

    public off(
        event: "refresh",
        listener: (data: { token: string; refresh: string }) => void,
    ): this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public off(event: string, listener: (...args: any[]) => void): this {
        return super.off(event, listener);
    }
}
