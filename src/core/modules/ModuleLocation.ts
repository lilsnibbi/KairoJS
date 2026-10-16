import { basename, relative, sep } from "node:path";
import { VirtualPath } from "../loading/constants";

/** The metadata class used for {@link Module}s. */
export class ModuleLocation {
	/** The full path to the file. */
	public readonly full: string;

	/** The root directory the file was found from. */
	public readonly root: string;

	public constructor(full: string, root: string) {
		this.full = full;
		this.root = root;
	}

	/** Whether the file is virtual or not. */
	public get virtual() {
		return this.full === VirtualPath;
	}

	/** The relative path between {@link ModuleLocation.root} and {@link ModuleLocation.full}. */
	public get relative(): string {
		return this.virtual ? VirtualPath : relative(this.root, this.full);
	}

	/** The names of the directories that separate {@link ModuleLocation.root} and {@link ModuleLocation.full}. */
	public get directories(): string[] {
		return this.virtual ? [] : this.relative.split(sep).slice(0, -1);
	}

	/** The name and extension of the file that was loaded, extracted from {@link ModuleLocation.full}. */
	public get name(): string {
		return this.virtual ? VirtualPath : basename(this.full);
	}

	/** Defines the `JSON.stringify` behavior of this structure. */
	public toJSON(): ModuleLocationJSON {
		return {
			directories: this.directories,
			full: this.full,
			name: this.name,
			relative: this.relative,
			root: this.root,
		};
	}
}

/** The return type of {@link ModuleLocation.toJSON}. */
export interface ModuleLocationJSON {
	directories: string[];
	full: string;
	name: string;
	relative: string;
	root: string;
}
