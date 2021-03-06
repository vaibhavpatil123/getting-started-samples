/**
 * To Test this script - start speaking when you run the script.
 */
const WebSocketClient = require('websocket').client;
const auth = require('../auth');
const mic = require('mic');
const uuid = require('uuid').v4;
const micInstance = mic({
    rate: '16000',
    channels: '1',
    debug: false,
    exitOnSilence: 6,
});
const micInputStream = micInstance.getAudioStream();
let connection = undefined;
const ws = new WebSocketClient();
ws.on('connectFailed', e => {
    console.error('Connection Failed.', e);
});
ws.on('connect', conn => {
    connection = conn;
    connection.on('close', () => {
        console.log('WebSocket closed.');
    });
    connection.on('error', err => {
        console.log('WebSocket error.', err);
    });
    connection.on('message', _data => {
        const data = JSON.parse(_data.utf8Data)
        if (data.type === 'message') {
            // console.log(data2)
            const message = data.message;
            if (message.type === 'recognition_result') {
                console.log(message.punctuated.transcript, '\n');
            }

        } else if (data.type === 'tracker_response') {
            console.log(JSON.stringify(data, null, 2))
        }
    });
    console.log('Connection established.');
    connection.send(
        JSON.stringify({
            type: 'start_request',
            insightTypes: ['action_item'],
            // These are the trackers that will be detected in real-time
            // Exact match or similar content is detected
            trackers: [
                {
                    name: 'Budget',
                    vocabulary: [
                        'a budget conversation',
                        'budget', 'budgeted', 'budgeting decision', 'budgeting decisions',
                        'money',
                        'budgets', 'funding', 'funds', 'I have the budget', 'my budget', 'our budget', 'your budget',
                        "we don't have budget for this", "don't think I have budget", "I think we have budget",
                        "not sure if I have budget"
                    ]
                },
                {
                    name: 'Approval',
                    vocabulary: ['sounds great', 'yes', 'okay, sounds good', "agree", "yeah"],
                },
                {
                    name: 'Denial',
                    vocabulary: ['No', 'Not necessary', 'Not a good idea', "don't agree"],
                }

            ],
            config: {
                confidenceThreshold: 0.5,
                timezoneOffset: 420,
                languageCode: 'en-US',
                speechRecognition: {
                    encoding: 'LINEAR16',
                    sampleRateHertz: 16000,
                },
            },
            speaker: {
                userId: 'james@symbl.ai',
                name: 'James',
            },
        })
    );
    micInputStream.on('data', function (data) {
        connection.send(data);
    });
    setTimeout(() => {
        micInstance.stop();
        connection.sendUTF(
            JSON.stringify({
                type: 'stop_recognition',
            })
        );
    }, 1 * 60 * 1000);
    micInstance.start();
});
auth({
    appId: '__yourAppId__',
    appSecret: '__yourAppSecret__'
}).then(response => {
    const {accessToken} = response;
    ws.connect(
        'wss://api.symbl.ai/v1/realtime/insights/' + uuid(),
        null,
        null,
        {
            'x-api-key': accessToken
        }
    );
})
