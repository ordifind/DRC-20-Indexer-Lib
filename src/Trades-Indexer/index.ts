/**
 *
 * DRC20 Trade Indexer LIB......
 */

import BalanceQuery from "../Shared/db-lib/conn/Balance-Query";
import IndexerQuery from "../Shared/db-lib/conn/Indexer-Query";
import { Sleep } from "../Shared/indexer-helper/function-helper";
import Logger from "../Shared/indexer-helper/logger";
import TradeFetcher from "./trades-fetcher";

const MaxBlock = 500;

const MongoTradeIndexer = async () => {
  try {
    //Now lets fetch the trades

    let StartBlock = await IndexerQuery.getLastScannedBlock(true);

    if (!StartBlock) throw new Error("Faild to query last syned block");

    let IndexerDeamonBlock = await IndexerQuery.getLastScannedBlock();

    if (!IndexerDeamonBlock)
      throw new Error("Faild to query IndexerDeamonBlock syned block");

    Logger.Success("Starting Trade Deamon...");

    while (true) {
      const Blockbehind = IndexerDeamonBlock - StartBlock;

      if (Blockbehind + 1 === 0) {
        await Sleep(2 * 1000);
        Logger.Success("Sleeping Trade Deamon...");

        const LatestDeamonBlock = await IndexerQuery.getLastScannedBlock();

        if (LatestDeamonBlock) IndexerDeamonBlock = LatestDeamonBlock;
        continue;
      }

      let MaxDeamon = MaxBlock;

      if (Blockbehind >= MaxBlock) {
        MaxDeamon = MaxBlock;
      } else {
        MaxDeamon = Blockbehind;
      }

      Logger.Success(
        `Scanning Block from ${StartBlock} to ${
          StartBlock + MaxDeamon
        }: Block Behind:- ${Blockbehind}`
      );

      StartBlock = StartBlock + MaxDeamon + 1;

      const TradesFetched = await TradeFetcher(StartBlock, MaxDeamon);

      if (!TradesFetched || !TradesFetched.length) {
        await IndexerQuery.UpdatedLastScannedBlock(StartBlock, true);

        continue;
      }
      Logger.Success(
        `Scanned Trades  from ${StartBlock} to ${
          StartBlock + MaxDeamon
        }: Block Behind:- ${Blockbehind}`
      );

      await BalanceQuery.StoreTrades(TradesFetched);

      await IndexerQuery.UpdatedLastScannedBlock(StartBlock, true);
    }
  } catch (error) {
    throw error;
  }
};

export default MongoTradeIndexer;
