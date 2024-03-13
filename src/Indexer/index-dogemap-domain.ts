import Decimal from "decimal.js";
import {
  Dogemap,
  OtherDoginalsBox,
  domains,
} from "../Shared/indexer-helper/types";
import DogemapQuery from "../Shared/db-lib/conn/Dogemap-Query";

export const IndexDogemapAndDomain = async (data: OtherDoginalsBox[]) => {
  const IndexedBlock = new Set<number>();
  const IndexedName = new Set<string>();

  const Dogemaps: Dogemap[] = [];
  const Domains: domains[] = [];

  try {
    for (const doginal of data) {
      const { inscriptionId, block } = doginal.inscriptionData;

      const { p } = doginal.doginal;

      if (p === "dogemap") {
        const dogemapInscribed = doginal.doginal.block;

        if (!new Decimal(dogemapInscribed).lte(block)) continue;

        if (
          !new Decimal(dogemapInscribed).isInt() ||
          new Decimal(dogemapInscribed).isNeg()
        )
          continue;

        if (IndexedBlock.has(dogemapInscribed)) continue; // this block already inscribed

        //Check in db for same block
        IndexedBlock.add(dogemapInscribed);

        const IsDogemapInDatabase = await DogemapQuery.CheckIfDogemapExist(
          dogemapInscribed
        );

        if (IsDogemapInDatabase) continue;

        Dogemaps.push({
          inscription_id: inscriptionId,
          blockNumber: dogemapInscribed,
        });
      } else if (p === "dns") {
        const content = doginal.doginal.name.toLowerCase();

        const NameSpace = content.split(".")[1];

        //Check if content already in cache

        if (IndexedName.has(content)) continue;

        IndexedName.add(content);

        const IsDomaininDatabase = await DogemapQuery.CheckIfDomainExist(
          content
        );

        if (IsDomaininDatabase) continue;

        Domains.push({
          inscription_id: inscriptionId,
          content: content,
          namespace: NameSpace,
        });
      }
    }

    if (Dogemaps.length) await DogemapQuery.IndexDogemap(Dogemaps);

    if (Domains.length) await DogemapQuery.IndexDomain(Domains);
  } catch (error) {
    throw error;
  }
};

export default IndexDogemapAndDomain;
