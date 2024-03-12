import {
  MongoCollectionTokens,
  MongoDatabase,
} from "../../indexer-helper/config";
import { DeployedCache, DoginalsDeployment } from "../../indexer-helper/types";
import { DecimalToString } from "../../utils/decimalsConvert";
import GetConnection from "./connection";

const TokenQuery = {
  CreateDRC20Tokens: async (data: DoginalsDeployment[]): Promise<boolean> => {
    try {
      const MongProvider = await GetConnection();
      const db = MongProvider?.db(MongoDatabase);
      const collection = db?.collection(MongoCollectionTokens || "");
      const Count: number =
        (await collection?.insertMany(data))?.insertedCount || 0;

      if (Count === 0) return false;

      return true;
    } catch (error) {
      throw error;
    }
  },

  LoadTokensData: async (tokens: string[]) => {
    try {
      const MongProvider = await GetConnection();
      const db = MongProvider?.db(MongoDatabase);
      const collection = db?.collection(MongoCollectionTokens || "");
      const Query = { tick: { $in: tokens } };
      const datas = await collection?.find(Query).toArray();
      return datas;
    } catch (error) {
      throw error;
    }
  },

  UpdateTokenState: async (tokensState: DeployedCache[]) => {
    try {
      const Query = tokensState.map((e) => {
        const q = {
          filter: { tick: e.tick },
          update: {
            $set: {
              MintedAmount: DecimalToString(e.MintedAmount),
              ...(e.supply.eq(e.MintedAmount)
                ? { isMinted: true, completedBlock: e.MintedBlock }
                : {}),
            },
          },
        };
        return q;
      });
      const bulkOperations = Query.map(({ filter, update }) => ({
        updateOne: {
          filter,
          update,
        },
      }));
      const MongProvider = await GetConnection();
      const db = MongProvider?.db(MongoDatabase);
      const collection = db?.collection(MongoCollectionTokens || "");
      await collection?.bulkWrite(bulkOperations);
    } catch (error) {
      throw error;
    }
  },
};

export default TokenQuery;
