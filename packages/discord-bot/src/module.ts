import { BaseModule, CallNextModule, Module, StoreContext } from "pure-cat";
import { ClientEvents, EmbedBuilder, GatewayIntentBits, Message } from "discord.js";
import decode from "jwt-decode";
import { Agent, refresh, Session } from "chatgpt-agent";
import { PRESET } from "./preset";

export class AgentModule extends BaseModule implements Module {
    name = "agent";

    public intents = [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
    ];

    // agent and token is associated with a user
    private agents = new Map<string, Agent>();
    // session is associated with a channel
    private sessions = new Map<
        string,
        { user: string; session: Session; public: boolean; queue: Message[] }
    >();

    async interactionCreate(
        args: ClientEvents["interactionCreate"],
        ctx: StoreContext,
        next: CallNextModule,
    ): Promise<void> {
        const interaction = args[0];

        if (interaction.isChatInputCommand()) {
            switch (interaction.commandName) {
                case "auth": {
                    const raw = interaction.options.getString("token");
                    const file = interaction.options.getAttachment("file");

                    await interaction.reply({ ephemeral: true, content: "Authenticating ..." });

                    const token = raw
                        ? raw
                        : file
                        ? await fetch(file.url).then((res) => res.text())
                        : undefined;

                    if (!token) {
                        await interaction.editReply(":x: You need to provide a token");
                        return;
                    }

                    const is_refresh_token = token.includes("..");
                    if (!is_refresh_token) {
                        await interaction.editReply(":x: This is not a valid token");
                        return;
                    }

                    try {
                        if ((await refresh(token)) === undefined) {
                            throw new Error("Invalid token");
                        }
                    } catch {
                        await interaction.editReply(":x: This refresh token is invalid");
                        return;
                    }

                    const data = await ctx.user<UserStore>();
                    if (data) {
                        data["openai-token"] = token;
                    }

                    await interaction.editReply(":white_check_mark: Successfully authenticated");

                    break;
                }
                case "revoke": {
                    const data = await ctx.user<UserStore>();

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
                    const data = await ctx.user<UserStore>();
                    const token = data?.["openai-token"]
                        ? this.agents.get(data["openai-token"])?.token
                        : undefined;

                    if (token) {
                        const decoded = decode(token);
                        await interaction.reply({
                            ephemeral: true,
                            content: "```json\n" + JSON.stringify(decoded, null, 4) + "\n```",
                        });
                    } else {
                        await interaction.reply({
                            ephemeral: true,
                            content: ":x: There is no token to show",
                        });
                    }

                    break;
                }
                case "start": {
                    const preset = interaction.options.getString("preset", false) || "default";

                    const user = await ctx.user<UserStore>();
                    if (!user || !user["openai-token"]) {
                        await interaction.reply({
                            ephemeral: true,
                            content:
                                ":x: You need to authenticate first, use `/auth` and provide your JWT",
                        });
                        return;
                    }

                    await interaction.deferReply();

                    const agent =
                        this.agents.get(user["openai-token"]) ??
                        new Agent("", user["openai-token"]);

                    if (!this.agents.has(user["openai-token"])) {
                        this.agents.set(user["openai-token"], agent);
                    }

                    try {
                        if (agent.validate() === false) {
                            await agent.refresh();
                        }
                    } catch (err) {
                        await interaction.editReply({
                            content:
                                ":x: Failed to refresh your token, please re-authenticate again",
                        });
                        return;
                    }

                    if (this.sessions.has(interaction.channelId)) {
                        await interaction.editReply({
                            content: ":x: There is already a session running in this channel",
                        });
                        return;
                    }

                    const session = agent.session();
                    this.sessions.set(interaction.channelId, {
                        user: interaction.user.id,
                        session,
                        public: false,
                        queue: [],
                    });

                    const preloads =
                        preset in PRESET
                            ? PRESET[preset as keyof typeof PRESET]
                            : PRESET["default"];

                    try {
                        for (const preload of preloads) {
                            await session.talk(preload).response;
                        }

                        await interaction.editReply({
                            content:
                                ":white_check_mark: Started a session with preset `" + preset + "`",
                        });
                    } catch (err) {
                        if (err instanceof Error) {
                            await interaction.editReply({
                                content:
                                    ":x: ChatGPT was hit by an error: " +
                                    (err?.message || err).toString(),
                            });
                        }
                    }

                    break;
                }
                case "stop": {
                    const session = this.sessions.get(interaction.channelId);
                    if (!session) {
                        await interaction.reply({
                            ephemeral: true,
                            content: ":x: There is no session running in this channel",
                        });
                        return;
                    }

                    if (session.user !== interaction.user.id) {
                        await interaction.reply({
                            ephemeral: true,
                            content: ":x: You are not the owner of this session",
                        });
                        return;
                    }

                    this.sessions.delete(interaction.channelId);
                    session.session.agent.sessions.delete(session.session.id);

                    await interaction.reply({
                        ephemeral: true,
                        content: ":white_check_mark: Successfully stopped the session",
                    });

                    break;
                }
                case "public": {
                    const user = await ctx.user<UserStore>();
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

                    const session = this.sessions.get(interaction.channelId);
                    if (!session) {
                        await interaction.reply({
                            ephemeral: true,
                            content: ":x: There is no session running in this channel",
                        });
                        return;
                    }

                    if (session.user !== interaction.user.id) {
                        await interaction.reply({
                            ephemeral: true,
                            content: ":x: You are not the owner of this session",
                        });
                        return;
                    }

                    session.public = true;

                    await interaction.reply({
                        content: `:white_check_mark: <@${interaction.user.id}> has made conversation public in this channel`,
                    });

                    break;
                }
                case "private": {
                    const session = this.sessions.get(interaction.channelId);

                    if (session?.public) {
                        session.public = false;
                        await interaction.reply({
                            content: `:white_check_mark: <@${interaction.user.id}> has made conversation private in this channel`,
                        });
                    } else {
                        await interaction.reply({
                            ephemeral: true,
                            content: `:x: There is no public conversation in this channel`,
                        });
                    }

                    break;
                }
                case "sessions": {
                    const user = await ctx.user<UserStore>();
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
                            content: ":x: No sessions found",
                        });
                        return;
                    }

                    const sessions = [...this.sessions.entries()].filter(
                        ([, s]) => s.user === interaction.user.id,
                    );

                    if (sessions.length === 0) {
                        await interaction.reply({
                            ephemeral: true,
                            content: ":x: No sessions found",
                        });
                        return;
                    }

                    const embed = new EmbedBuilder().setTitle("Your sessions").setDescription(
                        sessions
                            .map((s, i) => {
                                const chan = this.bot?.client.channels.cache.get(s[0]);
                                const name = chan
                                    ? chan.isDMBased()
                                        ? "DM"
                                        : `${chan.name} (${chan.guild.name})`
                                    : "Unknown";
                                return `${i + 1}. ${
                                    s[1].public ? ":globe_with_meridians:" : ":lock:"
                                } ${name}`;
                            })
                            .join("\n"),
                    );

                    await interaction.reply({
                        ephemeral: true,
                        embeds: [embed],
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

        if (message.content.length === 0) {
            await next();
            return;
        }

        const session = this.sessions.get(chan.id);
        if (!session) {
            await next();
            return;
        }

        const user = await ctx.user<UserStore>();
        const passed =
            chan.isDMBased() ||
            session.public ||
            user?.["openai-token"] === session.session.agent.refresh_token;
        if (!passed) {
            await next();
            return;
        }

        session.queue.push(message);
        if (session.queue.length === 1) {
            await this.consume(session.session, session.queue);
        }
    }

    async consume(session: Session, queue: Message<boolean>[]): Promise<void> {
        if (queue.length === 0) {
            return;
        }

        const message = queue[0];
        if (!message) {
            return;
        }
        const chan = message.channel;

        let waiting = true;
        let wait_counter = 0;
        const wait_interval = 5_000;

        try {
            await chan.sendTyping();
        } catch {
            waiting = false;
        }

        const typing = setInterval(async () => {
            wait_counter++;
            if (wait_counter > 60_000 / wait_interval) {
                waiting = false;
            }

            if (waiting === false) {
                clearInterval(typing);
            } else {
                try {
                    await chan.sendTyping();
                } catch {
                    clearInterval(typing);
                }
            }
        }, wait_interval);

        const conv = session.talk(message.content);

        let reply: Message;
        let msg = "";
        let boundary = Date.now() + 2000;

        const update = async (partial?: string) => {
            if (!partial) {
                return;
            }

            msg = partial;

            if (msg.length === 0) {
                return;
            }

            if (waiting) {
                waiting = false;
            }

            if (Date.now() < boundary) {
                return;
            }
            boundary = Date.now() + 1000;

            if (msg.length > 2000) {
                msg = msg.slice(0, 2000);
            }

            if (reply) {
                await reply.edit(msg);
            } else {
                reply = chan.isDMBased() ? await chan.send(msg) : await message.reply(msg);
            }
        };

        conv.on("partial", update);
        conv.once("complete", (msg) => {
            conv.off("partial", update);
            boundary = 0;
            update(msg);
        });
        conv.on("error", (err) => {
            console.error(err);
            conv.off("partial", update);
            boundary = 0;
            update(":x: ChatGPT was hit by an error: " + (err?.message || err).toString());
        });
        await conv.response;

        queue.shift();
        if (queue.length > 0) {
            await this.consume(session, queue);
        }
    }
}

interface UserStore {
    "openai-token"?: string;
    [key: string]: unknown;
}
