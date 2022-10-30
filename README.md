# nanaco-gift-registerer-gui

nanaco ギフト を、 GUI 上で自動的に登録するツールです。

Windows 向けのビルド済みツールは、 <https://advanceboy.booth.pm/items/2942725> で販売しています。

より詳しい使い方等の説明を、 [作者のブログ記事](https://aquasoftware.net/blog/?p=1560) に掲載しています。

## 使い方

1. ビルド済みの `nanaco-gift-registerer-gui.exe` をダブルクリックして起動する
1. "ギフトID" のリストや、 "ＰＣ用URL付ｷﾞﾌﾄID" が含まれているメール本文 をテキストボックスに入力する
1. nanaco の会員の種類と、 nanaco のログイン情報を入力する
1. 「実行」をクリックする

詳しくは、上記の販売ページを参照ください。

## エラー例

* 
    ```plain
    no valid Gift URL
    ```
  * "nanaco ギフト" のテキストボックスに、有効な ギフト URL が見つかりません。
* 
    ```plain
    The number of gifts has exceeded the limit: 3
    ```
  * 体験版では、記載された数のギフトしか同時に登録できません。
* 
    ```plain
    no valid button (Probably the card number or the password is wrong)
    ```
  * おそらくログイン情報の誤りが原因で、想定されたボタンが表示されません。 (※1)
* 
    ```plain
    no valid button (Probably the gift is already registered)
    ```
  * おそらくすでに登録済みのギフトIDの登録が原因で、想定されたボタンが表示されません。 (※1)

※1: 詳細オプションの設定で、エラーを無視して続行することも可能です。

## 高度な設定

入力が早すぎて表示の処理が追いつかずにエラーとなる場合があります。  
そのときは、 `--step-waiting` オプションに実行後とのウェイトタイム (単位: ms) を指定すると、うまく動くようになる場合があります。

設定例:
```bash
nanaco-gift-registerer-gui.exe --step-waiting=1000
```

## ビルド

Windows 32bit プロセス向けの場合:

```shell
npx electron-builder --win --ia32
```

### 実行モード切替

`package.json` の `$.version` に対して、 `x.x.x-demo` のようなプレリリースバージョンをつけてビルドすることで、実行モードを切り替えます。  
内部的には、 `$.build.files.*` の [`${channel}` ファイルマクロ](https://www.electron.build/file-patterns) の仕組みを用い、プレリリースバージョンの文字列からビルドに含めるファイルを切り替えることにより、機能の差異を実現します。

### electron と puppeteer-core のバージョン

[Puppeteer は Chromium のバージョンと不可分](https://www.npmjs.com/package/puppeteer-core#q-why-doesnt-puppeteer-vxxx-work-with-chromium-vyyy)であるため、 `package.json` で依存している `electron`, `puppeteer-core` それぞれのパッケージのバージョンは揃えて更新する必要があります。

具体的には、各 electron のメジャーバージョンは[特定の Chromium バージョンに依存](https://www.electronjs.org/ja/blog/electron-17-0)しており、[その Chromium のバージョンに一致した puppeteer のバージョン](https://www.npmjs.com/package/puppeteer-core#q-which-chromium-version-does-puppeteer-use)を [`puppeteer/versions.js`](https://github.com/puppeteer/puppeteer/blob/main/versions.js) から選択して、 puppeteer-core のマイナーバージョンを決定します。

## ライセンス

[LICENSE](LICENSE) ファイルを参照。

## 変更履歴

* v0.1.3
  * 詳細オプションに「進捗ログ表示 - 登録金額」を追加
  * 依存ライブラリを更新
* v0.1.2
  * "URL ではなく ギフトID を入力" にチェック入れた場合に、 行頭に ギフトID とそれに続く空白文字または改行があれば、それに続く文字を無視して ギフトID と認識するように改善
  * 依存ライブラリを更新
* v0.1.1
  * 依存ライブラリを更新
* v0.1.0
  * 依存ライブラリを更新
* v0.0.3
  * 登録中にエラーが発生しても無視して続行するオプションを追加
* v0.0.2
  * 確率的に起動に失敗する場合がある問題を修正
  * "URL ではなく ギフトID を入力" にチェック入れた場合に、 ギフトID の前後に空白があっても無視するように改善
* v0.0.1
  * 初版
