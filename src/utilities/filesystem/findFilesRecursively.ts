import type { PathLike } from "node:fs";
import { opendir } from "node:fs/promises";
import { join } from "node:path";

export async function* findFilesRecursively(
	path: PathLike,
	predicate: (filePath: string) => boolean = () => true,
): AsyncIterableIterator<string> {
	const dir = await opendir(path);

	for await (const item of dir) {
		if (item.isFile() && predicate(item.name)) {
			yield join(dir.path, item.name);
		} else if (item.isDirectory()) {
			yield* findFilesRecursively(join(dir.path, item.name), predicate);
		}
	}
}

/** Note that we do **not** support a full globby pattern using asterisk for wildcards. It has to be an exact match with {@link String.startsWith} */
export function findFilesRecursivelyStringStartsWith(
	path: PathLike,
	fileStartsWith: string,
) {
	return findFilesRecursively(path, (filePath) =>
		filePath.startsWith(fileStartsWith),
	);
}

/** A literal filename suffix. Wildcard patterns are not supported. */
export function findFilesRecursivelyStringEndsWith(
	path: PathLike,
	fileEndsWith: string,
) {
	return findFilesRecursively(path, (filePath) =>
		filePath.endsWith(fileEndsWith),
	);
}

/** Note that we do **not** support a full globby pattern using asterisk for wildcards. It has to be an exact match with {@link String.includes} */
export function findFilesRecursivelyStringIncludes(
	path: PathLike,
	include: string,
) {
	return findFilesRecursively(path, (filePath) => filePath.includes(include));
}

export function findFilesRecursivelyRegex(path: PathLike, regex: RegExp) {
	return findFilesRecursively(path, (filePath) => regex.test(filePath));
}
