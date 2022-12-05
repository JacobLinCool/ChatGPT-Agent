import EventEmitter from "node:events";
import { Session } from "./session";

export class Agent extends EventEmitter {
    public sessions = new Map<string, Session>();

    constructor(public token: string) {
        super();
    }

    public session(): Session {
        const sess = new Session(this);
        this.sessions.set(sess.id, sess);
        return sess;
    }
}
