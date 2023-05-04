import combineChanges from './combineChanges';

describe('Common render', () => {
  it('renders without crashing', () => {
    expect(combineChanges).toBeTruthy();
  });
});
