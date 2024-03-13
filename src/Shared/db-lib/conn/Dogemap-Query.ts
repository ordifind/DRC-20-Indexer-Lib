import {
  DogemapCollection,
  MongoDatabase,
  MongoDatabaseMain,
  MongoInscriptions,
  domaincollection,
} from "../../indexer-helper/config";
import { Dogemap, domains } from "../../indexer-helper/types";
import GetConnection from "./connection";

const DogemapQuery = {
  updateInscriptionData: async (
    data: Dogemap[] | domains[],
    type: string = "dogemap"
  ) => {
    try {
      const Query = data.map((e) => {
        const id = e.inscription_id;
        return {
          updateOne: {
            filter: { id: id },
            update: {
              $set: {
                doginalType: type,
              },
            },
          },
        };
      });

      const connection = await GetConnection();

      const db = connection?.db(MongoDatabaseMain);
      const collection = db?.collection(MongoInscriptions || "");
      await collection?.bulkWrite(Query);
    } catch (error) {
      throw error;
    }
  },

  IndexDogemap: async (data: Dogemap[]) => {
    try {
      const connection = await GetConnection();

      const db = connection?.db(MongoDatabase);
      const collection = db?.collection(DogemapCollection || "");

      await collection?.insertMany(data);
      await DogemapQuery.updateInscriptionData(data, "dogemap");
    } catch (error) {
      throw error;
    }
  },
  IndexDomain: async (data: domains[]) => {
    try {
      const connection = await GetConnection();

      const db = connection?.db(MongoDatabase);
      const collection = db?.collection(domaincollection || "");
      await collection?.insertMany(data);
      await DogemapQuery.updateInscriptionData(data, "domain");
    } catch (error) {
      throw error;
    }
  },
  CheckIfDogemapExist: async (block: number) => {
    try {
      const connection = await GetConnection();

      const db = connection?.db(MongoDatabase);
      const collection = db?.collection(DogemapCollection || "");
      const Query = { blockNumber: block };
      const data = await collection?.findOne(Query);
      return data ? true : false;
    } catch (error) {
      throw error;
    }
  },
  CheckIfDomainExist: async (content: string) => {
    try {
      const connection = await GetConnection();

      const db = connection?.db(MongoDatabase);
      const collection = db?.collection(domaincollection || "");
      const Query = { content: content };
      const data = await collection?.findOne(Query);
      return data ? true : false;
    } catch (error) {
      throw error;
    }
  },
};

export default DogemapQuery;
