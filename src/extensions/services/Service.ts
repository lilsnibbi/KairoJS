import { Module } from "../../core/modules/index";

export abstract class Service<
	Options extends Service.Options = Service.Options,
> extends Module<Options, "services"> {}

export namespace Service {
	export type Context = Module.Context<"services">;
	export type Options = Module.Options;
	export type JSON = Module.JSON;
	export type LocationJSON = Module.LocationJSON;
}
