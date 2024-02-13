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

    // const tempJobs = await page.$$eval(
    //   ".level-0 .opening",
    //   (elements, companyName) =>
    //     elements.map((element) => {
    //       const joburl = element.querySelector("a").href;
    //       const position = element.querySelector("a").innerText;

    //       return {
    //         companyName: companyName,
    //         url: joburl,
    //         position: position,
    //       };
    //     }),
    //   companyName
    // );

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

    //   console.log("Position: " + job.position + job.url + job.companyName);
    // });
    // console.log("Jobs:", JSON.stringify(tempJobs, null, 2));
    console.log(tempJobs);

    await browser.close();
  } catch (e) {
    console.error(e);
  }
}

main();
