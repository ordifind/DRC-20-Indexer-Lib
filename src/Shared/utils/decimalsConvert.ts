import Decimal from "decimal.js";

export const NumberToDecimals = (number: number): Decimal => {
  return new Decimal(number);
};

export const AddDecimals = (numberA: Decimal, numberB: Decimal): Decimal => {
  return numberA.add(numberB);
};

export const SubDecimals = (numberA: Decimal, numberB: Decimal): Decimal => {
  return numberA.sub(numberB);
};

export const DecimalToString = (number: Decimal): string => {
  return number.toString();
};

export const StringToDecimals = (number: string): Decimal => {
  return NumberToDecimals(Number(number));
};
