# ChatGPT Agent

This is a library, a CLI, and a Discord bot for the unofficial [ChatGPT](https://chat.openai.com/chat) API with progressive responses and more.

You can find READMEs for the library, CLI, and Discord bot in their respective folders in `packages/`.

The library documentation is available at [https://jacoblincool.github.io/ChatGPT-Agent/](https://jacoblincool.github.io/ChatGPT-Agent/).

And you can invite the Discord bot to your server with [this link](https://discord.com/oauth2/authorize?client_id=1049030945832972389&permissions=274877975552&scope=bot).

The CLI is available on [npm](https://www.npmjs.com/package/chatgpt-cli).

## Library

```sh
pnpm i chatgpt-agent
```

```ts
// refresh_token is optional
const agent = new Agent(token, refresh_token);

// multiple sessions can be created
const session = agent.session();

const first_conv = session.talk("Hello");
first_conv.on("partial", partial);
first_conv.once("complete", (complete) => {
  console.log("complete (event)", complete);
});
console.log("completed (promise)", await first_conv.response);
first_conv.off("partial", partial);

const second_conv = session.talk("Tell me a joke");
second_conv.on("partial", partial);
second_conv.once("complete", (complete) => {
  console.log("complete (event)", complete);
});
console.log("completed (promise)", await second_conv.response);
second_conv.off("partial", partial);

console.log("history", session.history);
```

`Agent` is the main class for the library. It represents a single user, and handles the token (and refresh token), and can create multiple sessions.

`Session` is a class that represents a single context just like the new ChatGPT tab you opened in the browser. It can be created with `Agent.session()`. It has a `history` property that is an array of messages, and a `talk` method that takes a message and returns a `Conversation` object.

`Conversation` is a class that represents a single conversation. It has a `response` property that is a promise that resolves to the full response, and an `on` method that takes an event name and a callback. You can listen to `partial` events, which are fired when the response is updated, and `complete` events, which are fired when the response is complete. Also, `error` events are fired when an error occurs.
