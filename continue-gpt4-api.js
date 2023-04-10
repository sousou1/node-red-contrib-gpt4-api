module.exports = function (RED) {
    const axios = require('axios');
    const HttpProxyAgent = require('http-proxy-agent');
    const HttpsProxyAgent = require('https-proxy-agent');

    function ContinueGPT4APINode(config) {
        RED.nodes.createNode(this, config);
        const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
        const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
        let node = this;

        node.on('input', function (msg) {
            const input_message = msg.payload;
            const system_message = config.system_message;
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

            const instance = axios.create({
                baseURL: 'https://api.openai.com/v1/chat/completions',
                headers: { 'Authorization': 'Bearer ' + api_key },
                httpsAgent: agent,
                proxy: false
            });

            // Use chat_history as messages if available, otherwise use the system message
            const messages = msg.chat_history ? msg.chat_history : [
                { "role": "system", "content": system_message },
            ];

            // Add user message to messages
            messages.push({ "role": "user", "content": input_message });

            const requestData = {
                "model": model,
                "messages": messages,
                "temperature": parseFloat(temperature),
                "top_p": parseFloat(top_p),
                "n": 1,
                "max_tokens": parseInt(max_tokens),
                "stream": JSON.parse(stream),
                "presence_penalty": parseFloat(presence_penalty),
                "frequency_penalty": parseFloat(frequency_penalty),
            };

            if (logit_bias) {
                requestData["logit_bias"] = JSON.parse(logit_bias);
            }

            if (stop) {
                requestData["stop"] = JSON.parse(stop);
            }

            instance.post('', requestData)
                .then(function (response) {
                    const output_message = response.data.choices[0].message.content;
                    msg.payload = output_message;

                    // Add system response to chat history and update msg.chat_history
                    messages.push({ "role": "assistant", "content": output_message });
                    msg.chat_history = messages;

                    node.send(msg);
                })
                .catch(function (error) {
                    node.error(error);
                });
        });
    }

    RED.nodes.registerType('continue-gpt4-api', ContinueGPT4APINode);
};