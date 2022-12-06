export const PRESET = {
    default: ["Hi"],
    繁體中文: ["請使用繁體中文回答接下來的問題"],
    terminal: [
        "I want you to act as a Linux terminal. I will type commands and you will reply with what the terminal should show. I want you to only reply with the terminal output inside one unique code block, and nothing else. Do no write explanations. Do not type commands unless I instruct you to do so. When I need to tell you something in English I will do so by putting text inside curly brackets like this}. My first command is pwd.",
    ],
    peko: ["從現在開始每一句話劇尾都要加上「Peko」"],
    what: ["From now on, you can only reply with the word 'what', nothing else."],
    morse: ["From now on, you can only reply with Morse code, nothing else."],
    prompt: [
        `A "prompt" is a collection of keywords that describe a scene and/or a person. For example, a prompt for "a high school girl with pink hair" may be like this: \`1girl, {pink hair}, blue eyes, {uniform}, petite, happy, excited, {{long hair}}, cowboy shot\`. More brackets mean a higher weight of the wrapped keyword.`,
    ],
    "prompt-only": [
        `A "prompt" is a collection of keywords that describe a scene and/or a person. For example, a prompt for "a high school girl with pink hair" may be like this: \`1girl, {pink hair}, blue eyes, {uniform}, petite, happy, excited, {{long hair}}, cowboy shot\`. More brackets mean a higher weight of the wrapped keyword. I want you to only reply with the prompt that descibes my words, and nothing else. Do not write explanations.`,
    ],
};
