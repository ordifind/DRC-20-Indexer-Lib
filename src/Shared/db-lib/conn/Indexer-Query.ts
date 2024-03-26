import {
  MongoCollectionIndexerStatus,
  MongoDatabase,
  MongoDatabaseMain,
} from "../../indexer-helper/config";
import GetConnection from "./connection";

const IndexerQuery = {
  GetLatestBlock: async () => {
    try {
      const connectionProvider = await GetConnection();
      const db = connectionProvider?.db(MongoDatabaseMain);
      const collection = db?.collection(MongoCollectionIndexerStatus || "");
      const Query = {};
      const data = await collection?.find(Query).toArray();
      const LastBlockScanned = data?.length
        ? data[0].LastInscriptionIndexedBlock
        : undefined;
      return LastBlockScanned;
    } catch (error) {
      throw error;
    }
  },
  UpdatedLastScannedBlock: async (
    LastIndexedBlock: number,
    Trade: boolean = false
  ) => {
    try {
      const connectionProvider = await GetConnection();
      const db = connectionProvider?.db(MongoDatabase);
      const collection = db?.collection(MongoCollectionIndexerStatus || "");

      const IsIndexerInit = await IndexerQuery.getLastScannedBlock();

      if (IsIndexerInit === undefined) {
        return await collection?.insertOne({
          type: "DRC-20-Core",
          LastIndexedBlock: LastIndexedBlock,
          LastTradeIndexedBlock: LastIndexedBlock,
        });
      }

      await collection?.updateOne(
        { type: "DRC-20-Core" },
        {
          $set: {
            [Trade ? "LastTradeIndexedBlock" : "LastIndexedBlock"]:
              LastIndexedBlock,
          },
        }
      );
    } catch (error) {
      throw error;
    }
  },
  getLastScannedBlock: async (Trade: boolean = false) => {
    try {
      const connectionProvider = await GetConnection();
      const db = connectionProvider?.db(MongoDatabase);
      const collection = db?.collection(MongoCollectionIndexerStatus || "");
      const Query = {};
      const data = await collection?.find(Query).toArray();
      const LastBlockScanned = data?.length
        ? data[0][Trade ? "LastTradeIndexedBlock" : "LastIndexedBlock"] - 1
        : undefined;
      return LastBlockScanned;
    } catch (error) {
      throw error;
    }
  },
};

export default IndexerQuery;
