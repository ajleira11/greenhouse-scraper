const puppeteer = require("puppeteer");
const { Storage } = require("@google-cloud/storage");

async function initBrowser() {
  console.log("Initializing browser");
  return await puppeteer.launch();
}

async function getAllJobs(browser, url) {
  try {
    const page = await browser.newPage();

    console.log("Launching Browser...");

    await page.goto(url); //visit the webpage coming from the input
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
    return finalJob;
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

async function createStorageBucketIfMissing(storage, bucketName) {
  console.log(
    `Checking for Cloud Storage bucket '${bucketName}' and creating if not found`
  );
  const bucket = storage.bucket(bucketName);
  const [exists] = await bucket.exists();
  if (exists) {
    // Bucket exists, nothing to do here
    return bucket;
  }

  // Create bucket
  const [createdBucket] = await storage.createBucket(bucketName);
  console.log(`Created Cloud Storage bucket '${createdBucket.name}'`);
  return createdBucket;
}

async function uploadImage(bucket, taskIndex, allJobs) {
  // Create filename using the current time and task index
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  const filename = `${date.toISOString()}-${
    jobsData[0].companyName
  }-task${taskIndex}`;

  console.log(`Uploading screenshot as '${filename}'`);
  await bucket.file(filename).save(allJobs);

  const finalData = JSON.stringify(jsonData);
  console.log(`Uploading data as '${filename}.json'`);
  await bucket.file(`${filename}.json`).save(finalData);
}

async function main(urls) {
  console.log(`Passed in urls: ${urls}`);

  const taskIndex = process.env.CLOUD_RUN_TASK_INDEX || 0;
  const url = urls[taskIndex];
  if (!url) {
    throw new Error(
      `No url found for task ${taskIndex}. Ensure at least ${
        parseInt(taskIndex, 10) + 1
      } url(s) have been specified as command args.`
    );
  }
  const bucketName = process.env.BUCKET_NAME;
  if (!bucketName) {
    throw new Error(
      "No bucket name specified. Set the BUCKET_NAME env var to specify which Cloud Storage bucket the jobs data will be uploaded to."
    );
  }

  const browser = await initBrowser();
  const allJobs = await getAllJobs(browser, url).catch(async (err) => {
    // Make sure to close the browser if we hit an error.
    await browser.close();
    throw err;
  });
  await browser.close();

  console.log("Initializing Cloud Storage client");
  const storage = new Storage();
  const bucket = await createStorageBucketIfMissing(storage, bucketName);
  await uploadImage(bucket, taskIndex, allJobs);

  console.log("Upload complete!");
}

main(process.argv.slice(2)).catch((err) => {
  console.error(JSON.stringify({ severity: "ERROR", message: err.message }));
  process.exit(1);
});
