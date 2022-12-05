import { Bot } from "pure-cat";
import { FileStore } from "pure-cat-store-file";
import { Events } from "discord.js";
import { AgentModule } from "./module";

new Bot({ events: [Events.InteractionCreate, Events.MessageCreate] })
    .use(new FileStore())
    .use(new AgentModule())
    .start()
    .then(() => console.log("Bot started!"));
