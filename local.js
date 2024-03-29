const puppeteer = require("puppeteer");

async function main() {
  try {
    const inputURL = "https://boards.greenhouse.io/neara";
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    console.log("Launching Browser...");

    await page.goto(inputURL); //visit the webpage coming from the input
    await page.waitForSelector(".level-0"); // Wait for the job listings to load to ensure data exists

    const companyName = await page.$eval(
      'meta[property="og:title"]',
      (element) => element.content
    );

    console.log("Company Name: " + companyName);

    const tempJobs = await page.$$eval(
      ".level-0 .opening",
      (elements, companyName) =>
        elements.map((element) => {
          const joburl = element.querySelector("a").href;
          const position = element.querySelector("a").innerText;
          const location = element.querySelector(".location").innerText;
          const areas = element
            .closest(".level-0")
            .querySelector("h3").innerText;

          return {
            companyName: companyName,
            createdAt: "",
            status: "",
            companyId: "",
            applyLink: joburl,
            title: position,
            workStyle: "",
            workType: "",
            seniority: "",
            location: location,
            timing: "",
            areas: areas,
            images: "",
            video: "",
            audio: "",
            description: "",
            questions: {
              problems: "",
              traits: "",
              whyNow: "",
            },
            hiringManagerIds: "",
          };
        }),
      companyName
    );

    console.log(`manage to get the company/work details`);

    const finalJob = await description(tempJobs, browser);
    console.log(finalJob);

    await browser.close();
  } catch (e) {
    console.error(e);
  }
}

async function description(jobs, browser) {
  try {
    console.log(`adding desc`);

    for (const job of jobs) {
      const page = await browser.newPage();
      await page.goto(job.applyLink);
      console.log(job.applyLink);
      await page.waitForSelector("#content");

      let description = "empty";

      //each page has some different dom design
      const descriptionSelectors = [
        "#content .description > p:nth-child(2)",
        "#content > p:nth-child(2)",
        "#content .p-rich_text_section",
        "#content .p-rich_text_section > p:nth-child(2)",
      ];

      //use page.$ instead of page.$eval because eval returning an error after it didn't catch the correct pattern of selector
      for (const selector of descriptionSelectors) {
        const element = await page.$(selector);
        if (element) {
          const innerText = await page.evaluate((el) => el.innerText, element);
          if (innerText.length < 1000) {
            description = innerText;
            break;
          }
        }
      }

      job.description = description;

      job.description = (await description) ? description : "empty";
      await page.close();
    }
    return jobs;
  } catch (e) {
    console.error(e);
  }
}

main();
