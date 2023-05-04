import { RecordOf, List } from 'immutable';

export interface IProviderProps {
  initialValue?: string[];
}

export interface IPayloadAction<P = void, T extends string = string> {
  payload: P;
  type: T;
}

export type THandler<T, S = void> = (state: T, action: IPayloadAction<S>) => T;
export type THandlers<T, S = void> = Record<string, THandler<T, S> | THandler<T, S>[]>;

export interface IDropzoneFile {
  id: string;
  file: File | string;
  name: string;
}

export interface IDropzoneState {
  key: string;
  files: List<IDropzoneFile>;
  isGalleryOpen: boolean;
}
export type TReducerState = Record<string, RecordOf<IDropzoneState>>;
export type TRecordOfReducerState = RecordOf<TReducerState>;
