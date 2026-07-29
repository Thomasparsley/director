import type { TadaDocumentNode, VariablesOf } from "gql.tada";

export type QueryNode<T> = TadaDocumentNode<T, VariablesOf<T>>;
export type MutationNode<T> = TadaDocumentNode<T, VariablesOf<T>>;
export type SubscriptionNode<T> = TadaDocumentNode<T, VariablesOf<T>>;

/**
 * Whether a document declares any variables. Drives the options types: a document with
 * variables makes `variables` required, one without forbids it outright.
 */
export type HasNodeVariables<T> = keyof VariablesOf<T> extends never ? false : true;
