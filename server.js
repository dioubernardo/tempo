const express = require('express')
const app = express()
const port = process.env.PORT || 3000

const cheerio = require("cheerio");
const axios = require("axios");

var data = {};

async function getInfo() {
  let info = {};

  const axiosResponse = await axios.request({
      method: "GET",
      url: "https://www.rgpilots.com.br/",
      headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
      }
  });

  const $ = cheerio.load(axiosResponse.data);

  const tempEl = $(".fa-thermometer-half:eq(0)");
  info.temp = parseFloat(tempEl.next().text().match(/([\d.]+)°C/)[1]);
  info.sens = parseFloat(tempEl.next().next().text().match(/([\d.]+)°C/)[1]);

  info.umid = parseInt($(".fa-tint:eq(0)").next().text().match(/([\d]+)%/)[1]);

  const ventc = $(".fa-wind:eq(0)").next().text().match(/([\d.]+) kt (\S+)/);
  info.vent = Math.round(ventc[1] * 1.852);
  info.dir = ventc[2];

  const dtc = $(".statistics-box > div:last").text().match(/([\d]{2})\/([\d]{2})\/([\d]{4}) ([\d]{2}):([\d]{2})/);
  info.data = new Date(dtc[3]+"-"+dtc[2]+"-"+dtc[1]+"T"+(parseInt(dtc[4])+3)+":"+dtc[5]+":00");

  return info;
}

function dir(vAnterior, vAtual, d) {
  if (vAnterior > vAtual)
      d--;
  else if (vAnterior < vAtual)
      d++;
  if (d > 2)
      return 2
  else if (d < -2)
      return -2
  return d
}

app.get('/', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  let agora = await getInfo();
  
  if (agora.data != data.data){
    if (data.tempD !== undefined){
      data.tempD = dir(data.temp, agora.temp, data.tempD);
      data.sensD = dir(data.sens, agora.sens, data.sensD);
      data.umidD = dir(data.umid, agora.umid, data.umidD);
      data.ventD = dir(data.vent, agora.vent, data.ventD);
    }else{
      data.tempD = 0;
      data.sensD = 0;
      data.umidD = 0;
      data.ventD = 0;
    }
  
    data.temp = agora.temp;
    data.sens = agora.sens;
    data.umid = agora.umid;
    data.vent = agora.vent;
    data.dir = agora.dir;
    data.data = agora.data;
  }
  
  res.send(data)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
