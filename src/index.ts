import { Bot } from "pure-cat";
import { FileStore } from "pure-cat-store-file";
import { Events } from "discord.js";
import { Agent } from "./module";

new Bot({ events: [Events.InteractionCreate, Events.MessageCreate] })
    .use(new FileStore())
    .use(new Agent())
    .start()
    .then(() => console.log("Bot started!"));
