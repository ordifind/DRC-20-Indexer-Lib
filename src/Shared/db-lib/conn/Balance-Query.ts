import {
  MongoCollectionBalance,
  MongoCollectionInscribed,
  MongoCollectionTrades,
  MongoDatabase,
  MongoEventLogs,
} from "../../indexer-helper/config";
import { FormatBalance } from "../../indexer-helper/function-helper";
import {
  BalanceDoginals,
  DoginalsLogs,
  InscribedData,
  Trades,
} from "../../indexer-helper/types";
import GetConnection from "./connection";

const BalanceQuery = {
  WriteBalance: async (data: BalanceDoginals[]): Promise<Boolean> => {
    try {
      const FormatBalanceDatas = FormatBalance(data);
      const connectionProvider = await GetConnection();
      const db = connectionProvider?.db(MongoDatabase);
      const collection = db?.collection(MongoCollectionBalance || "");
      await collection?.bulkWrite(FormatBalanceDatas);
      return true;
    } catch (error) {
      throw error;
    }
  },
  WriteInscribedTransfer: async (data: InscribedData): Promise<Boolean> => {
    try {
      const connectionProvider = await GetConnection();
      const db = connectionProvider?.db(MongoDatabase);
      const collection = db?.collection(MongoCollectionInscribed || "");
      await collection?.insertOne(data);
      return true;
    } catch (error) {
      throw error;
    }
  },
  LoadInscribeId: async (id: string) => {
    try {
      const connectionProvider = await GetConnection();
      const db = connectionProvider?.db(MongoDatabase);
      const collection = db?.collection(MongoCollectionInscribed || "");

      return (await collection?.findOne({ inscribed_id: id })) ? true : false;
    } catch (error) {
      throw error;
    }
  },
  DeleteInscribedId: async (id: string) => {
    try {
      const connectionProvider = await GetConnection();
      const db = connectionProvider?.db(MongoDatabase);
      const collection = db?.collection(MongoCollectionInscribed || "");
      await collection?.deleteOne({ inscribed_id: id });
    } catch (error) {
      throw error;
    }
  },
  LoadUpBalance: async (address: string[]) => {
    try {
      const connectionProvider = await GetConnection();
      const db = connectionProvider?.db(MongoDatabase);
      const collection = db?.collection(MongoCollectionBalance || "");
      const Query = { address: { $in: address } };
      const data = await collection?.find(Query).toArray();

      return data;
    } catch (error) {
      throw error;
    }
  },

  StoreEventLogs: async (eventData: DoginalsLogs[]) => {
    try {
      const connectionProvider = await GetConnection();
      const db = connectionProvider?.db(MongoDatabase);
      const collection = db?.collection(MongoEventLogs);
      await collection?.insertMany(eventData);
    } catch (error) {
      throw error;
    }
  },
  LoadTransactionEvents: async (startBlock: number, EndBlock: number) => {
    try {
      const connectionProvider = await GetConnection();
      const db = connectionProvider?.db(MongoDatabase);
      const collection = db?.collection(MongoEventLogs);

      const Query = {
        block: { $gte: startBlock, $lte: EndBlock },
        event: "transfer",
        isValid: true,
      };

      const datas = await collection?.find(Query).toArray();

      return datas?.length ? datas : false;
    } catch (error) {
      throw error;
    }
  },
  GetMatchInputs: async (hash: string[]) => {
    try {
      const connectionProvider = await GetConnection();
      const db = connectionProvider?.db(MongoDatabase);
      const collection = db?.collection(MongoCollectionInscribed || "");
      const Datas = await collection?.find({ hash: { $in: hash } }).toArray();

      return Datas;
    } catch (error) {
      throw error;
    }
  },

  /**Store Trades */

  StoreTrades: async (TradeData: Trades[]) => {
    try {
      const connectionProvider = await GetConnection();
      const db = connectionProvider?.db(MongoDatabase);
      const collection = db?.collection(MongoCollectionTrades || "");
      await collection?.insertMany(TradeData);
    } catch (error) {}
  },
};

export default BalanceQuery;
