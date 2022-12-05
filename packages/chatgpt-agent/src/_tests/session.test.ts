import { config } from "dotenv";
import { Agent } from "..";

jest.setTimeout(30_000);

config();

const token = process.env.TOKEN;
if (!token) {
    throw new Error("No token provided");
}

const partial = (partial: string) => {
    console.log("partial", partial);
};

test("Test", async () => {
    const agent = new Agent(token);
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
});
