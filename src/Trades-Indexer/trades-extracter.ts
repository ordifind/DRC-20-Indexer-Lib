import Decimal from "decimal.js";
import DataQuery from "../Shared/db-lib/conn/Data-Query";
import {
  FormatTrades,
  FormatTransactionFromDB,
  IsValidSighash,
} from "../Shared/indexer-helper/function-helper";
import {
  DoginalsLogs,
  Trades,
  Transactions,
} from "../Shared/indexer-helper/types";

const TradeExtracter = async (TransactionData: DoginalsLogs[]) => {
  const TransactionCache: Record<string, Transactions> = {};

  const TXs = TransactionData.map((e) => e.txid);

  //Now lets fetch the transaction of it

  const Transactions = await DataQuery.GetTransactionPerHash(TXs);

  if (!Transactions?.length) throw new Error("Transactions Not Found !!");

  const FormatedTransaction = FormatTransactionFromDB(Transactions);

  FormatedTransaction.map((e) => {
    if (e.coinbase) return;
    TransactionCache[e.txid] = e;
  });

  //Now let see if its a p2p trades

  const Trades: Trades[] = [];

  for (const Transaction of TransactionData) {
    const txid = Transaction.txid;

    //Now lets get the match Transaction

    const MatchedTransaction = TransactionCache[txid];

    if (!MatchedTransaction) throw new Error(`Transaction ${txid} not found`);

    /**
     *
     * If the input lenght is less then or equal to 2 then its not p2p trades
     * because p2p trades require at least 1 inscription input, 1 funding input and other
     * cover inputs
     */

    if (new Decimal(MatchedTransaction.inputs.length).lte(2)) {
      continue;
    }

    for (const [i, inputs] of MatchedTransaction.inputs.entries()) {
      const IsTradeInput = IsValidSighash(inputs.script);

      if (!IsTradeInput) continue;

      const TradeFormatted = FormatTrades(MatchedTransaction, Transaction);

      if (!TradeFormatted) continue;

      Trades.push(TradeFormatted);
    }
  }

  return Trades;
};

export default TradeExtracter;
