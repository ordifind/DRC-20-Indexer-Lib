import BalanceQuery from "../Shared/db-lib/conn/Balance-Query";
import { DoginalsLogs } from "../Shared/indexer-helper/types";
import TradeExtracter from "./trades-extracter";
const TradeFetcher = async (startBlock: number, maxBlock: number) => {
  try {
    //Todo
    /**
     * 1. fetch the drc20 tokens transfer events from events collection
     * 2. Now loop the result and get the transaction data for those events
     * 3. Now check the transaction inputs and outputs, See if its the PSBT where the special
     * sig hash type ([SINGLE|ANYONECANPAY]) is used or not.... if the sighash [SINGLE|ANYONECANPAY] is not used ignore them....
     * if used then,
     * 4. Find the (amount in ) doge to sender in output and calculate the price by Amount Token / Amount doge
     * 5. Store the trade in database
     */

    const EndBlock = maxBlock + startBlock;

    //Now lets fetch trades from database

    const TradesData = await BalanceQuery.LoadTransactionEvents(
      startBlock,
      EndBlock
    );

    if (!TradesData) return;

    const DoginalsLogsForamtted: DoginalsLogs[] = TradesData.map(
      (e): DoginalsLogs => {
        return {
          event: "transfer",
          tick: e.tick,
          time: e.time,
          block: e.block,
          txid: e.txid,
          inscripition_id: e.inscripition_id,
          sender: e.sender,
          receiver: e.receiver,
          amount: e.amount,
          isValid: true,
        };
      }
    );

    const Trades = await TradeExtracter(DoginalsLogsForamtted);

    return Trades;
  } catch (error) {
    throw error;
  }
};

export default TradeFetcher;
