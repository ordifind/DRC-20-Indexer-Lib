//used to decode the transaction

import { Outputdata, outputDecode } from "../indexer-helper/types";

export default function Decoder(txData: any): outputDecode {
  const vout = txData.vout;
  const txid = txData.txid;

  const outputs: Outputdata[] = vout.map((e: { value: number; n: number }) => {
    return { hash: `${txid}:${e.n}`, value: e.value * 1e8 };
  });

  return { outputs: outputs };
}
