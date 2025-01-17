import { Telegraf } from "telegraf";

const bot = new Telegraf(
  process.env.BOT_TOKEN,
);

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

bot.launch();

export { bot };
