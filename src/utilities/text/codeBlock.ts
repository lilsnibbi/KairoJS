const zws = String.fromCharCode(8203);

/** Wraps the content inside a codeblock with no language */
export function codeBlock<C extends string>(content: C): `\`\`\`\n${C}\n\`\`\``;

/** Wraps the content inside a codeblock with the specified language */
export function codeBlock<L extends string, C extends string>(language: L, content: C): `\`\`\`${L}\n${C}\n\`\`\``;
export function codeBlock(...args: [string, string?]): string {
	const [language, content] = args.length === 1 ? ['', args[0]] : args;
	return `\`\`\`${language}\n${String(content).replace(/```/, `\`${zws}\`\``).replace(/`$/g, `\`${zws}`)}\n\`\`\``;
}
