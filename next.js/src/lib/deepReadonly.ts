export type DeepReadonlyArray<T> = readonly DeepReadonly<T>[];

export type DeepReadonlyObject<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

export type DeepReadonly<T> = T extends (infer R)[]
  ? DeepReadonlyArray<R>
  : // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  T extends Function
  ? T
  : T extends object
  ? DeepReadonlyObject<T>
  : T;
