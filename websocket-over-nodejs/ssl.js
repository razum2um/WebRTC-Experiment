// 2013, @muazkh » www.MuazKhan.com
// MIT License   » www.WebRTC-Experiment.com/licence
// Documentation » github.com/muaz-khan/WebRTC-Experiment/blob/master/websocket-over-nodejs
// Demo          » www.WebRTC-Experiment.com/websocket/

// new WebSocket('wss://localhost:8888/')

var WebSocketServer = require('websocket').server;
var fs = require('fs');

// SSL stuff
var https = require('https');
var SSL_Credentials = {
	    key: fs.readFileSync('fakekeys/privatekey.pem').toString(),
	    cert: fs.readFileSync('fakekeys/certificate.pem').toString()
	};

var ssl_server = https.createServer(SSL_Credentials, function() {});

ssl_server.listen(8888);

new WebSocketServer({
    httpServer: ssl_server,
    autoAcceptConnections: false
}).on('request', onRequest);

// shared stuff

var CHANNELS = { };

function onRequest(socket) {
	var origin = socket.origin + socket.resource;

    var websocket = socket.accept(null, origin);

    websocket.on('message', function(message) {
        if (message.type === 'utf8') {
            onMessage(JSON.parse(message.utf8Data), websocket);
        }
    });

    websocket.on('close', function() {
        truncateChannels(websocket);
    });
}

function onMessage(message, websocket) {
    if (message.checkPresence)
        checkPresence(message, websocket);
    else if (message.open)
        onOpen(message, websocket);
    else
        sendMessage(message, websocket);
}

function onOpen(message, websocket) {
    var channel = CHANNELS[message.channel];

    if (channel)
        CHANNELS[message.channel][channel.length] = websocket;
    else
        CHANNELS[message.channel] = [websocket];
}

function sendMessage(message, websocket) {
    message.data = JSON.stringify(message.data);
    var channel = CHANNELS[message.channel];
    if (!channel) {
        console.error('no such channel exists');
        return;
    }

    for (var i = 0; i < channel.length; i++) {
        if (channel[i] && channel[i] != websocket) {
            try {
                channel[i].sendUTF(message.data);
            } catch(e) {
            }
        }
    }
}

function checkPresence(message, websocket) {
    websocket.sendUTF(JSON.stringify({
        isChannelPresent: !!CHANNELS[message.channel]
    }));
}

function swapArray(arr) {
    var swapped = [],
        length = arr.length;
    for (var i = 0; i < length; i++) {
        if (arr[i])
            swapped[swapped.length] = arr[i];
    }
    return swapped;
}

function truncateChannels(websocket) {
    for (var channel in CHANNELS) {
        var _channel = CHANNELS[channel];
        for (var i = 0; i < _channel.length; i++) {
            if (_channel[i] == websocket)
                delete _channel[i];
        }
        CHANNELS[channel] = swapArray(_channel);
        if (CHANNELS && CHANNELS[channel] && !CHANNELS[channel].length)
            delete CHANNELS[channel];
    }
}
