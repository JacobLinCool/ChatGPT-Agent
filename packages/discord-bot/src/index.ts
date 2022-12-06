import { Partials } from "discord.js";
import { Bot } from "pure-cat";
import { FileStore } from "pure-cat-store-file";
import { AgentModule } from "./module";

const bot = new Bot().use(new FileStore()).use(new AgentModule());
bot.client.options.partials = [Partials.Message, Partials.Channel];

bot.start().then(() => console.log("Bot started!"));

process.on("SIGTERM", () => {
    process.exit();
});
