module.exports = function (RED) {
    const axios = require('axios');

    // for proxy
    const HttpProxyAgent = require('http-proxy-agent');
    const HttpsProxyAgent = require('https-proxy-agent');

    function GPT4APINode(config) {
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

            const proxyConfig = httpsProxy || httpProxy;
            const agent = proxyConfig ? new HttpsProxyAgent(proxyConfig) : null;

            const instance = axios.create({
                baseURL: 'https://api.openai.com/v1/chat/completions',
                headers: { 'Authorization': 'Bearer ' + api_key },
                httpsAgent: agent,
                proxy: false
            });

            const requestData = {
                "model": model,
                "messages": [
                    { "role": "system", "content": system_message },
                    { "role": "user", "content": input_message }
                ]
            };

            instance.post('', requestData)
                .then(function (response) {
                    msg.payload = response.data.choices[0].message.content;
                    node.send(msg);
                })
                .catch(function (error) {
                    node.warn(api_key);
                    node.warn("error");
                    node.error(error);
                });
        });
    }

    RED.nodes.registerType('gpt4-api', GPT4APINode);
};
