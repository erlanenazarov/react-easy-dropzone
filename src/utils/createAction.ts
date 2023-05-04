export type TActionReturnType<T> = {
  type: string;
  payload?: T;
};
export type TActionFn<T = undefined> = (payload?: T) => TActionReturnType<T>;

const createAction = <T = undefined>(actionType: string): TActionFn<T> => {
  return (payload) => ({
    type: actionType,
    payload,
  });
};

export default createAction;
