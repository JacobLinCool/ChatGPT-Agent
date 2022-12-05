import EventEmitter from "node:events";
import { Session } from "./session";
import { refresh } from "./request";

export class Agent extends EventEmitter {
    public sessions = new Map<string, Session>();

    constructor(public token: string, public refresh_token?: string) {
        super();
    }

    public session(): Session {
        const sess = new Session(this);
        this.sessions.set(sess.id, sess);
        return sess;
    }

    public async refresh(): Promise<void> {
        if (this.refresh_token) {
            const token = await refresh(this.refresh_token);
            if (token) {
                this.token = token;
            } else {
                throw new Error("Failed to refresh token");
            }
        } else {
            throw new Error("No refresh token");
        }
    }

    public validate(): boolean {
        const [header, payload, signature] = this.token.split(".");
        if (!header || !payload || !signature) {
            return false;
        }

        const payload_json = JSON.parse(Buffer.from(payload, "base64").toString());
        if (payload_json.exp < Date.now() / 1000) {
            return false;
        }

        return true;
    }
}
