/** The base URL of the ChatGPT backend API. */
export const CHATGPT_BACKEND = process.env.CHATGPT_BACKEND || "https://chat.openai.com/backend-api";

/** The maximum request time in milliseconds. */
export const CHATGPT_TIMEOUT = Number(process.env.CHATGPT_TIMEOUT) || 60_000;

/** The maximum number of times to retry a request. */
export const CHATGPT_RETRY = Number(process.env.CHATGPT_RETRY) || 1;
