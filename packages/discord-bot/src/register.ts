import { config } from "dotenv";
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const commands = [
    new SlashCommandBuilder()
        .setName("auth")
        .setDescription("Auth with JWT, the token will be stored in the bot")
        .addStringOption((option) =>
            option.setName("token").setDescription("JWT token").setRequired(true),
        ),
    new SlashCommandBuilder()
        .setName("revoke")
        .setDescription("Revoke the previously stored token"),
    new SlashCommandBuilder().setName("me").setDescription("Get information about your token"),
    new SlashCommandBuilder()
        .setName("start")
        .setDescription("Start a conversation with the bot")
        .addStringOption((option) => option.setName("preset").setDescription("Preset to use")),
    new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Stop the current conversation with the bot"),
    new SlashCommandBuilder()
        .setName("public")
        .setDescription("Make the your conversation public in the channel"),
    new SlashCommandBuilder()
        .setName("private")
        .setDescription("Revoke the public access in the channel"),
].map((command) => command.toJSON());

(async () => {
    config();
    if (!process.env.BOT_TOKEN) {
        console.error("No bot token provided");
        process.exit(1);
    }
    if (!process.env.BOT_ID) {
        console.error("No bot id provided");
        process.exit(1);
    }

    const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        const data = (await rest.put(Routes.applicationCommands(process.env.BOT_ID), {
            body: commands,
        })) as unknown[];

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (err) {
        console.error(err);
    }
})();
