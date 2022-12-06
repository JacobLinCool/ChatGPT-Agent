#!/usr/bin/env node
import { createInterface } from "node:readline";
import { config } from "dotenv";
import { Agent } from "chatgpt-agent";
import ora from "ora";

config();
config({ path: "~/.chatgpt.env" });

const token = process.env.TOKEN;
if (!token) {
    throw new Error("You must provide a token as environment variable `TOKEN`");
}

const agent = new Agent(token, token);
const session = agent.session();

(async () => {
    if (!agent.validate()) {
        await agent.refresh();
        console.log("Refreshed token", agent.token);
    }

    ask(process.argv.slice(2));
})();

async function ask(prefills?: string[]) {
    const io = createInterface({ input: process.stdin, output: process.stdout });
    io.write("\x1b[33m");
    const message = await new Promise<string>((resolve) => {
        if (prefills?.length) {
            io.write("You: " + prefills[0] + "\n");
            resolve(prefills[0]);
        } else {
            io.question("You: ", resolve);
        }
    });
    io.write("\x1b[0m");
    io.close();

    const conv = session.talk(message);
    const spinner = ora("Assistant: Thinking ...").start();

    const update = (partial: string) => {
        spinner.text = `Assistant: ${partial} ...`;
    };

    conv.on("partial", update);
    conv.once("error", (err) => {
        spinner.fail(`ERROR: ${err.message}`);
    });
    const response = await conv.response;
    conv.off("partial", update);

    spinner.stop();
    console.log(`Assistant: ${response.trim()}`);

    if (!message.toLowerCase().startsWith("bye")) {
        ask(prefills?.slice(1));
    }
}
