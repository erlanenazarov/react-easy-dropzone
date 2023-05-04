import { useContext } from 'react';

import { DropzoneStateContext } from './Provider';

export const useDropzone = () => {
  useContext(DropzoneStateContext);
};
