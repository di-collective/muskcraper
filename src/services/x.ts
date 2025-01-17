import { Browser, GoToOptions } from "puppeteer";

const getProfile = async (
  browser: Browser,
  handle: string,
): Promise<{ username: string; photo: string; description?: string[] }> => {
  const page = await browser.newPage();
  const options = { waitUntil: "networkidle0" } as GoToOptions;

  page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  );

  await page.goto(`https://x.com/${handle}`, options);
  const { username, description } = await page.evaluate(
    (): { username: string; description: string[] } => {
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

      return { username, description };
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
  };
};

export { getProfile };
