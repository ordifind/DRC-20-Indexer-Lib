import {
  MongoCollectionBalance,
  MongoCollectionInscribed,
  MongoDatabase,
} from "../../indexer-helper/config";
import { FormatBalance } from "../../indexer-helper/function-helper";
import { BalanceDoginals, InscribedData } from "../../indexer-helper/types";
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
  LoadUpBalance: async (address: string[]) => {
    try {
      const connectionProvider = await GetConnection();
      const db = connectionProvider?.db(MongoDatabase);
      const collection = db?.collection(MongoCollectionBalance || "");
      const Query = { address: { $in: address } };
      const data = await collection?.find(Query).toArray();

      return data;
    } catch (error) {}
  },
};

export default BalanceQuery;
