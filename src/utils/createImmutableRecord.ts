import { Record, RecordOf } from 'immutable';

const createImmutableRecord = <S extends object>(
  initialState: S,
): RecordOf<S> => {
  const factory: Record.Factory<S> = Record<S>(initialState);
  return factory(initialState);
};

export default createImmutableRecord;
