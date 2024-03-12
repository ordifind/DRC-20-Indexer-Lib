import { Decimal } from "decimal.js";

export const NumberToDecimals = (number: string): Decimal => {
  try {
    return new Decimal(new Decimal(number).toFixed(4));
  } catch (error) {
    console.log(number);
    throw error;
  }
};

export const AddDecimals = (numberA: Decimal, numberB: Decimal): Decimal => {
  const result = numberA.plus(numberB);
  return result;
};

export const SubDecimals = (numberA: Decimal, numberB: Decimal): Decimal => {
  return numberA.minus(numberB);
};

export const DecimalToString = (number: Decimal): string => {
  return number.toFixed(4).toString();
};

export const StringToDecimals = (number: string): Decimal => {
  return NumberToDecimals(number);
};
