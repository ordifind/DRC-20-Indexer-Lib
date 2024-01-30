import dotenv from "dotenv";

dotenv.config();

const Process = process.env;

export const Protocol_Symbol = Process.PROTO_SYMBOL;

export const MongoAuth = String(Process.MongoAUTH);

export const MaxBlock = Number(Process.MaxBlock);

export const BlockDiff = Number(Process.BlockDiff);

export const MongoDatabase = Process.MongoDatabase;

export const MongoCollectionBalance = Process.MongoCollectionBalance;

export const MongoCollectionTokens = Process.MongoCollectionTokens;

export const MongoCollectionInscribed = Process.MongoCollectionInscribed;

export const MongoCollectionLogs = Process.MongoCollectionLogs;

export const startBlock = Number(Process.startBlock) || 4609723;

export const MongoInscriptions = Process.inscriptions || "";

export const MongoTransactions = Process.transactions || "";

export const MongoDatabaseMain = Process.MongoDatabaseMain;

export const MongoCollectionIndexerStatus =
  Process.MongoCollectionIndexerStatus;
