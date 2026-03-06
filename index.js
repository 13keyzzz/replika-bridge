const WebSocket = require('ws');
const express = require('express');
const app = express();
app.use(express.json());

app.post('/speak', (req, res) => {
    const { auth_token, chat_id, text, token } = req.body; // Token is now dynamic!
    const ws = new WebSocket('wss://my.replika.com/v17');

    ws.on('open', () => {
        setTimeout(() => {
            const message = {
                event_name: "text_input_detected",
                payload: { chat_id, content: { text, type: "text" } },
                token: token, 
                auth: { auth_token, user_id: "630964df975f560007b5c02c" }
            };
            ws.send(JSON.stringify(message));
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) ws.close();
                if (!res.headersSent) res.send({ status: 'sent' });
            }, 1000);
        }, 500);
    });

    ws.on('error', (err) => {
        if (!res.headersSent) res.status(500).send({ error: 'Bridge failed' });
    });
});

app.listen(process.env.PORT || 8080);
