import {
  DogemapCollection,
  MongoDatabase,
  domaincollection,
} from "../../indexer-helper/config";
import { Dogemap, domains } from "../../indexer-helper/types";
import GetConnection from "./connection";

const DogemapQuery = {
  IndexDogemap: async (data: Dogemap[]) => {
    try {
      const connection = await GetConnection();

      const db = connection?.db(MongoDatabase);
      const collection = db?.collection(DogemapCollection || "");

      await collection?.insertMany(data);
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
