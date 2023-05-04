import createAction from 'utils/createAction';

const STATE_KEY = '@dropzone';

export const INIT_DROPZONE = `${STATE_KEY}/INIT_DROPZONE`;

export const initDropzone = createAction(INIT_DROPZONE);
