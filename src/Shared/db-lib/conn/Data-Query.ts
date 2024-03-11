import {
  MongoDatabaseMain,
  MongoInscriptions,
  MongoTransactions,
} from "../../indexer-helper/config";
import GetConnection from "./connection";

const DataQuery = {
  LoadInscriptions: async (block: Number[]) => {
    try {
      const connectionProvider = await GetConnection();
      const db = connectionProvider?.db(MongoDatabaseMain);
      const collection = db?.collection(MongoInscriptions);

      const Query = { block: { $in: block } };

      const data = await collection?.find(Query).toArray();

      return data;
    } catch (error) {
      throw error;
    }
  },

  LoadTransactions: async (block: Number[]) => {
    try {
      const connectionProvider = await GetConnection();
      const db = connectionProvider?.db(MongoDatabaseMain);
      const collection = db?.collection(MongoTransactions);

      const Query = { blockNumber: { $in: block } };

      const data = await collection?.find(Query).toArray();

      return data;
    } catch (error) {
      throw error;
    }
  },

  GetTransactionPerHash: async (hash: string[]) => {
    try {
      const connectionProvider = await GetConnection();
      const db = connectionProvider?.db(MongoDatabaseMain);
      const collection = db?.collection(MongoTransactions);

      const Query = { txid: { $in: hash } };

      const data = await collection?.find(Query).toArray();

      return data;
    } catch (error) {
      throw error;
    }
  },
  LoadMatchedInscriptions: async (ids: string[]) => {
    try {
      const connectionProvider = await GetConnection();
      const db = connectionProvider?.db(MongoDatabaseMain);
      const collection = db?.collection(MongoInscriptions);

      const Query = { id: { $in: ids } };

      const data = await collection?.find(Query).toArray();

      return data;
    } catch (error) {
      throw error;
    }
  },
};

export default DataQuery;
