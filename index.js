const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const PORT = 8080
const cors = require("cors");
const { urlcrawlerv1 } = require("./routes/urlcrawlerv1.routes");
const { urlcrawlerv2 } = require("./routes/urlcrawlerv2.routes");

app.use(cors())
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api", urlcrawlerv1)
app.use("/api", urlcrawlerv2)

app.get('*',(req,res)=>{
    res.status(200).json({
      message:'bad request'
    })
  })

app.listen(PORT, async () => {
  console.log(`server running on PORT ${PORT}.`);
});