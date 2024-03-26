import dotenv from "dotenv";

dotenv.config();

const Process = process.env;

export const Protocol_Symbol = Process.PROTO_SYMBOL;

export const MongoAuth = String(Process.MongoAUTH);

export const MaxBlock = Number(Process.MaxBlock);

export const BlockDiff = Number(Process.BlockDiff);

export const MongoDatabase = Process.MongoDatabase;
export const DogemapCollection = Process.dogemapcollection;
export const domaincollection = Process.domaincollection;

export const MongoCollectionBalance = Process.MongoCollectionBalance;

export const MongoCollectionTokens = Process.MongoCollectionTokens;

export const MongoCollectionInscribed = Process.MongoCollectionInscribed;

export const MongoCollectionTrades = Process.MongoEventTrades;

export const MongoCollectionLogs = Process.MongoCollectionLogs;

export const startBlock = Number(Process.startBlock) || 4609723;

export const MongoInscriptions = Process.inscriptions || "";

export const MongoTransactions = Process.transactions || "";

export const MongoDatabaseMain = Process.MongoDatabaseMain;

export const MongoEventLogs = Process.MongoEventLogs || "";

export const MongoDRCTrades = Process.MongoEventTrades;

export const MongoCollectionIndexerStatus =
  Process.MongoCollectionIndexerStatus;

export const PORT = Number(Process.PORT) || 22555;
export const HOST = Process.HOST || "0.0.0.0";
export const PASS = Process.PASS || "";
export const USER = Process.NAME || "";
