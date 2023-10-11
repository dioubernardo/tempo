const express = require('express')
const app = express()
const port = process.env.PORT || 3000
const router = express.Router()

const cheerio = require("cheerio");

var data = {};

async function getInfo() {
  let info = {};

  let response = await fetch("https://www.rgpilots.com.br/", {
    "headers": {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "pt-BR,pt;q=0.9",
      "sec-ch-ua": "\"Chromium\";v=\"116\", \"Not)A;Brand\";v=\"24\", \"Google Chrome\";v=\"116\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Windows\"",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1"
    },
    "referrerPolicy": "strict-origin-when-cross-origin",
    "body": null,
    "method": "GET"
  });

  let $ = cheerio.load(await response.text());

  const tempEl = $(".fa-thermometer-half:eq(0)");
  info.temp = parseFloat(tempEl.next().text().match(/([\d.]+)°C/)[1]);
  info.sens = parseFloat(tempEl.next().next().text().match(/([\d.]+)°C/)[1]);

  info.umid = parseInt($(".fa-tint:eq(0)").next().text().match(/([\d]+)%/)[1]);

  const ventc = $(".fa-wind:eq(0)").next().text().match(/([\d.]+) kt (\S+)/);
  info.vent = Math.round(ventc[1] * 1.852);
  info.dir = ventc[2];

  const dtc = $(".statistics-box > div:last").text().match(/([\d]{2})\/([\d]{2})\/([\d]{4}) ([\d]{2}):([\d]{2})/);
  info.data = new Date(dtc[3] + "-" + dtc[2] + "-" + dtc[1] + "T" + (parseInt(dtc[4]) + 3) + ":" + dtc[5] + ":00");

  response = await fetch("https://www.accuweather.com/pt/br/rio-grande/35734/weather-forecast/35734", {
    "headers": {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "pt-BR,pt;q=0.9",
      "sec-ch-ua": "\"Chromium\";v=\"116\", \"Not)A;Brand\";v=\"24\", \"Google Chrome\";v=\"116\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Windows\"",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1"
    },
    "referrerPolicy": "strict-origin-when-cross-origin",
    "body": null,
    "method": "GET"
  });

  $ = cheerio.load(await response.text());

  const icoRegExp = /\/images\/weathericons\/(\d+)\.svg/;
  const tempRegExp = /(\d+.)°/;

  /* Agora */
  info.previsaoAgora = $(".cur-con-weather-card .phrase").text();
  info.previsaoAgoraIco = $(".cur-con-weather-card .weather-icon").data("src").match(icoRegExp)[1];
  //https://developer.accuweather.com/weather-icons

  info.qualidadeAr = $(".air-quality-data-wrapper .category-text").text();
  info.qualidadeArCor = $(".air-quality-data-wrapper .category-color-bar").css("background");

  /* Hoje */
  let hoje = $(".card[data-qa=todayWeatherCard] .phrase");
  if (hoje.length){
    info.previsaoHoje = hoje.text();
    info.previsaoHojeIco = $(".card[data-qa=todayWeatherCard] .icon-weather").data("src").match(icoRegExp)[1];
    info.previsaoHojeTemp = $(".card[data-qa=todayWeatherCard] .temp").text().match(tempRegExp)[1];
    info.previsaoHojeTempAfter = $(".card[data-qa=todayWeatherCard] .after-temp").text();
  } 

  /* A noite */
  info.previsaoNoite = $(".card[data-qa=tonightWeatherCard] .phrase").text();
  info.previsaoNoiteIco = $(".card[data-qa=tonightWeatherCard] .icon-weather").data("src").match(icoRegExp)[1];
  info.previsaoNoiteTemp = $(".card[data-qa=tonightWeatherCard] .temp").text().match(tempRegExp)[1];
  info.previsaoNoiteTempAfter = $(".card[data-qa=tonightWeatherCard] .after-temp").text();

  /* Amanhã */
  info.previsaoAmanha = $(".card[data-qa=tomorrowWeatherCard] .phrase").text();
  info.previsaoAmanhaIco = $(".card[data-qa=tomorrowWeatherCard] .icon-weather").data("src").match(icoRegExp)[1];
  info.previsaoAmanhaMax = $(".card[data-qa=tomorrowWeatherCard] .temp").text().match(tempRegExp)[1];
  info.previsaoAmanhaMin = $(".card[data-qa=tomorrowWeatherCard] .after-temp").text().match(tempRegExp)[1];

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

router.get('/data.json', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  let agora = await getInfo();

  if (agora.data != data.data) {
    if (data.tempD !== undefined) {
      data.tempD = dir(data.temp, agora.temp, data.tempD);
      data.sensD = dir(data.sens, agora.sens, data.sensD);
      data.umidD = dir(data.umid, agora.umid, data.umidD);
      data.ventD = dir(data.vent, agora.vent, data.ventD);
    } else {
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

    data.previsaoAgora = agora.previsaoAgora;
    data.previsaoAgoraIco = agora.previsaoAgoraIco;
    data.qualidadeAr = agora.qualidadeAr;
    data.qualidadeArCor = agora.qualidadeArCor;
    data.previsaoHoje = agora.previsaoHoje;
    data.previsaoHojeIco = agora.previsaoHojeIco;
    data.previsaoHojeTemp = agora.previsaoHojeTemp;
    data.previsaoHojeTempAfter = agora.previsaoHojeTempAfter;
    data.previsaoNoite = agora.previsaoNoite;
    data.previsaoNoiteIco = agora.previsaoNoiteIco;
    data.previsaoNoiteTemp = agora.previsaoNoiteTemp;
    data.previsaoNoiteTempAfter = agora.previsaoNoiteTempAfter;
    data.previsaoAmanha = agora.previsaoAmanha;
    data.previsaoAmanhaIco = agora.previsaoAmanhaIco;
    data.previsaoAmanhaMax = agora.previsaoAmanhaMax;
    data.previsaoAmanhaMin = agora.previsaoAmanhaMin;
  }

  res.send(data)
})

const prefix = process.env.PREFIX || "/";

app.use(prefix, express.static('public'));
app.use(prefix, router);

app.listen(port, () => {
  console.log(`Tempo listening on port ${port}`)
})

