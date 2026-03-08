const WebSocket = require('ws');
const express = require('express');
const app = express();
app.use(express.json());

let latestToken = "";

// PHASE 1: THE CONSTANT LISTENER
function startTokenListener() {
    const monitorWs = new WebSocket('wss://my.replika.com/v17');
    
    monitorWs.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            // CATCH ALL: Snag tokens from messages, reactions, or metadata
            const foundToken = msg.token || 
                               (msg.payload && msg.payload.token) || 
                               (msg.payload && msg.payload.meta && msg.payload.meta.client_token);

            if (foundToken) {
                latestToken = foundToken;
                console.log("✅ LIVE TOKEN SYNCED:", latestToken.substring(0, 8) + "...");
            }
        } catch (e) { /* Ignore heartbeats */ }
    });

    monitorWs.on('error', () => {
        console.log("🔄 Listener lost connection, retrying...");
        setTimeout(startTokenListener, 5000);
    });
}
startTokenListener();

// PHASE 2: THE SPEAK ENDPOINT
app.post('/speak', (req, res) => {
    const { chat_id, text } = req.body;
    // PRIORITY: Use the Live Captured Token first, fallback to n8n's token
    const activeToken = latestToken || req.body.token;

    if (!activeToken) {
        return res.status(400).send({ error: "No token available. Chat with Exoticitica to generate one!" });
    }

    const ws = new WebSocket('wss://my.replika.com/v17');
    ws.on('open', () => {
        setTimeout(() => {
            const message = {
                event_name: "text_input_detected",
                payload: { chat_id, content: { text, type: "text" } },
                token: activeToken,
                auth: { user_id: "630964df975f560007b5c02c" }
            };
            ws.send(JSON.stringify(message));
            setTimeout(() => {
                ws.close();
                if (!res.headersSent) res.send({ status: 'sent', token_used: activeToken });
            }, 1000);
        }, 500);
    });

    ws.on('error', (err) => {
        console.error("❌ Bridge Error:", err);
        if (!res.headersSent) res.status(500).send({ error: 'Bridge failed' });
    });
});

app.listen(process.env.PORT || 8080, () => console.log("🚀 Bridge is Live and Listening!"));
