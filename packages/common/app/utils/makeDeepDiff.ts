type DeepObject = {
  [key: string]: unknown
};

type DeepDiffResult<T> = T extends object ? {
  [P in keyof T]?: DeepDiffResult<T[P]>
} | null : T;

export function makeDeepDiff<A extends DeepObject, B extends DeepObject>(
  objA: A,
  objB: B,
): DeepDiffResult<B> {
// Handle null/undefined cases
  if (!objA) {
    return objB as DeepDiffResult<B>;
  }
  if (!objB) {
    return null as DeepDiffResult<B>;
  }

  const differences = {} as NonNullable<DeepDiffResult<B>>;

  // Iterate through all keys in object B
  for (const key in objB) {
    // Skip inherited properties
    if (!Object.prototype.hasOwnProperty.call(objB, key)) {
      continue;
    }

    // Case 1: Key doesn't exist in A
    if (!(key in objA)) {
      differences[key] = objB[key];
      continue;
    }

    const valueA = objA[key];
    const valueB = objB[key];

    // Case 2: Values are different types
    if (typeof valueB !== typeof valueA) {
      differences[key] = valueB;
      continue;
    }

    // Case 3: Both values are objects (recursive case)
    if (typeof valueB === "object" && valueB !== null) {
      // Handle arrays
      if (Array.isArray(valueB)) {
        if (!Array.isArray(valueA)
          || valueA.length !== valueB.length
          || valueB.some((item, index) => !deepEqual(valueA[index], item))) {
          differences[key] = valueB;
        }
        continue;
      }

      // Recursive call for nested objects
      const nestedDiff = makeDeepDiff(
        valueA as DeepObject,
        valueB as DeepObject,
      );
      if (nestedDiff && Object.keys(nestedDiff).length > 0) {
        differences[key] = nestedDiff;
      }
      continue;
    }

    // Case 4: Primitive values are different
    if ((valueA as unknown) !== (valueB as unknown)) {
      differences[key] = valueB;
    }
  }

  return differences;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object" || a === null || b === null) return false;

  const objA = a as DeepObject;
  const objB = b as DeepObject;

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  return keysA.every(key =>
    keysB.includes(key) && deepEqual(objA[key], objB[key]),
  );
}
