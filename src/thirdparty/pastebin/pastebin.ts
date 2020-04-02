import Database, { dbcollection } from "../../database/database";

const settings = require('../../../config/settings.json').thirdparty;


/** @deprecated */
export default class Pastebin {

  /** @deprecated */
  private static api;

  /** @deprecated */
  public static init() {
    // Pastebin.api = new PastebinAPI({
    //   'api_dev_key' : settings.pastebin.apikey,
    //   'api_user_name' : settings.pastebin.username,
    //   'api_user_password' : settings.pastebin.password
    // });
  }

  /** @deprecated */
  public static post(content: string, title?: string) {
    Pastebin.api.createPaste({
      text: content,
      title: title || 'bump',
      format: null,
      privacy: 2
    });
  }

  /** @deprecated */
  public static postDatabaseBump(collection: dbcollection) {
    Database
      .collection(collection)
      .find({ })
      .toArray()
      .then(a => {
        const dateday = new Date().toLocaleDateString();
        const datetime = new Date().toLocaleString();
        const title = `FreeStuff dbbump - ${collection} ${dateday}`;
        const content = `FreeStuffBot Database Bump backup\nCollection: ${collection}\nTime: ${datetime}\n\n${JSON.stringify(a)}`;
        console.log(title)
        console.log(content)
        Pastebin.post(content, title);
      })
      .catch(console.error);
  }

}