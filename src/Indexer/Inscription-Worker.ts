import {
  DecodeJSON,
  ValidatePayloads,
} from "../Shared/indexer-helper/function-helper";
import { DOGEDRC, Doginals } from "../Shared/indexer-helper/types";

const InscriptionsWorker = async (data: any[]): Promise<Doginals[]> => {
  const ValidDoginals: Doginals[] = [];

  for (const Inscription of data) {
    const { inscriptionId, time, txid, block, content, Outputs } = Inscription;

    const DecodedInscriptionData: DOGEDRC | undefined = DecodeJSON(content);

    if (!DecodedInscriptionData) continue;

    const IsValidPayload = ValidatePayloads(DecodedInscriptionData);

    if (!IsValidPayload) continue;

    const Address: string = Outputs.sort(
      (a: any, b: any) => a.value - b.value
    )[0]?.address;

    ValidDoginals.push({
      inscriptionData: {
        inscriptionId: inscriptionId,
        sender: Address,
        block: block,
        time: time,
        hash: txid,
      },
      DRCData: DecodedInscriptionData,
    });
  }
  return ValidDoginals;
};
export default InscriptionsWorker;
