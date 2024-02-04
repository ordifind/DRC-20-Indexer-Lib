export const DecimalsToNumber = (number: number): bigint => {
  return ConvertToBigInt(number * 1e18);
};

export const ConvertToBigInt = (number: number): bigint => {
  return BigInt(number);
};

export const Add = (numA: bigint, numB: bigint): bigint => {
  return numA + numB;
};

export const Sub = (numA: bigint, numB: bigint): bigint => {
  return numA - numB;
};
export const BigIntToString = (num: bigint): string => {
  return String(num);
};

export const StringToBigint = (num: string): bigint => {
  return BigInt(num);
};
