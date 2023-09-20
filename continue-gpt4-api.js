module.exports = function (RED) {
    const https = require('https');
    const HttpProxyAgent = require('http-proxy-agent');
    const HttpsProxyAgent = require('https-proxy-agent');

    function ContinueGPT4APINode(config) {
        RED.nodes.createNode(this, config);
        const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
        const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
        let node = this;

        node.on('input', function (msg) {
            if (!msg.hasOwnProperty('chat_done') || !msg.chat_done) {
                return;  // `msg.chat_done`が存在しないか、`true`以外の場合は何もせずに処理を終了
            }
            let input_message;

            if (msg.chat_done === true) {
                if (msg.payload === "" || msg.payload === null || msg.payload === undefined) {
                    input_message = msg.all_contents;
                } else {
                    input_message = msg.payload;
                }
            }
            const api_key = process.env.OPENAI_API_KEY || node.context().global.get('gpt4_api_key');
            const model = config.model;
            msg.topic = config.topic;
            const temperature = config.temperature;
            const top_p = config.top_p;
            const max_tokens = config.max_tokens;
            const stream = config.stream;
            const presence_penalty = config.presence_penalty;
            const frequency_penalty = config.frequency_penalty;
            const logit_bias = config.logit_bias;
            const stop = config.stop;

            const proxyConfig = httpsProxy || httpProxy;
            const agent = proxyConfig ? new HttpsProxyAgent(proxyConfig) : null;

            const options = {
                hostname: 'api.openai.com',
                path: '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + api_key
                },
                agent: agent
            };

            const messages = msg.chat_history;
            messages.push({ "role": "user", "content": input_message });

            const requestData = {
                "model": model,
                "messages": messages,
                "temperature": parseFloat(temperature),
                "top_p": parseFloat(top_p),
                "n": 1,
                "stream": JSON.parse(stream),
                "presence_penalty": parseFloat(presence_penalty),
                "frequency_penalty": parseFloat(frequency_penalty),
            };

            if (parseInt(max_tokens) > 0) {
                requestData["max_tokens"] = parseInt(max_tokens);
            }

            if (logit_bias) {
                requestData["logit_bias"] = JSON.parse(logit_bias);
            }

            if (stop) {
                requestData["stop"] = JSON.parse(stop);
            }

            const req = https.request(options, (res) => {
                if (JSON.parse(stream)) {
                    let chunks = [];
                    let all_contents = "";
                
                    res.on('data', (chunk) => {
                        chunks.push(chunk);
                        let text = Buffer.concat(chunks).toString();
                        let split = text.split('\n');
                
                        while (split.length > 1) {
                            let jsonStr = split.shift();
                            if(jsonStr){
                                // Remove the "data: " prefix
                                jsonStr = jsonStr.replace("data: ", "");

                                try {
                                    if(jsonStr.trim() == "[DONE]"){
                                        let copy_messages = Array.from(messages);
                                        copy_messages.push({ "role": "assistant", "content": all_contents });
                                        let outMsg = Object.assign({}, msg, {
                                            payload: "",
                                            all_contents: all_contents,
                                            chat_history: copy_messages,
                                            chat_done: true
                                        });
                                        node.send(outMsg);
                                    } else {
                                        let parsedData = JSON.parse(jsonStr);
                                        
                                        if (parsedData.choices[0].delta.content) {                                        
                                            let content = parsedData.choices[0].delta.content;
                                            all_contents += content;
                                            let copy_messages = Array.from(messages);
                                            copy_messages.push({ "role": "assistant", "content": all_contents });
                                            if(content){
                                                let outMsg = Object.assign({}, msg, {
                                                    payload: content,
                                                    all_contents: all_contents,
                                                    chat_history: copy_messages,
                                                    chat_done: false
                                                });
                                                node.send(outMsg);
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.log('Error parsing: ' + jsonStr);
                                }
                            }
                        }
                        chunks = [Buffer.from(split[0])];
                    });
                } else {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        let parsedData = JSON.parse(data);

                        if (parsedData.choices) {
                            let content = parsedData.choices[0].message.content;
                            messages.push({ "role": "assistant", "content": content });
                            let outMsg = Object.assign({}, msg, {
                                payload: content,
                                all_contents: content,
                                chat_history: messages,
                                chat_done: true
                            });
                            node.send(outMsg);
                        }
                    });
                }
            });

            req.on('error', (error) => {
                node.error(error);
            });

            req.write(JSON.stringify(requestData));
            req.end();
        });
    }
    
    RED.nodes.registerType('continue-gpt4-api', ContinueGPT4APINode);
};
