const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const globPromise = require('glob-promise');
const pie = require('puppeteer-in-electron');
const puppeteer = require("puppeteer-core");

/** @type {puppeteer.Browser} */
let ppBrowser;

/**
 * 指定時間 setTimeout で待機します。
 * 0 秒が指定されても、必ず setTimeout によってスレッドの処理を譲る。
 * @param {Number} time 
 * @returns {Promise<Number>}
 */
const waitAsync = async (time) => {
  const startTime = Date.now();
  return new Promise(resolve => setTimeout(() => resolve(Date.now() - startTime), time));
};


(async () => {
  /** @type {Number} */
  const stepWaiting = app.commandLine.hasSwitch('step-waiting') ? parseFloat(app.commandLine.getSwitchValue('step-waiting')) : 100;
  if (Number.isNaN(stepWaiting)) throw `invalid option --step-waiting=${app.commandLine.getSwitchValue('step-waiting')}`;

  // puppeteer 使用ポートは、空きポートから自動的に取得される
  await pie.initialize(app);
  await app.whenReady();
  ppBrowser = await pie.connect(app, puppeteer);

  // ウィンドウリスト
  /** @type {BrowserWindow[]} */
  const windowList = [];

  // メインウィンドウを作成
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(app.getAppPath(), 'preload.js'),
    },
  });
  await mainWindow.loadFile('index.html');
  // mainWindow.webContents.openDevTools()

  // メインウィドウ終了時の確認
  mainWindow.on('close', (event) => {
    const n = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      buttons: ['Yes', 'No'],
      title: '終了確認',
      message: '終了しますか?',
    });
    if (n === 1) {
      event.preventDefault();
    }
  });
  
  const limitFile = (await globPromise(path.join(app.getAppPath(), 'limit-to-counts.*.dat'))).sort().find(() => true);
  if (limitFile.slice(-11, -4) == 'nonprod') {
    mainWindow.webContents.send('updateTitle', 'nanaco Gift Registerer DEMO');
  }

  // mainWindow のレンダラープロセスからのイベントハンドラ
  // nanaco 登録の実行
  ipcMain.handle('startRegister', async (event, id, dataStringified) => {
    /**
     * @type {{
     *    giftTexts: string,
     *    memberType: 'card'|'mobile',
     *    memberIsCard: boolean,
     *    memberIsMobile: boolean,
     *    asGiftIdList:boolean,
     *    nanacoNumber:string,
     *    cardNumber: string,
     *    mobilePassword: string,
     *    skipErrLoginFailure: boolean,
     *    skipErrAlreadyRegistered: boolean
     * }}
     */
    const data = JSON.parse(dataStringified);

    // 入力文字列から、 nanaco ギフト登録用 URL を作成
    /** @type {string[]} */
    let urlList;
    if (data.asGiftIdList) {
      // ギフトID から URL 一覧を作成
      const re = /^\s*([a-zA-Z0-9]{16})\s*$/;
      urlList = data.giftTexts.split(/\r\n|\r|\n/)
        .map(l => { const m = l.match(re); return m ? m[1] : undefined })
        .filter(l => l !== undefined)
        .map(l => `https://www.nanaco-net.jp/pc/emServlet?gid=${l}`);
    } else {
      // メールの本文から ギフト URL を抽出
      const re = new RegExp(String.raw`https://www\.nanaco-net\.jp/pc/emServlet\?gid=[a-zA-Z0-9]{16}`);
      urlList = data.giftTexts.split(/\r\n|\r|\n/).map(l => { const m = l.match(re); return m ? m[0] : undefined }).filter(l => l !== undefined);
    }

    if (urlList.length == 0) {
      throw `no valid ${data.asGiftIdList ? 'Gift ID' : 'Gift URL'}`;
    }
    const limit = parseFloat(await fs.readFile(limitFile, { encoding: 'ascii' }));
    if (!(urlList.length <= limit)) {
      throw `The number of gifts has exceeded the limit: ${limit}`;
    }

    registerLoop:
    for (let registerUrl of urlList) {
      const maskedGid = registerUrl.match(/(?<=\?)gid=.{4}/)[0] + '************';

      // レンダラープロセスの 進捗ログ に、文字列を追加
      mainWindow.webContents.send('appendResult', `Process: ${maskedGid}`);

      // ウィンドウ作成
      await waitAsync(100 + stepWaiting); // 前回の registerWindow.destroy() 以降 BrowserWindow 再作成前にスリープを入れる
      const registerWindow = new BrowserWindow();
      windowList.push(registerWindow);
      try {
        const ppPage = await pie.getPage(ppBrowser, registerWindow);

        // ログイン
        await Promise.all([
          ppPage.waitForNavigation(),
          ppPage.goto(registerUrl)
        ]);
        await waitAsync(stepWaiting);

        let loginClickSelector;
        if (data.memberIsCard) {  // nanaco カード
          // nanaco番号 を入力
          await ppPage.type('#nanacoNumber02', data.nanacoNumber);
          await waitAsync(stepWaiting);
          // "カード記載の番号" を入力
          await ppPage.type('#cardNumber', data.cardNumber);
          await waitAsync(stepWaiting);
          // login
          loginClickSelector = '#loginPass02';
        } else {  // nanaco モバイル
          // nanaco番号 を入力
          await ppPage.type('#nanacoNumber01', data.nanacoNumber);
          await waitAsync(stepWaiting);
          // パスワード を入力
          await ppPage.type('#pass', data.mobilePassword);
          await waitAsync(stepWaiting);
          // login
          loginClickSelector = '#loginPass01';
        }
        await Promise.all([
          ppPage.waitForNavigation(),
          ppPage.click(loginClickSelector)
        ]);
        await waitAsync(stepWaiting);

        // メニューの "nanacoギフト登録" をクリック
        let targetGiftRegisterAnchor = undefined;
        for (let elm of await ppPage.$$('a')) {
          /** @type {string} */
          let value = await (await elm.getProperty('textContent')).jsonValue();
          if (value && value.includes('nanacoギフト登録')) {
            targetGiftRegisterAnchor = elm;
            break;
          }
        }
        if (targetGiftRegisterAnchor === undefined) {
          let msg_t = 'no valid button (Probably the card number or the password is wrong)';
          if (data.skipErrLoginFailure) {
            mainWindow.webContents.send('appendResult', `Warning: ${msg_t}`);
            continue registerLoop;
          } else {
            throw msg_t;
          }
        }
        await Promise.all([
          ppPage.waitForNavigation(),
          targetGiftRegisterAnchor.click()
        ]);
        await waitAsync(stepWaiting);

        // "ご利用約款に同意の上、登録" をクリック
        const doRegistrationForm = await ppPage.$("form[action*='https://nanacogift.jp/ap/p/top.do']");
        const doRegistrationAnchor = await doRegistrationForm.$("input[type='image']");
        await ppPage.evaluate(elmForm => {
          // 新しいウィンドウに遷移しないように、 DOM を書き換える
          elmForm.target = '_self';
          elmForm.onsubmit = '';
        }, doRegistrationForm);
        await doRegistrationForm.dispose();
        await waitAsync(stepWaiting);
        await Promise.all([
          ppPage.waitForNavigation(),
          doRegistrationAnchor.click()
        ]);
        await waitAsync(stepWaiting);

        // "確認画面へ" をクリック
        await Promise.all([
          ppPage.waitForNavigation(),
          ppPage.click('#submit-button')
        ]);
        await waitAsync(stepWaiting);

        // "登録" ボタンをクリック
        const doRegistrationFinal = await ppPage.$('input[alt="登録する"]');
        if (!doRegistrationFinal) {
          let msg_t = 'no valid button (Probably the gift is already registered)';
          if (data.skipErrAlreadyRegistered) {
            mainWindow.webContents.send('appendResult', `warning: ${msg_t}`);
            continue registerLoop;
          } else {
            throw msg_t;
          }
        }
        await Promise.all([
          ppPage.waitForNavigation(),
          doRegistrationFinal.click()
        ]);
        await waitAsync(stepWaiting);

        mainWindow.webContents.send('appendResult', 'Done.');
      } finally {
        windowList.forEach((item, index) => {
          if (item === registerWindow) {
            windowList.splice(index, 1);
          }
        });
        registerWindow.destroy();
      }
    }
  });

  // (mainWindow がガベージコレクタに回収されないように、) メインウィンドウ終了を待機し、
  // その後他のウィンドウを全て閉じる
  await new Promise(resolve => mainWindow.on('closed', resolve));
  windowList.forEach(w => w.destroy());
  app.quit();
})();
