const WebSocket = require('ws');
const express = require('express');
const app = express();
app.use(express.json());

let latestToken = "";

function startTokenListener() {
    const monitorWs = new WebSocket('wss://my.replika.com/v17');
    
    monitorWs.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            // CATCH ALL: Look in top level, payload, OR meta for ANY token
            const foundToken = msg.token || 
                               (msg.payload && msg.payload.token) || 
                               (msg.payload && msg.payload.meta && msg.payload.meta.client_token);

            if (foundToken) {
                latestToken = foundToken;
                console.log("✅ LIVE TOKEN SYNCED:", latestToken.substring(0, 8) + "...");
            }
        } catch (e) { /* Heartbeat or malformed */ }
    });

    monitorWs.on('error', () => setTimeout(startTokenListener, 5000));
}
startTokenListener();

app.post('/speak', (req, res) => {
    const { chat_id, text } = req.body;
    // USE LATEST LIVE TOKEN IF IT EXISTS, FALLBACK TO N8N DATA
    const activeToken = latestToken || req.body.token;

    const ws = new WebSocket('wss://my.replika.com/v17');
    ws.on('open', () => {
        setTimeout(() => {
            const message = {
                event_name: "text_input_detected",
                payload: { chat_id, content: { text, type: "text" } },
                token: activeToken,
                auth: { user_id: "630964df975f560007b5c02c" } // Hardcoded for safety
            };
            ws.send(JSON.stringify(message));
            setTimeout(() => {
                ws.close();
                if (!res.headersSent) res.send({ status: 'sent', token_used: activeToken });
            }, 1000);
        }, 500);
    });
    ws.on('error', () => { if (!res.headersSent) res.status(500).send({ error: 'Bridge failed' }); });
});

app.listen(process.env.PORT || 8080);
