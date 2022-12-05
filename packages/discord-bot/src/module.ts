import { BaseModule, CallNextModule, Module, StoreContext } from "pure-cat";
import { ClientEvents, GatewayIntentBits, Message } from "discord.js";
import decode from "jwt-decode";
import { Agent, Session } from "chatgpt-agent";
import { PRESET } from "./preset";

export class AgentModule extends BaseModule implements Module {
    name = "agent";

    public intents = [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
    ];

    private agents = new Map<string, Agent>();

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

                    const data = await ctx.user<{ "openai-token"?: string }>();
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

                    const data = await ctx.user<{ "openai-token"?: string }>();
                    if (!data || !data["openai-token"]) {
                        await interaction.reply({
                            ephemeral: true,
                            content:
                                ":x: You need to authenticate first, use `/auth` and provide your JWT",
                        });
                        return;
                    }
                    if (this.agents.has(data["openai-token"])) {
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

                    const agent = new Agent(data["openai-token"]);
                    this.agents.set(data["openai-token"], agent);
                    const sess = agent.session();

                    for (const preload of preloads) {
                        await sess.talk(preload).response;
                    }

                    await interaction.editReply({
                        content:
                            ":white_check_mark: Started a session with preset `" + preset + "`",
                    });

                    break;
                }
                case "stop": {
                    const data = await ctx.user<{ "openai-token"?: string }>();
                    if (!data || !data["openai-token"]) {
                        await interaction.reply({
                            ephemeral: true,
                            content: ":x: You need to authenticate first",
                        });
                        return;
                    }

                    const agent = this.agents.get(data["openai-token"]);
                    if (!agent) {
                        await interaction.reply({
                            ephemeral: true,
                            content: ":x: You need to start a session first",
                        });
                        return;
                    }

                    this.agents.delete(data["openai-token"]);

                    await interaction.reply({
                        ephemeral: true,
                        content: ":white_check_mark: Successfully stopped the session",
                    });

                    break;
                }
                case "public": {
                    const user = await ctx.user<{ "openai-token"?: string }>();
                    if (!user || !user["openai-token"]) {
                        await interaction.reply({
                            ephemeral: true,
                            content: ":x: You need to authenticate first",
                        });
                        return;
                    }

                    const agent = this.agents.get(user["openai-token"]);
                    if (!agent) {
                        await interaction.reply({
                            ephemeral: true,
                            content: ":x: You need to start a session first",
                        });
                        return;
                    }

                    const chan = await ctx.channel<{ public?: string }>();
                    if (!chan) {
                        await interaction.reply({
                            ephemeral: true,
                            content: ":x: Failed to get channel",
                        });
                        return;
                    }

                    chan.public = user["openai-token"];

                    await interaction.reply({
                        content: `:white_check_mark: <@${interaction.user.id}> has made conversation public in this channel`,
                    });

                    break;
                }
                case "private": {
                    const chan = await ctx.channel<{ public?: string }>();
                    if (!chan) {
                        await interaction.reply({
                            ephemeral: true,
                            content: ":x: Failed to get channel",
                        });
                        return;
                    }

                    if (!chan.public) {
                        await interaction.reply({
                            ephemeral: true,
                            content: ":x: There is no public conversation in this channel",
                        });
                        return;
                    }

                    chan.public = undefined;
                    await interaction.reply({
                        content: `:white_check_mark: <@${interaction.user.id}> has made conversation private in this channel`,
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

        const user = await ctx.user<{ "openai-token"?: string }>();
        const channel = await ctx.channel<{ public?: string }>();
        const token = channel?.public || user?.["openai-token"];
        if (!user || !token) {
            await next();
            return;
        }

        const agent = this.agents.get(token);
        if (!agent) {
            await next();
            return;
        }

        let waiting = true;

        try {
            await chan.sendTyping();
        } catch {
            waiting = false;
        }

        const typing = setInterval(async () => {
            if (waiting === false) {
                clearInterval(typing);
            } else {
                try {
                    await chan.sendTyping();
                } catch {
                    clearInterval(typing);
                }
            }
        }, 5000);

        const sess = agent.sessions.values().next().value as Session;
        const conv = sess.talk(message.content);

        let reply: Message;
        let msg = "";
        let bondary = Date.now() + 2000;

        const update = async (partial: string) => {
            msg = partial;

            if (msg.length === 0) {
                return;
            }

            if (waiting) {
                waiting = false;
            }

            if (Date.now() < bondary) {
                return;
            }
            bondary = Date.now() + 1000;

            if (msg.length > 2000) {
                msg = msg.slice(0, 2000);
            }

            if (reply) {
                await reply.edit(msg);
            } else {
                reply = await chan.send(msg);
            }
        };

        conv.on("partial", update);
        conv.once("complete", (msg) => {
            conv.off("partial", update);
            bondary = 0;
            update(msg);
        });
        conv.on("error", (err) => {
            console.error(err);
        });
        await conv.response;
    }
}
