import { BaseModule, CallNextModule, Module, StoreContext } from "pure-cat";
import { ChannelType, ClientEvents, GatewayIntentBits, Message } from "discord.js";
import decode from "jwt-decode";
import { PRESET } from "./preset";
import { talk } from "./agent";

export class Agent extends BaseModule implements Module {
    public intents = [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
    ];

    async interactionCreate(
        args: ClientEvents["interactionCreate"],
        ctx: StoreContext,
        next: CallNextModule,
    ): Promise<void> {
        const interaction = args[0];

        if (interaction.isChatInputCommand()) {
            switch (interaction.commandName) {
                case "auth": {
                    const token = interaction.options.getString("token", true);

                    await interaction.reply({ ephemeral: true, content: "Authenticating ..." });

                    const data = await ctx.user<{ "openai-token": string }>();
                    if (data) {
                        data["openai-token"] = token;
                    }

                    await interaction.editReply(":white_check_mark: Successfully authenticated");

                    break;
                }
                case "revoke": {
                    const data = await ctx.user<{ "openai-token"?: string }>();

                    if (data && data["openai-token"]) {
                        data["openai-token"] = undefined;
                        await interaction.reply({
                            ephemeral: true,
                            content: ":white_check_mark: Successfully revoked your token",
                        });
                    } else {
                        await interaction.reply({
                            ephemeral: true,
                            content: ":x: There is no token to revoke",
                        });
                    }

                    break;
                }
                case "me": {
                    const data = await ctx.user<{ "openai-token"?: string }>();

                    if (data && data["openai-token"]) {
                        const decoded = decode(data["openai-token"]);
                        await interaction.reply({
                            ephemeral: true,
                            content: "```json\n" + JSON.stringify(decoded, null, 4) + "\n```",
                        });
                    } else {
                        await interaction.reply({
                            ephemeral: true,
                            content: ":x: There is no token on your account",
                        });
                    }

                    break;
                }
                case "start": {
                    const preset = interaction.options.getString("preset", false) || "default";

                    const data = await ctx.user<{
                        "openai-token"?: string;
                        conversation?: string;
                        prev?: string;
                        parent?: string;
                    }>();
                    if (!data || !data["openai-token"]) {
                        await interaction.reply({
                            ephemeral: true,
                            content:
                                ":x: You need to authenticate first, use `/auth` and provide your JWT",
                        });
                        return;
                    }
                    if (data.conversation) {
                        await interaction.reply({
                            ephemeral: true,
                            content:
                                ":x: You already started a session, use `/stop` to stop it first",
                        });
                        return;
                    }

                    const preloads =
                        preset in PRESET
                            ? PRESET[preset as keyof typeof PRESET]
                            : PRESET["default"];

                    await interaction.deferReply();

                    data.prev = "";
                    data.parent = undefined;
                    for (const preload of preloads) {
                        data.prev += preload + "\n\n";
                        await talk(
                            data["openai-token"],
                            data.prev,
                            (conv, parent) => {
                                data.conversation = conv;
                                data.parent = parent;
                            },
                            data.conversation,
                            data.parent,
                        );
                    }

                    await interaction.editReply({
                        content:
                            ":white_check_mark: Started a session with preset `" + preset + "`",
                    });

                    break;
                }
                case "stop": {
                    const data = await ctx.user<{ conversation?: string }>();
                    if (!data || !data.conversation) {
                        await interaction.reply({
                            ephemeral: true,
                            content: ":x: You didn't start a session yet",
                        });
                        return;
                    }

                    data.conversation = undefined;

                    await interaction.reply({
                        ephemeral: true,
                        content: ":white_check_mark: Successfully stopped the session",
                    });

                    break;
                }
            }
        } else {
            await next();
        }
    }

    async messageCreate(
        args: [message: Message<boolean>],
        ctx: StoreContext,
        next: CallNextModule,
    ): Promise<void> {
        const message = args[0];
        const chan = message.channel;

        if (message.author.bot) {
            await next();
            return;
        }

        if (chan.isTextBased() === false) {
            await next();
            return;
        }

        const data = await ctx.user<{
            conversation?: string;
            "openai-token"?: string;
            prev?: string;
            parent?: string;
        }>();
        if (!data || !data.conversation || !data["openai-token"] || !data.prev || !data.parent) {
            await next();
            return;
        }

        data.prev += message.content + "\n\n";

        let done = false;

        const typing = setInterval(async () => {
            if (done) {
                clearInterval(typing);
            } else {
                try {
                    await chan.sendTyping();
                } catch {
                    clearInterval(typing);
                }
            }
        }, 5000);

        await talk(
            data["openai-token"],
            data.prev,
            (id, parent, text) => {
                message.reply(text).catch((e) => {
                    console.error(e);
                });
                data.parent = parent;
                done = true;
            },
            data.conversation,
            data.parent,
        );
    }
}
