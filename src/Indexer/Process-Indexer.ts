import Decimal from "decimal.js";
import IndexerQuery from "../Shared/db-lib/conn/Indexer-Query";
import DataQuery from "../Shared/db-lib/conn/Data-Query";
import { MaxBlock, startBlock } from "../Shared/indexer-helper/config";
import { Sleep } from "../Shared/indexer-helper/function-helper";
import IndexDoginals from "./Index-Doginals";
import InscriptionsWorker from "./Inscription-Worker";
import Logger from "../Shared/indexer-helper/logger";

let LastBlock: number = 0;

const StartIndexer = async () => {
  try {
    if (LastBlock === 0) {
      Logger.Success(`Starting Indexer Core to Process Indexing Work.....`);

      const LastIndexedBlock = await IndexerQuery.getLastScannedBlock();

      if (!LastIndexedBlock) {
        Logger.Success(
          `Fresh Starting Indexer, Starting to Index from ${LastIndexedBlock}`
        );

        LastBlock = startBlock;
      } else {
        Logger.Success(
          `Found Last Indexed Block, Starting to Index from ${LastIndexedBlock}`
        );
        LastBlock = LastIndexedBlock;
      }
    } else {
      Logger.Success(`Starting to Index form Block ${LastBlock}`);
    }

    const StartingBlock: number = LastBlock;

    const LatestBlock = await IndexerQuery.GetLatestBlock();

    if (LatestBlock === undefined)
      throw new Error("Faild to Load Saved Block!");

    if (new Decimal(LatestBlock).lte(StartingBlock)) {
      Logger.Success(`Trying to Sleep for 30sec before indexing new Block`);

      await Sleep(30);
      await StartIndexer();
    }

    const BlocksToIndex: number[] = [];

    for (let i = 0; i < MaxBlock; i++) {
      BlocksToIndex.push(StartingBlock + i);
    }

    const BlockData = await DataQuery.LoadInscriptions(BlocksToIndex);

    LastBlock = BlocksToIndex[BlocksToIndex.length - 1] + 1;

    Logger.Success(
      `Scanned Blocks from ${BlocksToIndex[0]} to ${
        BlocksToIndex[BlocksToIndex.length - 1]
      }`
    );

    if (!BlockData) {
      Logger.error(
        `Not Single Inscription found between blocks ${BlocksToIndex[0]} to ${
          BlocksToIndex[BlocksToIndex.length - 1]
        }  `
      );
      await StartIndexer();
      return;
    }

    const FormatedInscriptionData = await InscriptionsWorker(BlockData);

    Logger.Success(`Pharsing Blocks Inscription data before Indexing....`);

    if (!FormatedInscriptionData.length) {
      Logger.error(
        `No Valid DRC-20 Inscription found between blocks ${
          BlocksToIndex[0]
        } to ${BlocksToIndex[BlocksToIndex.length - 1]}  `
      );
      await StartIndexer();
    }

    Logger.Success(`Stating Inscription Indexing Worker.....`);

    await IndexDoginals(FormatedInscriptionData);

    Logger.Success(`Successfully Indexed the Inscription from the Blocks `);

    await IndexerQuery.UpdatedLastScannedBlock(LastBlock);

    await Sleep(2); //sleep for 5sec and reindex

    await StartIndexer();
  } catch (error) {
    throw error;
  }
};

export default StartIndexer;
