const puppeteer = require('puppeteer-extra');

async function runUrlCrawlerV2(jobs) {
  const browser = await puppeteer.launch({
    headless: true, // Headless mode to avoid opening browser windows
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-infobars', '--disable-dev-shm-usage']
  });

  const results = [];
  try {
    for (const job of jobs) {
      const { id, link } = job;

      if (!link || typeof link !== 'string') {
        results.push({ id, status: 'Invalid URL' });
        continue;
      }

      // Create a new page for each job to avoid interference
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(60000);

      try {
        await page.goto(link, { waitUntil: 'networkidle2' });

        // Define expired phrases and selectors to detect if the job is expired
        const expiredPhrases = [
          'no longer accepting applications', 'this job has expired', 'the position has been filled',
          'no longer available', 'application period is over', 'job is closed', 'job posting has expired',
          'no longer', 'this job is closed', 'applications are no longer accepted', 'position closed',
          'the job below is no longer available', 'the job posting is closed', 'job ad expired',
          'no longer hiring', 'posting expired', 'role is no longer available', 'This job has expired on Indeed'
        ];

        const jobStatusSelectors = [
          '.job-status-closed', '.status-unavailable', '.expired-job-message',
        ];

        // Check for text-based indicators first
        const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
        let status = 'open';

        // Look for any expired phrase
        if (expiredPhrases.some(phrase => pageText.includes(phrase))) {
          status = 'expired';
        } else {
          // If no text match, look for HTML selectors
          for (const selector of jobStatusSelectors) {
            const statusElement = await page.$(selector);
            if (statusElement) {
              status = 'expired';
              break;
            }
          }
        }

        results.push({ id, status });

      } catch (error) {
        console.log(`Error with job ID ${id}: ${error.message}`);
        if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
          results.push({ id, status: 'expired (DNS error)' });
        } else {
          results.push({ id, status: 'error' });
        }
      } finally {
        await page.close();
      }
    }
  } catch (globalError) {
    console.log('Global error during job check:', globalError.message);
  } finally {
    // Close the browser after all jobs are checked
    await browser.close();
  }

  return results;
}

module.exports = { runUrlCrawlerV2 };
