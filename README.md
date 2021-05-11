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
  * おそらくログイン情報の誤りが原因で、想定されたボタンが表示されません。
* 
    ```plain
    no valid button (Probably the gift is already registered)
    ```
  * おそらくすでに登録済みのギフトIDの登録が原因で、想定されたボタンが表示されません。

## 高度な設定

入力が早すぎて表示の処理が追いつかずにエラーとなる場合があります。  
そのときは、 `--step-waiting` オプションに実行後とのウェイトタイム (単位: ms) を指定すると、うまく動くようになる場合があります。

設定例:
```bash
nanaco-gift-registerer-gui.exe --step-waiting=1000
```

## ライセンス

[LICENSE](LICENSE) ファイルを参照。

## 変更履歴

* v0.0.1
  * 初版
