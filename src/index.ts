import StartIndexer from "./Indexer/Process-Indexer";
import MongoTradeIndexer from "./Trades-Indexer";
(async () => {
  // const DRCindexer = StartIndexer();
  const TradeIndexer = MongoTradeIndexer();
  await Promise.all([TradeIndexer]);
})();
