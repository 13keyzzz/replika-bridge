const WebSocket = require('ws');
const express = require('express');
const app = express();
app.use(express.json());

let latestToken = ""; 

// Function to start the listener with error handling
function startTokenListener() {
    const monitorWs = new WebSocket('wss://my.replika.com/v17');
    
    monitorWs.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            if (msg.token) {
                latestToken = msg.token;
                console.log("New Token Captured:", latestToken);
            }
        } catch (e) { console.log("Parsing error"); }
    });

    monitorWs.on('error', (err) => {
        console.log("Listener error, retrying in 5s...");
        setTimeout(startTokenListener, 5000); // Prevents crash if socket fails
    });
}

startTokenListener(); // Start it up!

app.post('/speak', (req, res) => {
    const { auth_token, chat_id, text } = req.body;
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

    ws.on('error', () => {
        if (!res.headersSent) res.status(500).send({ error: 'Bridge failed' });
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Bridge running on port ${PORT}`));
