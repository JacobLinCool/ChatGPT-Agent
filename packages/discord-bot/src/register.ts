import { config } from "dotenv";
import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { PRESET } from "./preset";

const commands = [
    new SlashCommandBuilder()
        .setName("auth")
        .setDescription("Auth with JWT, the token will be stored in the bot")
        .addStringOption((option) => option.setName("token").setDescription("Refresh token"))
        .addAttachmentOption((option) =>
            option.setName("file").setDescription("A file containing the refresh token"),
        ),
    new SlashCommandBuilder()
        .setName("revoke")
        .setDescription("Revoke the previously stored token"),
    new SlashCommandBuilder().setName("me").setDescription("Get information about your token"),
    new SlashCommandBuilder()
        .setName("start")
        .setDescription("Start a conversation with the bot")
        .addStringOption((option) =>
            option
                .setName("preset")
                .setDescription("Preset to use")
                .addChoices(
                    ...Object.keys(PRESET).map((preset) => ({
                        name: preset,
                        value: preset,
                    })),
                ),
        ),
    new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Stop the current conversation with the bot"),
    new SlashCommandBuilder()
        .setName("public")
        .setDescription("Make the your conversation public in the channel"),
    new SlashCommandBuilder()
        .setName("private")
        .setDescription("Revoke the public access in the channel"),
    new SlashCommandBuilder().setName("sessions").setDescription("Show the current sessions"),
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
