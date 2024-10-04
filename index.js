const dotenv = require('dotenv');
let doterr = dotenv.config();

const mqtt = require('mqtt')
const fetch = require ('node-fetch-commonjs');

const clientId = `mqtt_${Math.random().toString(16).slice(3)}`

const wuStation = process.env.WU_STATION || "";
const wuKey = process.env.WU_API_KEY || "";

const host = process.env.MQTT_HOST;
const port = process.env.MQTT_PORT;

const connectUrl = `mqtt://${host}:${port}`

const client = mqtt.connect(connectUrl, {
                clientId,
                clean: true,
                connectTimeout: 4000,
                reconnectPeriod: 1000,
            });

const topic = 'rtl_433/Acurite-5n1/3029'
const newTopic = 'rtl_433/weather'

let gpayload = {time: "", rain_in: -1};

client.on('connect', () => {
    console.log('Connected')

    client.subscribe([topic], () => {
        console.log(`Subscribe to topic '${topic}'`)
    })
});

function republish (topic, str) {
    client.publish (topic, str, { qos: 0, retain: false }, (error) => {
        if (error) {
            console.error(`publish error ${error}`);
            return true; //there was an error
        }
        else {
//            console.log (`Sent Message (${topic}): ${str}`);
            return false; //ok
        }
    });
}

client.on('message', (topic, payload) => {
    try {
        let p = JSON.parse (payload.toString());
        if (p.time != gpayload.time) {
//            console.log('\nReceived Message:', topic, payload.toString());
            let gp = JSON.stringify ({...gpayload, ...p});
        
            if (republish (newTopic + "/json", gp)) {
                console.error(`publish error ${error}`);
            }
            else {
//                console.log (`Sent Message: ${gp}`);
                gpayload = JSON.parse (gp);
            
                //now send all the parts
                for (const prop in gpayload) {
                    let s = gpayload[prop];
                    if (typeof s !== "string") {
                        s = s.toString();
                    }
                    republish (`${newTopic}/${prop}`, s);
                }
            }

        }
        else {
//            console.log ("skipping duplicate");
        }
    }
    catch (err) {
        console.log (`Error ${err}`);
    }
});


let rainin = -1; //pws key
let dailyrainin = -1; //pws key

let rain_this_minute = -1;
let rain_basis = -1;
let rain_last = -1;
let new_rain = 0;

let rain_per_minute = [];
let rain_day_time = 0;
let rain_min_time = 0;

function ComputeRainfall () {
    let ri = +gpayload.rain_in;
    let now = Date.now();

    if (ri>=0 && rain_basis<0) { //first time we've seen a real rain measurement
        rain_basis = ri;
        rain_last = ri;
        rain_this_minute = 0;
        console.log (`rain basis set to ${rain_basis}`);
    }

    if (rain_day_time<now) { //time to reset our 24 rain total
        dailyrainin = 0;
        rain_day_time = now + (24*60*60*1000);
    }

    new_rain = ri-rain_last;
    if (new_rain > 0) {
        //update the daily total
        rain_last = ri; //adjust the running rain zero point upwards
        dailyrainin += new_rain;
        rain_this_minute += new_rain;
    }

    //see if we have a minute of data to push into the hourly array
    if (rain_min_time < now) {
        //add the new value into the rolling hourly amount
        rain_per_minute.push (rain_this_minute);
        if (rain_per_minute.length > 60) { //trim the buffer to 60 samples
            rain_per_minute.shift();
        }
        //now compute the rolling hour total
        rainin = rain_per_minute.reduce ((a, b)=> a+b);

        rain_this_minute = 0;
        rain_min_time = now + 60000;
    }

    gpayload.rainin = rainin;
    gpayload.dailyrainin = dailyrainin;

}

function SendWXData () {
    let tempf = gpayload.temperature_F;
    let winddir = gpayload.wind_dir_deg;
    let windspeed = gpayload.wind_avg_km_h * 0.621371;
    let humidity = gpayload.humidity;
    let ri = gpayload.rainin;
    let dri = gpayload.dailyrainin;

    let s = `https://rtupdate.wunderground.com/weatherstation/updateweatherstation.php?ID=${wuStation}&PASSWORD=${wuKey}&action=updateraw&dateutc=now&tempf=${tempf}&winddir=${winddir}&windspdmph_avg2m=${windspeed}&windspeedmph=${windspeed}&humidity=${humidity}&rainin=${ri}&dailyrainin=${dri}`;
    console.log (`Uploading ${s}`);
    fetch (s).then ((response)=>{
        console.log (`fetch ${response.status}`);
    })
}

setInterval(() => {
    ComputeRainfall ();
    SendWXData ();
}, 60000);