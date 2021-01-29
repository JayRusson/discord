import Database, { dbcollection } from "./database";
import { FreeStuffBot, Core } from "../index";
import { CronJob } from "cron";
import * as chalk from "chalk";


export class DbStats {

  private constructor() { }

  //

  public static startMonitoring(bot: FreeStuffBot) {
    new CronJob('0 0 0 * * *', () => {
      setTimeout(async () => {
        const guildCount = bot.guilds.cache.size;
        const guildMemberCount = bot.guilds.cache.array().count(g => g.memberCount);

        if (Core.singleShard) {
          console.log(chalk.gray(`Updated Stats. Guilds: ${bot.guilds.cache.size}; Members: ${guildMemberCount}`));
          (await this.usage).guilds.updateYesterday(guildCount, false);
          (await this.usage).members.updateYesterday(guildMemberCount, false);
        } else {
          console.log(chalk.gray(`Updated Stats. Guilds: ${bot.guilds.cache.size}; Members: ${guildMemberCount}; Shard ${Core.options.shards[0]}`));
          (await this.usage).guilds.updateYesterday(guildCount, true);
          (await this.usage).members.updateYesterday(guildMemberCount, true);
        }

        this.updateTopClients();
      }, 60000);
    }).start();

    Core.on('ready', this.updateTopClients);
  }

  public static get usage(): Promise<DbStatUsage> {
    return new DbStatUsage().load();
  }

  public static async updateTopClients() {
    const top = Core.guilds.cache.sort((a, b) => b.memberCount - a.memberCount).values();
    const top10 = Array.from(top).splice(0, 10);
    const out = top10.map(async g => ({
      id: g.id,
      name: g.name,
      size: g.memberCount,
      icon: g.iconURL(),
      features: g.features,
      setup: !!((await Core.databaseManager.getGuildData(g.id))?.channelInstance)
    }));
    
    Promise.all(out).then(out => {
      Database
        .collection('stats-top-clients')
        ?.findOneAndUpdate(
          { _id: Core.options.shards[0] || 0 },
          { $set: { value: out } },
          { upsert: true }
        );
    });
  }

}

export class DbStatUsage {

  public readonly raw: { [key: string]: number[] } = {};

  //

  constructor() { }

  //

  async load(): Promise<this> {
    const c = await Database
      .collection('stats-usage')
      ?.find({})
      .toArray();
    for (const temp of c)
      this.raw[temp._id] = temp.value;
    return this;
  }

  get guilds(): DbStatGraph {
    return new DbStatGraph('stats-usage', { _id: 'guilds' }, this.raw['guilds'] || [], this.raw);
  }

  get members(): DbStatGraph {
    return new DbStatGraph('stats-usage', { _id: 'members' }, this.raw['members'] || [], this.raw);
  }

  get announcements(): DbStatGraph {
    return new DbStatGraph('stats-usage', { _id: 'announcements' }, this.raw['announcements'] || [], this.raw);
  }

  get reconnects(): DbStatGraph {
    return new DbStatGraph('stats-usage', { _id: 'reconnects' }, this.raw['reconnects'] || [], this.raw);
  }

}

export class DbStatGraph {

  public constructor(
    private _collectionname: string,
    private _dbquery: any,
    public readonly raw: number[],
    private _fullraw: any
  ) { }

  //

  public get today(): number {
    if (!this.raw) return 0;
    return this.raw[getDayId()] || 0;
  }

  public async update(dayId: number, value: number, delta: boolean): Promise<any> {
    if (dayId < 0) return;
    if (this.raw) {
      let obj = {};
      obj[`value.${dayId}`] = value
      if (delta) obj = { '$inc': obj };
      else obj = { '$set': obj };
      if (dayId > this.raw.length) {
        if (!obj['$set'])
          obj['$set'] = {};
        while (dayId-- > this.raw.length)
          obj['$set'][`value.${dayId}`] = 0;
      }
      return Database
        .collection(this._collectionname as dbcollection)
        ?.updateOne(this._dbquery, obj);
    } else {
      const parentExists = Object.keys(this._fullraw).length > 0;
      const obj = parentExists ? {} : this._dbquery;
      obj.value = [];
      for (let i = 0; i < dayId; i++)
        obj.value.push(0);
      obj.value.push(value);
      if (parentExists) {
        return Database
          .collection(this._collectionname as dbcollection)
          ?.updateOne(this._dbquery, { '$set': obj });
      } else {
        this._fullraw.value = obj;
        return Database
          .collection(this._collectionname as dbcollection)
          ?.insertOne(obj);
      }
    }
  }

  public updateToday(value: number, delta: boolean = true) {
    this.update(getDayId(), value, delta);
  }

  public updateYesterday(value: number, delta: boolean = true) {
    this.update(getDayId() - 1, value, delta);
  }

}

function getDayId(): number {
  const now = new Date();
  const start = new Date(2020, 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);
  return day - 1; // index 0 on 1st january
}