export const uid = (): string => {
  const cryptoObj =
    typeof globalThis !== 'undefined'
      ? (globalThis.crypto as Crypto | undefined)
      : undefined;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return `rzd-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(
    36,
  )}`;
};
