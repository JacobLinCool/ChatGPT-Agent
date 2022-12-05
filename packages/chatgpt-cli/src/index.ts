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

const agent = new Agent(token);
const session = agent.session();

ask(process.argv[2]);

async function ask(prefill?: string) {
    const io = createInterface({ input: process.stdin, output: process.stdout });
    io.write("\x1b[33m");
    const message = await new Promise<string>((resolve) => {
        if (prefill) {
            io.write("You: " + prefill + "\n");
            resolve(prefill);
        } else {
            io.question("You: ", resolve);
        }
    });
    io.write("\x1b[0m");
    io.close();

    const conv = session.talk(message);
    const spinner = ora("Thinking ...").start();

    const update = (partial: string) => {
        spinner.text = `Assistant: ${partial} ...`;
    };

    conv.on("partial", update);
    const response = await conv.response;
    conv.off("partial", update);

    spinner.stop();
    console.log(`Assistant: ${response.trim()}`);

    if (!message.toLowerCase().startsWith("bye")) {
        ask();
    }
}
