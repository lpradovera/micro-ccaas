var client;
var currentCall = null;

document.getElementById('connectButton').addEventListener('click', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  if (!username) {
    alert('Please enter your name');
    return;
  }

  // Disable the connect button while connecting
  const connectButton = document.getElementById('connectButton');
  connectButton.disabled = true;
  connectButton.textContent = 'Connecting...';

  try {
    const response = await fetch('/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username })
    });
    const data = await response.json();
    console.log(data);
    connect(data.project, data.token);
  } catch (error) {
    console.error('Connection failed:', error);
    alert('Failed to connect. Please try again.');
  } finally {
    // Re-enable the connect button
    connectButton.disabled = false;
    connectButton.textContent = 'Connect';
  }
});

function connect(project, token) {
  client = new Relay({
    project: project,
    token: token
  });

  client.__logger.setLevel(client.__logger.levels.INFO)

  client.remoteElement = 'remoteVideo';
  client.localElement = 'localVideo';

  client.enableMicrophone();
  client.disableWebcam();

  client.on('signalwire.ready', function() {
    console.log('Registered to SignalWire');
    document.getElementById('connect-container').classList.add('hidden');
    document.getElementById('connected-container').classList.remove('hidden');
  });

  // Update UI on socket close
  client.on('signalwire.socket.close', function() {
    console.log('Socket closed');
    document.getElementById('call-container').classList.add('hidden');
    document.getElementById('connected-container').classList.remove('hidden');
  });

  // Handle error...
  client.on('signalwire.error', function(error){
    console.error("SignalWire error:", error);
  });

  client.on('signalwire.notification', handleNotification);

  console.log('Connecting...');
  client.connect();
}

function handleNotification(notification) {
  switch (notification.type) {
    case 'callUpdate':
      handleCallUpdate(notification.call);
      break;
    case 'ringing': // Someone is calling you
      console.log('Inbound ringing...');
      currentCall.answer();
      break;
    case 'userMediaError':
      // Permission denied or invalid audio/video params on `getUserMedia`
      console.error("SignalWire userMediaError:", notification);
      break;
  }
}

function handleCallUpdate(call) {
  currentCall = call;

  switch (call.state) {
    case 'new': // Setup the UI
      break;
    case 'trying': // You are trying to call someone and he's ringing now
      console.log('Ringing...');
      break;
    case 'ringing': // Someone is calling you
      console.log('Inbound ringing...');
      console.log('using ICE servers', client.iceServers)
      currentCall.answer();
      break;
    case 'active': // Call has become active
      console.log('Call is active');
      break;
    case 'hangup': // Call is over
      console.log('Call is over');
      break;
    case 'destroy': // Call has been destroyed
      currentCall = null;
      break;
  }
}

document.getElementById('callButton').addEventListener('click', async (e) => {
  e.preventDefault();
  const destination = document.getElementById('destination').value;
  await makeCall(destination);
});

document.getElementById('hangupButton').addEventListener('click', async (e) => {
  e.preventDefault();
  await hangup();
});

async function makeCall(destination) {
  const options = { destinationNumber: destination }
  console.log(options)
  currentCall = await client.newCall(options).catch(console.error);
  document.getElementById('call-container').classList.remove('hidden');
  document.getElementById('connected-container').classList.add('hidden');
}

async function hangup() {
  if (currentCall) {
    await currentCall.hangup()
  }
  currentCall = null;
  document.getElementById('call-container').classList.add('hidden');
  document.getElementById('connected-container').classList.remove('hidden');
}

const sse = new EventSource("/sse");

sse.addEventListener("message", ({data}) => {
  const notificationContainer = document.getElementById('notification-container');
  const notification = document.createElement('div');
  notification.className = 'p-4 border-b border-gray-200';
  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(JSON.parse(data), null, 2);
  notification.appendChild(pre);
  notificationContainer.appendChild(notification);
});