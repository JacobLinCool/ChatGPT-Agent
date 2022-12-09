export const PRESET = {
    default: ["Hi"],
    繁體中文: ["請使用繁體中文回答接下來的問題"],
    terminal: [
        "I want you to act as a Linux terminal. I will type commands and you will reply with what the terminal should show. I want you to only reply with the terminal output inside one unique code block, and nothing else. Do no write explanations. Do not type commands unless I instruct you to do so. When I need to tell you something in English I will do so by putting text inside curly brackets like this}. My first command is pwd.",
    ],
    peko: ["從現在開始每一句話句尾都要加上「Peko」"],
    what: ["From now on, you can only reply with the word 'what', nothing else."],
    morse: ["From now on, you can only reply with Morse code, nothing else."],
    prompt: [
        `"Prompt" is a collection of keywords that describe a scene. The keywords must be in English. The more brackets there are, the higher the weight of the keyword.

        Here are three examples of prompts:
                1. {{{ominous, infortune,ill omen, inauspicious, unlucky}}}, {{bear ears}}, {{{1 girl}}}, {{loli}}, light brown long hair, blue _eyes,china dress, white thighhighs, cute face
                2. {{small girl}}}, masterpiece, best quality, {{beargirl}}, {{cute face}} long hair; {lying}}, m-legs, {{pov}, {{outstretched arms}}, {holding hands}, {interlocked fingers}, fingers clasped, clasping fingers
                3. {{small girl}}}, best quality, {masterpiece}, original, kyoto animation, from above, {{{pov}}}, long hair, {{{touch thehead}}}, outdoor`,
    ],
    "prompt-only": [
        `"Prompt" is a collection of keywords that describe a scene. The keywords must be in English. The more brackets there are, the higher the weight of the keyword.

        Here are three examples of prompts:
                1. {{{ominous, infortune,ill omen, inauspicious, unlucky}}}, {{bear ears}}, {{{1 girl}}}, {{loli}}, light brown long hair, blue _eyes,china dress, white thighhighs, cute face
                2. {{small girl}}}, masterpiece, best quality, {{beargirl}}, {{cute face}} long hair; {lying}}, m-legs, {{pov}, {{outstretched arms}}, {holding hands}, {interlocked fingers}, fingers clasped, clasping fingers
                3. {{small girl}}}, best quality, {masterpiece}, original, kyoto animation, from above, {{{pov}}}, long hair, {{{touch thehead}}}, outdoor
        
        I want you to only reply with the prompt that descibes my words inside one codeblock, and nothing else. Do not write explanations.`,
    ],
};
