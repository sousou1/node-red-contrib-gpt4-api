# 概要
基本的なNode-REDのインストールから、gpt用のモジュールインストールまでの手順です。


なお、gpt4-apiといいつつ、gpt-3.5.turboでも使えます。

## Node-REDのインストールと実行方法
このドキュメントでは、Windows、Linux、Macそれぞれの環境でNode-REDをインストールし、実行する手順を説明します。

前提条件
以下のソフトウェアがインストール済みであることが前提です。

Node.js: 10.x またはそれ以降のバージョン
npm: 5.x またはそれ以降のバージョン
### Windowsの場合
コマンドプロンプトを開きます。
以下のコマンドを入力して、Node-REDをグローバルにインストールします。

```
npm install -g --unsafe-perm node-red
```

インストールが完了したら、以下のコマンドを入力してNode-REDを起動します。
```
node-red
```
ブラウザで http://127.0.0.1:1880 にアクセスして、Node-REDエディタが表示されることを確認します。

### Linux/Macの場合
ターミナルを開きます。
以下のコマンドを入力して、Node-REDをグローバルにインストールします。
```
sudo npm install -g --unsafe-perm node-red
```
インストールが完了したら、以下のコマンドを入力してNode-REDを起動します。
```
node-red
```
ブラウザで http://127.0.0.1:1880 にアクセスして、Node-REDエディタが表示されることを確認します。

### トラブルシューティング
1. `npm bin -g`でPATHが通っているかを確認してください。
2. 古くからnpmを使っている人は、`npm config set registry https://registry.npmjs.org/`でレジストリをhttpsに更新する必要があります。


## node-red-contrib-gpt4-apiのインストール
このREADMEがあるディレクトリで、以下のコマンドを実行してください。
```
npm pack
```
` node-red-contrib-gpt4-api-1.0.0.tgz`が生成されるかと思います。

これをNode-REDがインストールされたフォルダに移動してインストールします。基本は`~/.node-red`に存在するので、以下のように実行します。
```
cd ~/.node-red
npm install (node-red-contrib-gpt4-api-1.0.0.tgzがあるパス)/node-red-contrib-gpt4-api-1.0.0.tgz
```


Node-REDを再起動して、左側のノード一覧に`gpt4-api`が出てくることを確認します。
## node-red-contrib-gpt4-apiの使い方
まず、node-redの設定にapi_keyを設定します。

API-KEYを https://platform.openai.com/account/api-keys から取得し、なんらかのテキストエディタで`~/.node-red/settings.js`を開きます。460行目くらいの`functionGlobalContext: {`の下に一行api_keyの行を追加し、
```
functionGlobalContext: {
        gpt4_api_key: "apiキーを書いて""で囲む"
```
というようにペーストしてください。

次に、Node-REDエディタでのgpt4-apiノードの設定です。
```
Name ：エディタ上で表示される名前
System Message ：APIに設定する基本的な命令。（例：質問に対して、その分野のプロフェッショナルのように返答してください。）
Model ：gpt-3.5-turbo or gpt-4(gpt-4は使えるようになっている人だけ)
Topic ：msg.topicに設定される値、後段の条件分岐などで使える
```

## サンプル使い方
Node-REDエディタを開き、右上の「読み込み」をクリックします。出てきたウィンドウにある「読み込むファイルを選択」をクリックし、読み込みたいsampleのjsonを選択します。

もしくは、読み込みたいJSONファイルをテキストエディタで開き、すべて選択した後に、読み込みウィンドウにコピーして、右下の「読み込み」を選択します。

読み込みが完了したら、右上の「デプロイ」から実行状態にできます。デプロイを押さずにエディタを修了するとデータが消えることもあるのでご注意ください。

### samples/my_chatgpt.json（おすすめ）
chatgptのように、botと会話を行うサンプルです。

デプロイしたら、 http://localhost:1880/ui/ からダッシュボードを開いて、適当な内容を入力して送信してください。

以下が特徴です。
- ダッシュボード機能を利用して、ChatGPTのように会話を行います。
- 返答来る前に連続して送信するとたぶん壊れます。
- API自体に過去の会話履歴を覚えている機能がないので、過去の記憶管理は「チャットを結合」functionで行っています。
- ファイルへの書き出し機能があります。
- 書き出し時には会話内容全体をgpt-3.5になげて勝手に命名する機能があります。
- また、命名するときにjoinノードを使って二つの入力を待っています。joinノードの中で「指定数のメッセージパーツを受信後」を「２」に設定していますが、これで二つの入力どちらも来たら次へ出力という仕組みを実装出来ます。
  - 出力は配列になっているので、合わせて次の「配列で来る入力を適切に再配置」functionを参考にしてください。

### samples/ノード生成.json
上級者向け。node-REDのノード自体を生成することができます。