/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Interface, type ContractRunner } from "ethers";
import type {
  DefaultOperatorFilterer,
  DefaultOperatorFiltererInterface,
} from "../../../operator-filter-registry/src/DefaultOperatorFilterer";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "operator",
        type: "address",
      },
    ],
    name: "OperatorNotAllowed",
    type: "error",
  },
  {
    inputs: [],
    name: "OPERATOR_FILTER_REGISTRY",
    outputs: [
      {
        internalType: "contract IOperatorFilterRegistry",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export class DefaultOperatorFilterer__factory {
  static readonly abi = _abi;
  static createInterface(): DefaultOperatorFiltererInterface {
    return new Interface(_abi) as DefaultOperatorFiltererInterface;
  }
  static connect(
    address: string,
    runner?: ContractRunner | null
  ): DefaultOperatorFilterer {
    return new Contract(
      address,
      _abi,
      runner
    ) as unknown as DefaultOperatorFilterer;
  }
}