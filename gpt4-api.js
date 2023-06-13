const https = require('https');
const HttpProxyAgent = require('http-proxy-agent');
const HttpsProxyAgent = require('https-proxy-agent');
const { setServers } = require('dns');

module.exports = function (RED) {
    function GPT4APINode(config) {
        RED.nodes.createNode(this, config);
        const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
        const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
        let node = this;

        node.on('input', function (msg, send, done) { // "done" has been added here
            send = send || function() { node.send.apply(node,arguments) }
            const input_message = msg.payload;
            const system_message = msg.system_message || config.system_message;
            const api_key = node.context().global.get('gpt4_api_key');
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

            const requestData = {
                "model": model,
                "messages": [
                    { "role": "system", "content": system_message },
                    { "role": "user", "content": input_message }
                ],
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
                                        msg.payload = "";
                                        msg.all_contents = all_contents;
                                        msg.chat_history = [
                                            { "role": "system", "content": system_message },
                                            { "role": "user", "content": input_message },
                                            { "role": "assistant", "content": all_contents }
                                        ];
                                        msg.chat_done = true;
                                        send(msg); 
                                        done();
                                    } else {
                                        let parsedData = JSON.parse(jsonStr);
                                        
                                        if (parsedData.choices[0].delta.content) {                                        
                                            let content = parsedData.choices[0].delta.content;
                                            all_contents += content;
                                            if(content){
                                                msg.payload = content;
                                                msg.all_contents = all_contents;
                                                msg.chat_history = [
                                                    { "role": "system", "content": system_message },
                                                    { "role": "user", "content": input_message },
                                                    { "role": "assistant", "content": all_contents }
                                                ];
                                                msg.chat_done = false;

                                                send(msg); 
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
                            msg.payload = content;
                            msg.all_contents = content;
                            msg.chat_history = [
                                { "role": "system", "content": system_message },
                                { "role": "user", "content": input_message },
                                { "role": "assistant", "content": content }
                            ];
                            msg.chat_done = true;

                            send(msg);
                            done();
                        }
                    });
                }
            });

            req.on('error', (error) => {
                node.error(error);
                done(error);
            });

            req.write(JSON.stringify(requestData));
            req.end();
        });
    }

    RED.nodes.registerType('gpt4-api', GPT4APINode);
};
