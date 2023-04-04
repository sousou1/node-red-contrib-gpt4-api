module.exports = function (RED) {
    const axios = require('axios');

    function GPT4APINode(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        node.on('input', function (msg) {
            const input_message = msg.payload;
            const system_message = config.system_message;
            const api_key = node.context().global.get('gpt4_api_key'); // 変更: グローバル設定から api_key を取得
            const model = config.model;
            msg.topic = config.topic; // 追加：msg.topic を config から設定する

            const instance = axios.create({
                baseURL: 'https://api.openai.com/v1/chat/completions',
                headers: { 'Authorization': 'Bearer ' + api_key }
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
                    node.error(error);
                });
        });
    }

    RED.nodes.registerType('gpt4-api', GPT4APINode);
};
