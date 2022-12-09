export const CHATGPT_BACKEND = process.env.CHATGPT_BACKEND || "https://chat.openai.com/backend-api";
export const CHATGPT_TIMEOUT = Number(process.env.CHATGPT_TIMEOUT) || 60_000;
export const CHATGPT_RETRY = Number(process.env.CHATGPT_RETRY) || 1;
