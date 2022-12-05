# ChatGPT Bot

## Setup

1. Create a Discord bot from the [Discord Developer Portal](https://discord.com/developers/applications).
2. Setup the `.env` file with the bot token and the application ID.
3. Register the slash commands. (`pnpm register`)
4. Start the bot. (`pnpm start`)

> Step 4 can be replaced with `docker compose up -d` if you want to use Docker.

## Usage

Every user needs to auth (`/auth <token>`) the bot with their own JWT before using it.

Then, they can start a conversation with the bot by using `/start [preset]`.

After the bot sets up the conversation with the preset, the user can simply type messages to continue the conversation.

After the conversation is done, the user can use `/stop` to end the conversation.
