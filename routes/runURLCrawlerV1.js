const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Expanded list of keywords for expired job postings
const expiredJobTexts = [
  'job posting has expired', 'no longer accepting applications', 'this job is closed',
  'this listing has expired', 'no longer available', 'applications are no longer accepted',
  'this job has expired', 'this position has been filled', 'position closed',
  'the job below is no longer available', 'the job posting is closed', 'job ad expired',
  'no longer hiring', 'not accepting new applications', 'posting expired',
  'this role is no longer available', 'job ad has expired', 'application period ended', 'no longer','This job has expired on Indeed',
  'position has been filled',
];

// Expanded keywords for active job application buttons
const possibleButtonLabels = [
  'apply', 'apply now', 'submit', 'get started', 'apply for job',
  'start application', 'apply here', 'job application', 'apply online', 'easy apply',
  'send application', 'submit resume', 'apply to this job', 'begin application'
];

function deleteTempDirectories() {
  const tempFolder = os.tmpdir();
  const tempFiles = fs.readdirSync(tempFolder).filter(file => file.startsWith('scoped_dir'));

  tempFiles.forEach(file => {
      const fullPath = path.join(tempFolder, file);
      try {
          if (fs.lstatSync(fullPath).isDirectory()) {
              fs.rmSync(fullPath, { recursive: true, force: true });
          }
      } catch (error) {
          console.error(`Error deleting temp folder ${fullPath}: ${error.message}`);
      }
  });
}

// Helper function to wait and retry checking if dynamic content is slow to load
async function retryFind(driver, conditionFn, retries = 5, delayMs = 3000) {
  let result;
  for (let i = 0; i < retries; i++) {
    result = await conditionFn();
    if (result) break;
    await driver.sleep(delayMs);
  }
  return result;
}

// Function to perform fuzzy matching for better keyword detection
function isTextMatch(text, keywords) {
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

async function checkJobStatus(id, url) {
  let driver;
  try {
    const options = new chrome.Options();
    options.addArguments('--headless'); // Run in headless mode for faster execution
    options.addArguments('--disable-gpu');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage')
    options.addArguments('--dns-prefetch-disable'); // Disable DNS prefetching
    options.addArguments('--disable-ipv6'); // Disable IPv6

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    await driver.get(url);

    await driver.wait(until.elementLocated(By.tagName('body')), 9500);

    // Use executeScript to extract inner HTML of a dynamically loaded element
    const bodyText = await driver.executeScript(
        'return document.querySelector("body").innerHTML;'
      );

    if (!bodyText) {
      console.log(`Could not retrieve content at ${url}`);
      return { id, status: 'error', error: 'Page content not found' };
    }

    let isExpired = isTextMatch(bodyText, expiredJobTexts);
    if (isExpired) {
      console.log(`🚫 Job expired at ${url}`);
      return { id, status: 'expired' };
    }

    // If not expired, check for any apply buttons
    const isApplyButtonPresent = await retryFind(driver, async () => {
      for (const label of possibleButtonLabels) {
        const applyButton = await driver.findElement(By.xpath(`//*[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${label.toLowerCase()}')]`))
          .catch(() => null);
        if (applyButton) return true;
      }
      return false;
    });

    if (isApplyButtonPresent) {
      console.log(`✔️ Job is open at ${url}`);
      return { id, status: 'open' };
    }

    // Default to expired if no apply button is found and expired text wasn't found
    console.log(`Job status unknown at ${url}`);
    return { id, status: 'expired' };

  } catch (error) {
    console.error(`Error checking ${url}: ${error.message}`);
    if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
      console.log(`🚫 Job expired due to DNS resolution failure at ${url}`);
      return { id, status: 'expired' };
    }
    return { id, status: 'error', error: error.message };
  } finally {
    if (driver) {
      await driver.quit();
    }
    deleteTempDirectories()
  }
}

// Function to handle checking a list of jobs efficiently
async function runUrlCrawlerV1(jobLinks) {
  const results = [];
  for (const job of jobLinks) {
    const result = await checkJobStatus(job.id, job.link);
    results.push(result);
  }
  return results;
}

module.exports = { runUrlCrawlerV1 };
