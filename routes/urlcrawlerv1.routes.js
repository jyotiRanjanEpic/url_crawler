const { Router } = require("express");
const { runUrlCrawlerV1 } = require("./runURLCrawlerV1");

const urlcrawlerv1 = Router();

urlcrawlerv1.post("/urlcrawlerv1", async (req, res) => {
  const { jobLinks } = req.body;

  if (!jobLinks || !Array.isArray(jobLinks)) {
    return res.status(400).json({ error: "Invalid jobLinks array" });
  }

  try {
    const results = await runUrlCrawlerV1(jobLinks);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error processing job links:", error);
    res.status(500).json({ error: "Failed to process job links" });
  }
});

module.exports = { urlcrawlerv1 };
