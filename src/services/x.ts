import { Browser, GoToOptions } from "puppeteer";

interface XPost {
  link: string;
  time: Date;
  tweet?: string;
  photo?: string;
}

interface XProfile {
  username: string;
  photo: string;
  description?: string[];
  posts?: XPost[];
}

const getProfile = async (
  browser: Browser,
  handle: string,
): Promise<XProfile> => {
  const page = await browser.newPage();
  const options = { waitUntil: "networkidle0" } as GoToOptions;

  page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  );

  await page.goto(`https://x.com/${handle}`, options);
  const { username, description, posts } = await page.evaluate(
    (): Partial<XProfile> => {
      const usernameBoundary = document.querySelector(
        "[data-testid='UserName']",
      );
      const spans = Array.from(usernameBoundary.getElementsByTagName("span"));
      const [{ innerText: username }] = spans.filter(
        (span) => span.firstChild.nodeName === "#text",
      );

      const descriptionBoundary = document.querySelector(
        "[data-testid='UserDescription']",
      );
      const description = !descriptionBoundary
        ? null
        : Array.from(descriptionBoundary.children).map((el) => {
            if (el.nodeName === "SPAN" || el.nodeName === "DIV") {
              return (el as HTMLElement).innerText;
            } else if (el.nodeName === "IMG") {
              return (el as HTMLImageElement).src;
            }
          });

      const postListBoundary = document.querySelectorAll(
        "[data-testid='tweet']",
      );
      const posts = Array.from(postListBoundary)?.map((postBoundary) => {
        const tweet = postBoundary.querySelector(
          "[data-testid='tweetText']",
        ) as HTMLElement;
        const time = postBoundary.querySelector(
          "[data-testid='User-Name'] div a time",
        ) as HTMLTimeElement;
        const link = time.parentElement as HTMLAnchorElement;
        return {
          link: link?.href,
          tweet: tweet?.textContent,
          time: new Date(time.attributes["datetime"].value),
        };
      });

      return { username, description, posts };
    },
  );

  await page.goto(`https://x.com/${handle}/photo`, options);
  const photo = await page.evaluate((): string => {
    const [firstImg] = Array.from(document.getElementsByTagName("img"));

    return firstImg.src;
  });

  page.close();
  return {
    username,
    photo,
    description,
    posts,
  };
};

export { getProfile };
