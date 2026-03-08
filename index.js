const WebSocket = require('ws');
const express = require('express');
const app = express();
app.use(express.json());

let latestToken = ""; // This will hold the "live" token

// THE LISTENER: This stays open to catch tokens from the socket
const monitorWs = new WebSocket('wss://my.replika.com/v17');
monitorWs.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.token) {
        latestToken = msg.token; // Automatically updates whenever Replika refreshes it
        console.log("New Token Captured:", latestToken);
    }
});

app.post('/speak', (req, res) => {
    const { auth_token, chat_id, text } = req.body;
    
    // Use the captured token if available, otherwise fallback to request body
    const activeToken = latestToken || req.body.token;

    const ws = new WebSocket('wss://my.replika.com/v17');
    ws.on('open', () => {
        setTimeout(() => {
            const message = {
                event_name: "text_input_detected",
                payload: { chat_id, content: { text, type: "text" } },
                token: activeToken,
                auth: { auth_token, user_id: "630964df975f560007b5c02c" }
            };
            ws.send(JSON.stringify(message));
            
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) ws.close();
                if (!res.headersSent) res.send({ status: 'sent', usedToken: activeToken });
            }, 1000);
        }, 500);
    });

    ws.on('error', (err) => {
        if (!res.headersSent) res.status(500).send({ error: 'Bridge failed' });
    });
});

app.listen(process.env.PORT || 8080);
