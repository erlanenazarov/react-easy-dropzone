import { IPayloadAction, THandler } from 'context/types';

export const combineChanges = <T, S = void>(changes: THandler<T, S>[], curState: T, action: IPayloadAction<S>): T =>
  changes.reduce((state: T, reducer: THandler<T, S>): T => reducer(state, action), curState);

export default combineChanges;
