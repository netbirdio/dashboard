export enum StorageKey {
  token
}

const setLocalItem = async <T>(key: StorageKey, value: T): Promise<void> => {
  try {
    localStorage.setItem(`@net-bird:${key}`, JSON.stringify(value));
  } catch (err) {
    console.log(err);
  }
};

const getLocalItem = async <T>(key: StorageKey): Promise<T | null> => {
  try {
    const item = localStorage.getItem(`@net-bird:${key}`);
    if (!item) {
      return null;
    }
    return JSON.parse(item) as T;
  } catch (err) {
    console.log(err);
  }
  return null;
};

export {
  getLocalItem,
  setLocalItem
}
