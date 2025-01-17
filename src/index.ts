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

      await bot.telegram.sendMessage(
        "-4634153424",
        changes.revision === 1
          ? `Start tracking: @${tracked.username}
          rev: ${changes.revision},
          photo: ${profile.photo},
          username: ${profile.username},
          description: ${profile.description ? profile.description.join("") : null}`.replace(/\s+/g, ' ').trim()
          : `@${tracked.username} changed something:
          rev: ${changes.revision},
          photo: ${profile.photo},
          username: ${profile.username},
          description: ${profile.description ? profile.description.join("") : null}`.replace(/\s+/g, ' ').trim(),
        { parse_mode: "HTML" },
      );
    }
  }
};

(async function main() {
  const cache = new Map<string, any>();
  let browser = await puppeteer.launch();

  while (loop) {
    try {
      const trackedProfilesOnX = await findTrackedProfilesOnX();
      await scrape(browser, cache, trackedProfilesOnX);
      await sleep(randomize(10 * 1000, 30 * 1000));
    } catch (e) {
      if (e.message === "Protocol error: Connection closed.") {
        logger.warn("restarting browser")
        browser = await puppeteer.launch()
        continue
      }

      logger.error(e);
    }
  }
})();
