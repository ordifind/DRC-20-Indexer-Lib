import Decimal from "decimal.js";
import IndexerQuery from "../Shared/db-lib/conn/Indexer-Query";
import DataQuery from "../Shared/db-lib/conn/Data-Query";
import { MaxBlock, startBlock } from "../Shared/indexer-helper/config";
import { Sleep } from "../Shared/indexer-helper/function-helper";
import IndexDoginals from "./Index-Doginals";
import InscriptionsWorker from "./Inscription-Worker";
import Logger from "../Shared/indexer-helper/logger";
import IndexDogemapAndDomain from "./index-dogemap-domain";

let LastBlock: number = 0;
let LatestBlock: number = 0;
let MaxBlockScan = MaxBlock;
const BlockBehind = 1;

const StartIndexer = async () => {
  try {
    const LatestBlock_ = await IndexerQuery.GetLatestBlock();

    LatestBlock = LatestBlock_;

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
    }

    while (true) {
      //Checking if we are sarting to index from back 0 or last saved block
      Logger.Success(`Starting to Index form Block ${LastBlock}`);

      const StartingBlock: number = LastBlock;

      if (
        new Decimal(LatestBlock).lte(StartingBlock + BlockBehind) ||
        LatestBlock === 0
      ) {
        Logger.Success(`Trying to Sleep for 30sec before indexing new Block`);
        LatestBlock = await IndexerQuery.GetLatestBlock();
        MaxBlockScan = LatestBlock - StartingBlock + 2;
        await Sleep(30);
        continue;
      }

      const BlockDifference = LatestBlock - StartingBlock;

      if (BlockDifference <= MaxBlock) {
        MaxBlockScan = BlockDifference - BlockBehind;
      }

      const BlocksToIndex: number[] = [];

      for (let i = 0; i < MaxBlockScan; i++) {
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

        continue;
      }

      //lets track the performance timing

      const StartTimer = performance.now();
      Logger.Success(`Pharsing Blocks Inscription data before Indexing....`);

      const FormatedInscriptionData = await InscriptionsWorker(
        BlockData,
        BlocksToIndex
      );

      /**
       * Now lets index dogemaps
       *
       */

      if (FormatedInscriptionData.OtherDoginals)
        await IndexDogemapAndDomain(FormatedInscriptionData.OtherDoginals);

      const EndTimer = performance.now();

      const timeTook = (EndTimer - StartTimer) / 1000;

      Logger.Success(
        `Parsed Blocks ---- Took:= ${timeTook.toFixed(2)}sec ⏰⏰⏰ `
      );

      if (!FormatedInscriptionData.DRC20.length) {
        Logger.error(
          `No Valid DRC-20 Inscription found between blocks ${
            BlocksToIndex[0]
          } to ${BlocksToIndex[BlocksToIndex.length - 1]}  `
        );
        await IndexerQuery.UpdatedLastScannedBlock(LastBlock);

        continue;
      }

      Logger.Success(`Stating Inscription Indexing Worker.....`);

      await IndexDoginals(FormatedInscriptionData.DRC20);

      Logger.Success(`Successfully Indexed the Inscription from the Blocks `);

      await IndexerQuery.UpdatedLastScannedBlock(LastBlock);
    }
  } catch (error) {
    throw error;
  }
};

export default StartIndexer;
