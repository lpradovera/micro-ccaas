require('dotenv').config();
let express = require('express');
let app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const axios = require('axios');

let {createSession, createChannel} = require("better-sse");
const channel = createChannel();

async function apiRequest(payload = {}, endpoint) {
  var url = `https://${process.env.SIGNALWIRE_SPACE}${endpoint}`
  resp = await axios.post(url, payload, {
    auth: {
      username: process.env.SIGNALWIRE_PROJECT,
      password: process.env.SIGNALWIRE_TOKEN
    }
  })
  return resp.data
}

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/token', async (req, res) => {
  const name = req.body.username;
  var token = await apiRequest({ expires_in: 120, resource: name }, '/api/relay/rest/jwt')
  
  // Return both the token and the zone information
  res.json({
    token: token.jwt_token,
    project: process.env.SIGNALWIRE_PROJECT,
  });
});

app.post('/conference', async (req, res) => {
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference statusCallback="https://${process.env.APP_DOMAIN}/status" statusCallbackEvent="join leave">
    Room 1234</Conference>
  </Dial>
</Response>`);
});

app.post('/status', async (req, res) => {
  console.log('status', req.body);
  channel.broadcast(req.body);
  res.json({ status: 'ok' });
});

app.get("/sse", async (req, res) => {
	const session = await createSession(req, res);
	channel.register(session);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`http/ws server listening on ${port}`);
});