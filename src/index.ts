import "dotenv/config";
import { and, desc, eq } from "drizzle-orm";
import fnv1a from "fnv1a";
import puppeteer, { Browser } from "puppeteer";
import { bot } from "./bot/telegram";
import { mydb } from "./db/mysql";
import { track } from "./db/schema/track";
import { trackChanges } from "./db/schema/trackChanges";
import { logger } from "./services/logger";
import { getProfile } from "./services/x";

let loop = true;
process.once("SIGINT", () => (loop = false));
process.once("SIGTERM", () => (loop = false));

const sleep = (ms: number): Promise<void> =>
  new Promise((resolver) => setTimeout(resolver, ms));

const randomize = (min: number, max: number): number =>
  Math.floor(Math.random() * max) + min;

const findTrackedProfilesOnX = async (): Promise<
  (typeof track.$inferSelect)[]
> => {
  return mydb.query.track.findMany({
    where: and(eq(track.platform, "x"), eq(track.status, "track")),
  });
};

const scrape = async (
  browser: Browser,
  cache: Map<string, any>,
  trackedProfilesOnX: (typeof track.$inferSelect)[],
) => {
  for (const tracked of trackedProfilesOnX) {
    const profile = await getProfile(browser, tracked.username);
    const newHash = Number(fnv1a(JSON.stringify(profile)));

    let changes:
      | typeof trackChanges.$inferSelect
      | typeof trackChanges.$inferInsert;
    if (cache.has(tracked.username)) {
      changes = cache.get(tracked.username);
    } else {
      changes = await mydb.query.trackChanges.findFirst({
        where: eq(trackChanges.trackId, tracked.id),
        orderBy: [desc(trackChanges.revision)],
      });
    }

    const needNotify = !changes || changes.hash !== newHash;
    if (!needNotify) {
      logger.info(`no changes detected for @${tracked.username}`);
      continue;
    } else {
      changes = {
        trackId: tracked.id,
        revision: changes ? changes.revision + 1 : 1,
        hash: newHash,
        value: profile,
      };

      await mydb.insert(trackChanges).values(changes);
      cache.set(tracked.username, changes);

      const latestPost = profile.posts
        ? profile.posts.reduce((latest, current) => {
            if (!latest) return current;

            return current.time > latest.time ? current : latest;
          })
        : { link: "-", tweet: "-" };

      await bot.telegram.sendMessage(
        process.env.BOT_CHAT_ID,
        changes.revision === 1
          ? `Start tracking: @${tracked.username},\n` +
              `rev: ${changes.revision},\n` +
              `photo: ${profile.photo},\n` +
              `username: ${profile.username},\n` +
              `description: ${profile.description ? profile.description.join(" ") : null},\n` +
              `-----\n` +
              `latestTweet: ${latestPost.link}\n` +
              `${latestPost.tweet}`
          : `@${tracked.username} changed something:\n` +
              `rev: ${changes.revision},\n` +
              `photo: ${profile.photo},\n` +
              `username: ${profile.username},\n` +
              `description: ${profile.description ? profile.description.join(" ") : null},\n` +
              `-----\n` +
              `latestTweet: ${latestPost.link}\n` +
              `${latestPost.tweet}`,
        { parse_mode: "HTML" },
      );
    }
  }
};

(async function main() {
  const cache = new Map<string, any>();
  let browser = await puppeteer.launch();
  let failure = 0;
  while (loop) {
    try {
      failure = 0;
      const trackedProfilesOnX = await findTrackedProfilesOnX();
      await scrape(browser, cache, trackedProfilesOnX);
      await sleep(randomize(10 * 1000, 30 * 1000));
    } catch (e) {
      failure++;

      if (failure >= 10) {
        logger.error(`Failed to scrape: ${e.message}`);
        process.exit(1);
      }

      logger.error(e);
      await sleep(randomize(15 * 1000, 30 * 1000));
    }
  }
})();
