import {
	SubcommandCooldownCheck as SubcommandCooldown,
	type SubcommandCooldownPreconditionContext
} from './preconditions/SubcommandCooldown';

export { loadListeners } from './listeners/register';
export * as SubcommandPreconditionResolvers from './preconditionResolvers/subcommandCooldown';
export { loadPreconditions } from './preconditions/register';
export {
	SubcommandCooldownCheck as SubcommandCooldownPrecondition,
	type SubcommandCooldownPreconditionContext
} from './preconditions/SubcommandCooldown';
export * from './Subcommand';
export * from './types/Enums';
export * from './types/Events';
export * from './types/mappings';

/** The preconditions specific to subcommands
 * @deprecated - This will be replaced with a regular top level export of {@link SubcommandCooldown} */
export const SubcommandPreconditions = {
	SubcommandCooldown
};

/** The preconditions specific to subcommands
 * @deprecated - This will be replaced with a regular top level export of {@link SubcommandCooldownPreconditionContext} */
export namespace SubcommandPreconditions {
	/** The context for the subcommand cooldown precondition */
	export type SubcommandCooldownContext = SubcommandCooldownPreconditionContext;
}
