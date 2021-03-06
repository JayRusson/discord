/* eslint-disable camelcase */
import { TextChannel, Role, Message, MessageOptions, MessageEmbed } from "discord.js";
import { Long } from "mongodb";
import { GameAnalytics, GameInfo, Store } from "freestuff";


export type Interaction = {
  type: number,
  token: string,
  member: {
    user: {
      id: string,
      username: string,
      avatar: string,
      discriminator: string,
      public_flags: number
    },
    roles: string[],
    premium_since: string | null,
    permissions: string,
    pending: boolean,
    nick: string | null,
    mute: boolean,
    joined_at: string,
    is_pending: boolean,
    deaf: boolean,
  },
  id: string,
  guild_id: string,
  data: {
    options: {
      name: string,
      value: string | number
    }[],
    option: { [name: string]: string | number }, // custom, parsed
    name: string,
    id: string
  },
  channel_id: string
}

export type InteractionResponseType = 'Pong' | 'Acknowledge' | 'ChannelMessage' | 'ChannelMessageWithSource' | 'AcknowledgeWithSource'

export enum InteractionResponseFlags {
  EPHEMERAL = 64
}

export type InteractionApplicationCommandCallbackData = {
  tts?: boolean,
  content: string,
  flags?: InteractionResponseFlags
  embeds?: Partial<MessageEmbed>[],
  allowed_mentions?: any
}

export type InteractionReplyFunction = (type: InteractionResponseType, data?: InteractionApplicationCommandCallbackData | Partial<MessageEmbed>) => void

export abstract class InteractionCommandHandler {

  public abstract handle(command: Interaction, data: GuildData, reply: InteractionReplyFunction): boolean

}



/*
 * DATA STRUCTURES
 */

/** This is the object that gets stored long term for the following uses:
 * - Tell the proxy where to redirect the links to (redundant as the proxy is not in use yet)
 * - Contain analytics data
 * - Queue up for approval process
 */
export interface GameData {

  _id: number; // a unique number to identify the game - used by the proxy
  uuid: string; // internal uuid - used for checking if a game was already announced
  published: number; // UNIX Timestamp in seconds - markes the last time the approval status has changed
  responsible: string; // User id of the moderator, responsible for checking the info and publishing the announcement
  status: GameApprovalStatus; // Current status of the game
  analytics: GameAnalytics; // Analytical data
  info: GameInfo; // Info about the game

}

/** The data that gets stored in the database */
export interface DatabaseGuildData {

  _id: Long;
  sharder: Long;
  channel: Long | null;
  role: Long | null;
  settings: number;
  price: number;

}

/** After the data is parsed to allow easier access */
export interface GuildData extends DatabaseGuildData {

  channelInstance: TextChannel;
  roleInstance: Role;
  theme: number;
  currency: 'euro' | 'usd';
  react: boolean;
  trashGames: boolean;
  altDateFormat: boolean;
  language: string;
  storesRaw: number;
  storesList: Store[];

}

export type GuildSetting = 'channel' | 'roleMention' | 'theme' | 'currency' | 'react' | 'trash' | 'price' | 'altdate' | 'language' | 'stores';

export type GameApprovalStatus = 'pending' | 'declined' | 'approved';


export enum FilterableStore {
  OTHER  = 1 << 0,
  STEAM  = 1 << 1,
  EPIC   = 1 << 2,
  HUMBLE = 1 << 3,
  GOG    = 1 << 4,
  ORIGIN = 1 << 5,
  UPLAY  = 1 << 6,
  ITCH   = 1 << 7,
}


/*
 * CODE STRUCTURES
 */

export interface Shard {

  id: number;
  server: string;
  status: 'ok' | 'timeout' | 'offline' | 'crashed';
  lastHeartbeat: number;
  guildCount: number;

}

export interface ShardStatusPayload extends Shard {

  totalShardCount: number;

}

export interface CommandInfo {

  name: string;
  desc: string;
  trigger: string[];
  adminOnly?: boolean;
  serverManagerOnly?: boolean;
  hideOnHelp?: boolean;

}

export interface CommandHandler {

  handle(mes: Message, args: string[], data: GuildData, reply: ReplyFunction): boolean | Promise<boolean>;

}

export abstract class Command implements CommandHandler {

  public constructor(
    public readonly info: CommandInfo
  ) {
    if (info.adminOnly === undefined) info.adminOnly = false;
    if (info.serverManagerOnly === undefined) info.serverManagerOnly = false;
    if (info.hideOnHelp === undefined) info.hideOnHelp = false;
  }
  
  public abstract handle(mes: Message, args: string[], data: GuildData, repl: ReplyFunction): boolean | Promise<boolean>;
  
}

export interface SettingsSubcommand {

  /** [ usage, description, description variables ] */
  getMetaInfo(g: GuildData): [ string, string, any? ] | ([ string, string, any? ])[];

}

export type ReplyFunction = (message: string, content: string, footer?: string, color?: number, image?: string) => void;

export interface Theme {

  build(content: GameInfo, data: GuildData, settings: { test?: boolean, disableMention?: boolean }): [string, MessageOptions];

}

export interface StoreData {

  name: string;
  key: Store;
  icon: string;
  bit: number;

}


/*
 * PROTOTYPE OVERRIDES
 */

declare global {
  interface Array<T> {
    stack(): number;
    count(counter: (item: T) => number): number;
    iterate(run: (item: T, current: T | undefined) => any): any;
  }
}
