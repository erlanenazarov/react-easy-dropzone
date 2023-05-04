import { PropsWithChildren } from 'react';
import cn from 'clsx';

import { IDropzoneProps } from './types';

import styles from './Dropzone.module.scss';

const Dropzone = (props: PropsWithChildren<IDropzoneProps>): JSX.Element => {
  const { className, children } = props;

  return <div className={cn(styles.root, className)}>{children}</div>;
};

export default Dropzone;
