//used to decode the transaction

import { Outputdata, outputDecode } from "../indexer-helper/types";

export default function Decoder(txData: any): outputDecode {
  const vout = txData.vout;
  const txid = txData.txid;

  const outputs: Outputdata[] = vout.map((e: { value: number; n: number }) => {
    return { hash: `${txid}`, amount: e.value * 1e8, index: e.n };
  });

  return { outputs: outputs };
}
