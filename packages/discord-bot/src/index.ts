import { Bot } from "pure-cat";
import { FileStore } from "pure-cat-store-file";
import { AgentModule } from "./module";

new Bot()
    .use(new FileStore())
    .use(new AgentModule())
    .start()
    .then(() => console.log("Bot started!"));

process.on("SIGTERM", () => {
    process.exit();
});
