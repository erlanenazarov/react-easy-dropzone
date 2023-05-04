import createReducer from 'utils/createReducer';

import { TRecordOfReducerState } from './types';
import initialState from './initialState';

export default createReducer<TRecordOfReducerState>(initialState, {});
