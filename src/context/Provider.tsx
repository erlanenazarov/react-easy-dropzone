import { PropsWithChildren, useReducer, createContext, Dispatch } from 'react';

import { IProviderProps, TRecordOfReducerState, IPayloadAction } from './types';
import initialState from './initialState';
import reducer from './reducer';

export const DropzoneStateContext = createContext<TRecordOfReducerState | null>(null);
export const DropzoneDispatchContext = createContext<Dispatch<IPayloadAction<never>> | null>(null);

const DropzoneProvider = (props: PropsWithChildren<IProviderProps>): JSX.Element => {
  const { children } = props;
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <DropzoneStateContext.Provider value={state}>
      <DropzoneDispatchContext.Provider value={dispatch}>{children}</DropzoneDispatchContext.Provider>
    </DropzoneStateContext.Provider>
  );
};

export default DropzoneProvider;
