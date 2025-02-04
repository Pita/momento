import * as fs from "fs";
import path from "path";
import { schemas } from "./dbSchemas";
import { z } from "zod";
import yaml from "js-yaml"; // importing YAML library

// Directory where YAML files are stored
function getDBDir(): string {
  return path.join(process.cwd(), "data");
}

// Helper function to build a file path based on type and key
function getFilePath(type: string, key: string): string {
  // The file name is "<type>_<key>.yaml"
  return path.join(getDBDir(), `${type}_${key}.yaml`);
}

/**
 * Retrieve a value from the key-value database.
 * The function reads the corresponding file, parses the YAML,
 * and validates the content against the Zod schema associated with the type.
 *
 * @param key - The key identifying the record.
 * @param type - The type (key) in the schemas dictionary.
 * @returns The validated data if the file exists and is valid, or null if the file does not exist.
 */
export function getValue<K extends keyof typeof schemas>(
  key: string,
  type: K
): z.infer<(typeof schemas)[K]> | null {
  const filePath = getFilePath(String(type), key);
  const schema = schemas[type];

  try {
    const data = fs.readFileSync(filePath, "utf-8");
    const parsed = yaml.load(data);
    // Validate the data; this will throw if the data is invalid.
    const validated = schema.parse(parsed);
    return validated;
  } catch (error: unknown) {
    // If the file does not exist, return null
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    // For any other error, rethrow it.
    throw error;
  }
}

/**
 * Save a value in the key-value database.
 * The function validates the provided data against the Zod schema associated with the type
 * before writing the YAML stringified value to the appropriate file.
 *
 * @param key - The key identifying the record.
 * @param type - The type (key) in the schemas dictionary.
 * @param data - The data to be stored.
 */
export function setValue<K extends keyof typeof schemas>(
  key: string,
  type: K,
  data: unknown
): void {
  const schema = schemas[type];

  // Validate data; this will throw if the data doesn't match the schema.
  const validated = schema.parse(data);

  const filePath = getFilePath(String(type), key);

  // Ensure that the data directory exists.
  fs.mkdirSync(getDBDir(), { recursive: true });
  // Convert the validated data to a YAML string.
  const yamlStr = yaml.dump(validated);
  // Write the validated data as a YAML string.
  fs.writeFileSync(filePath, yamlStr, "utf-8");
}

/**
 * List all keys (IDs) for a given type.
 *
 * @param type - The type (key) in the schemas dictionary.
 * @returns An array of IDs (strings) that exist for the given type.
 */
export function listKeys<K extends keyof typeof schemas>(type: K): string[] {
  let files: string[];
  try {
    files = fs.readdirSync(getDBDir());
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const prefix = `${type}_`;
  const suffix = ".yaml";
  return files
    .filter((file) => file.startsWith(prefix) && file.endsWith(suffix))
    .map((file) => file.slice(prefix.length, file.length - suffix.length));
}
