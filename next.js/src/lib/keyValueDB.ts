"use server";

import * as fs from "fs";
import path from "path";
import { schemas } from "./dbSchemas";
import { z } from "zod";

// Directory where JSON files are stored
const dbDir = path.join(process.cwd(), "data");

// Helper function to build a file path based on type and key
function getFilePath(type: string, key: string): string {
  // The file name is "<type>_<key>.json"
  return path.join(dbDir, `${type}_${key}.json`);
}

/**
 * Retrieve a value from the key-value database.
 * The function reads the corresponding file, parses the JSON,
 * and validates the content against the Zod schema associated with the type.
 *
 * @param key - The key identifying the record.
 * @param type - The type (key) in the schemas dictionary.
 * @returns The validated data if the file exists and is valid, or null if the file does not exist.
 */
export async function getValue<K extends keyof typeof schemas>(
  key: string,
  type: K
): Promise<z.infer<(typeof schemas)[K]> | null> {
  const filePath = getFilePath(String(type), key);
  const schema = schemas[type];

  try {
    const data = await fs.promises.readFile(filePath, "utf-8");
    const parsed = JSON.parse(data);
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
 * before writing the JSON stringified value to the appropriate file.
 *
 * @param key - The key identifying the record.
 * @param type - The type (key) in the schemas dictionary.
 * @param data - The data to be stored.
 */
export async function setValue<K extends keyof typeof schemas>(
  key: string,
  type: K,
  data: unknown
): Promise<void> {
  const schema = schemas[type];

  // Validate data; this will throw if the data doesn't match the schema.
  const validated = schema.parse(data);

  const filePath = getFilePath(String(type), key);

  // Ensure that the data directory exists.
  await fs.promises.mkdir(dbDir, { recursive: true });
  // Write the validated data as a JSON string.
  await fs.promises.writeFile(filePath, JSON.stringify(validated), "utf-8");
}

/**
 * List all keys (IDs) for a given type.
 *
 * @param type - The type (key) in the schemas dictionary.
 * @returns An array of IDs (strings) that exist for the given type.
 */
export async function listKeys<K extends keyof typeof schemas>(
  type: K
): Promise<string[]> {
  let files: string[];
  try {
    files = await fs.promises.readdir(dbDir);
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const prefix = `${type}_`;
  const suffix = ".json";
  return files
    .filter((file) => file.startsWith(prefix) && file.endsWith(suffix))
    .map((file) => file.slice(prefix.length, file.length - suffix.length));
}
