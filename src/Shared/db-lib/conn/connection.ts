import { MongoClient } from "mongodb";
import { MongoAuth } from "../../indexer-helper/config";

const Client: MongoClient = new MongoClient(MongoAuth, {});

let PreClient: MongoClient | null = null;

async function GetConnection(): Promise<MongoClient | undefined> {
  try {
    if (PreClient) {
      return PreClient;
    }

    const connection = await Client.connect();
    PreClient = connection;

    return connection;
  } catch (error) {
    if (typeof error === "string") throw new Error(error);
    throw error;
  }
}
export default GetConnection;
